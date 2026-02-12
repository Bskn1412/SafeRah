// backend/routes/sanity_files.js

import express from "express";
import multer from "multer";
import fs from "fs-extra";
import path from "path";
import sanity from "../sanity.js";
import { fileURLToPath } from "url";
import { authMiddleware } from "../middleware/authMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
router.use(authMiddleware); 
router.use((req, res, next) => {
  console.log("🔐 Sanity route user:", req.user);
  next();
});


const upload = multer({ storage: multer.memoryStorage() });

const TEMP_DIR = path.join(__dirname, "../temp_chunks");
fs.ensureDirSync(TEMP_DIR);

/* ───────────────────────── Upload Encrypted Chunk ───────────────────────── */

router.post("/upload-chunk", upload.single("chunkData"), async (req, res) => {
  try {
    const {
      uploadId,
      fileName,
      plainSize,
      chunkIndex,
      totalChunks,
      chunkNonce,
      keyNonce,
      fileKeyCipher,
    } = req.body;

    const accountId = req.user.id;
    if (!accountId) {
      return res.status(401).json({ error: "Unauthenticated upload" });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({ error: "Missing chunk data" });
    }

    const fileDir = path.join(TEMP_DIR, uploadId);
    await fs.ensureDir(fileDir);

    // Write encrypted chunk to temp storage
    await fs.writeFile(path.join(fileDir, `chunk_${chunkIndex}`), req.file.buffer);

    const metaPath = path.join(fileDir, "meta.json");
    let meta = {};

    if (await fs.pathExists(metaPath)) {
      meta = await fs.readJson(metaPath);
    }

    // Initialize meta once
    meta.uploadId = uploadId;
    meta.accountId = accountId;
    meta.fileName = fileName;
    meta.totalChunks = Number(totalChunks);
    meta.keyNonce = keyNonce;
    meta.fileKeyCipher = fileKeyCipher;

    if (plainSize) meta.plainSize = Number(plainSize);

    // Hardening from hackers to change keyNonce/fileKeyCipher
    if (!meta.keyNonce) meta.keyNonce = keyNonce;
    if (!meta.fileKeyCipher) meta.fileKeyCipher = fileKeyCipher;

    // Collect chunk nonces
    meta.chunkNonces = {
      ...(meta.chunkNonces || {}),
      [Number(chunkIndex)]: chunkNonce,
    };

    await fs.writeJson(metaPath, meta);

    res.json({ ok: true, chunkIndex: Number(chunkIndex) });
  } catch (err) {
    console.error("❌ Chunk upload failed:", err);
    res.status(500).json({ error: "Chunk upload failed" });
  }
});

/* ───────────────────────── Finalize Upload ───────────────────────── */

router.post("/complete-upload", async (req, res) => {
  try {
    const { uploadId } = req.body;
    const accountId = req.user.id;

    const fileDir = path.join(TEMP_DIR, uploadId);
    const metaPath = path.join(fileDir, "meta.json");

    if (!(await fs.pathExists(metaPath))) {
      return res.status(400).json({ error: "Upload not found" });
    }

    const meta = await fs.readJson(metaPath);

    if (meta.accountId !== accountId) {
      return res.status(403).json({ error: "Not allowed to finalize this upload" });
    }

    const encryptedChunks = [];

    // Upload each encrypted chunk as its own Sanity asset
    for (let i = 0; i < meta.totalChunks; i++) {
      const chunkPath = path.join(fileDir, `chunk_${i}`);

      if (!(await fs.pathExists(chunkPath))) {
        return res.status(400).json({ error: `Missing chunk ${i}` });
      }

      const buf = await fs.readFile(chunkPath);

      const asset = await sanity.assets.upload("file", buf, {
        filename: `${uploadId}_chunk_${i}.bin`,
        contentType: "application/octet-stream",
      });

      encryptedChunks.push({
        index: i,
        assetRef: asset._id,
      });
    }

    const docId = `encryptedFile-${uploadId}`;

    const doc = await sanity.createIfNotExists({
      _id: docId,
      _type: "encryptedFile",
      accountId: meta.accountId,
      name: meta.fileName,
      size: meta.plainSize || null, // or original plaintext size if you pass it
      mimeType: "application/octet-stream",
      chunks: encryptedChunks.map((c) => ({
        index: c.index,
        asset: {
          _type: "file",
          asset: {
            _type: "reference",
            _ref: c.assetRef,
          },
        },
      })),
      crypto: {
        keyNonce: meta.keyNonce,
        fileKeyCipher: meta.fileKeyCipher,
        chunkNonces: Object.entries(meta.chunkNonces).map(([index, nonce]) => ({
          index: Number(index),
          nonce,
        })),
      },
      uploadedAt: new Date().toISOString(),
    });

    await fs.remove(fileDir);

    res.json({
      ok: true,
      file: {
        id: doc._id,
        name: doc.name,
        size: doc.size,
        uploadedAt: doc.uploadedAt,
      },
    });
  } catch (err) {
    console.error("❌ Finalize upload failed:", err);
    res.status(500).json({ error: "Failed to finalize upload" });
  }
});

/* ───────────────────────── Upload Encrypted Preview (optional) ───────────────────────── */

router.post(
  "/upload-preview",
  upload.single("previewData"),
  async (req, res) => {
    try {
      const { uploadId, accountId, version, encryptedPreviewKey } = req.body;

      console.log("🖼️ Encrypted preview received", {
        uploadId,
        version,
        size: req.file.buffer.length,
      });

      const asset = await sanity.assets.upload(
        "file",
        req.file.buffer,
        {
          filename: `${uploadId}_preview_v${version}.bin`,
          contentType: "application/octet-stream",
        }
      );

      const previewDoc = await sanity.create({
        _type: "encryptedFilePreview",
        accountId,
        fileId: `encryptedFile-${uploadId}`,
        version,
        encryptedPreviewKey,
        asset: {
          _type: "file",
          asset: {
            _type: "reference",
            _ref: asset._id,
          },
        },
        uploadedAt: new Date().toISOString(),
      });

      console.log("✅ Preview stored", previewDoc._id);

      res.json({ ok: true });
    } catch (err) {
      console.error("❌ Preview upload failed:", err);
      res.status(500).json({ error: "Preview upload failed" });
    }
  }
);

/* ───────────────────────── List Files (per user) ───────────────────────── */

router.get("/list", async (req, res) => {
  try {
    const accountId = req.user.id;

    console.log("📄 Listing files for account:", accountId);

    const files = await sanity.fetch(
      `
      *[_type == "encryptedFile" && accountId == $accountId]
      | order(uploadedAt desc) {
        _id,
        name,
        size,
        uploadedAt
      }
      `,
      { accountId }
    );

    console.log("📄 Files found:", files.length);

    res.json(
      files.map(f => ({
        id: f._id,
        name: f.name,
        size: f.size,
        uploadedAt: f.uploadedAt,
      }))
    );
  } catch (err) {
    console.error("❌ List failed:", err);
    res.status(500).json({ error: "Failed to list files" });
  }
});


/* ───────────────────────── Download Encrypted File ───────────────────────── */

router.get("/download", async (req, res) => {
  const { id } = req.query;

  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");

  const file = await sanity.fetch(
    `*[_type=="encryptedFile" && _id==$id][0]{
      chunks[]{
        index,
        asset{ asset->{url} }
      },
      crypto{
        keyNonce,
        fileKeyCipher,
        chunkNonces[]{ index, nonce }
      },
      mimeType
    }`,
    { id }
  );

  if (!file) return res.sendStatus(404);

  const encryptedChunks = [];

  for (const chunk of file.chunks.sort((a, b) => a.index - b.index)) {
    const resAsset = await fetch(chunk.asset.asset.url);
    const buf = await resAsset.arrayBuffer();

    const nonceObj = file.crypto.chunkNonces.find(n => n.index === chunk.index);

    if (!nonceObj) {
      return res.status(500).json({ error: `Missing nonce for chunk ${chunk.index}` });
    }


    encryptedChunks.push({
      index: chunk.index,
      data: Buffer.from(buf).toString("base64"),
      nonce: nonceObj?.nonce,
    });
  }

  console.log("📥 File downloaded", { id, chunks: encryptedChunks.length });

  res.json({
    encryptedChunks,
    metadata: {
      keyNonce: file.crypto.keyNonce,
      fileKeyCipher: file.crypto.fileKeyCipher,
      mimeType: file.mimeType,
      plainSize: file.plainSize || null,
    },
  });
});

/* ───────────────────────── Delete File ───────────────────────── */

router.delete("/delete", async (req, res) => {
  try {
    const { id } = req.query;

    const doc = await sanity.getDocument(id);
    if (!doc) return res.sendStatus(404);

    // Collect asset refs first (before deleting the doc)
    const assetRefs = [];

    if (doc.chunks) {
      for (const chunk of doc.chunks) {
        const ref = chunk.asset?.asset?._ref;
        if (ref) assetRefs.push(ref);
      }
    }

    // 1️⃣ Delete the encryptedFile document first (removes references)
    await sanity.delete(id);

    // 2️⃣ Now delete the assets (no references left)
    for (const ref of assetRefs) {
      try {
        await sanity.delete(ref);
      } catch (err) {
        console.warn("⚠️ Failed to delete asset", ref, err.message);
        // Don’t fail the whole request if one asset delete fails
      }
    }

    console.log("🗑️ File deleted", { id, assets: assetRefs.length });

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Delete failed:", err);
    res.status(500).json({ error: "Failed to delete file" });
  }
});



export default router;
