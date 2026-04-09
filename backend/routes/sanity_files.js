// backend/routes/sanity_files.js

import express from "express";
import multer from "multer";
import sanity from "../sanity.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireComplete } from "../middleware/requireComplete.js";

const router = express.Router();
router.use(authMiddleware, requireComplete);

const upload = multer({ storage: multer.memoryStorage() });

/* ───────────────────────── Upload Encrypted Chunk Directly ───────────────────────── */

router.post("/upload-chunk", upload.single("chunkData"), async (req, res) => {
  try {
    const {
      uploadId,
      fileName,
      chunkIndex,
      totalChunks,
      chunkNonce,
      keyNonce,
      fileKeyCipher,
    } = req.body;

    const accountId = req.user.id;
    if (!accountId) return res.status(401).json({ error: "Unauthenticated upload" });

    if (!req.file?.buffer) return res.status(400).json({ error: "Missing chunk data" });

    // Upload chunk directly to Sanity
    const asset = await sanity.assets.upload("file", req.file.buffer, {
      filename: `${uploadId}_chunk_${chunkIndex}.bin`,
      contentType: "application/octet-stream",
    });

    // Return asset info to frontend
    res.json({
      ok: true,
      chunkIndex: Number(chunkIndex),
      assetId: asset._id,
      keyNonce,
      fileKeyCipher,
      chunkNonce,
    });

  } catch (err) {
    console.error("❌ Chunk upload failed:", err);
    res.status(500).json({ error: "Chunk upload failed" });
  }
});

/* ───────────────────────── Finalize Upload ───────────────────────── */

router.post("/complete-upload", async (req, res) => {
  try {
    const { uploadId, fileName, totalChunks, chunkAssets, plainSize } = req.body;
    const accountId = req.user.id;

    if (!uploadId || !fileName || !totalChunks || !Array.isArray(chunkAssets)) {
      return res.status(400).json({ error: "Invalid finalize request" });
    }

    if (chunkAssets.length !== totalChunks) {
      return res.status(400).json({ error: "Not all chunks uploaded" });
    }

    // Build encryptedChunks array
    const encryptedChunks = chunkAssets.map((c, idx) => ({
      index: idx,
      assetRef: c.assetId,
      keyNonce: c.keyNonce,
      fileKeyCipher: c.fileKeyCipher,
      chunkNonce: c.chunkNonce,
    }));

    // Create Sanity document
    const docId = `encryptedFile-${uploadId}`;
    const doc = await sanity.createIfNotExists({
      _id: docId,
      _type: "encryptedFile",
      accountId,
      name: fileName,
      size: Number(plainSize),
      mimeType: "application/octet-stream",
      chunks: encryptedChunks.map(c => ({
        index: c.index,
        asset: {
          _type: "file",
          asset: { _type: "reference", _ref: c.assetRef },
        },
      })),
      crypto: {
        keyNonce: encryptedChunks[0]?.keyNonce || null,
        fileKeyCipher: encryptedChunks[0]?.fileKeyCipher || null,
        chunkNonces: encryptedChunks.map(c => ({
          index: c.index,
          nonce: c.chunkNonce,
        })),
      },
      uploadedAt: new Date().toISOString(),
    });

    res.json({
      ok: true,
      file: {
        id: doc._id,
        name: doc.name,
        uploadedAt: doc.uploadedAt,
        totalChunks,
        plainSize: doc.size,
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
      const { uploadId, version, encryptedPreviewKey } = req.body;
      const accountId = req.user.id;

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

/* ───────────────────────── Rename File ───────────────────────── */

router.patch("/rename", async (req, res) => {
  try {
    const { id, newName } = req.body;
    const accountId = req.user.id;

    if (!id || !newName) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const doc = await sanity.getDocument(id);

    if (!doc || doc.accountId !== accountId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const updated = await sanity
      .patch(id)
      .set({ name: newName })
      .commit();

    res.json({
      ok: true,
      file: {
        id: updated._id,
        name: updated.name,
      },
    });
  } catch (err) {
    console.error("Rename failed:", err);
    res.status(500).json({ error: "Rename failed" });
  }
});

/* ───────────────────────── File Info ───────────────────────── */

router.get("/info", async (req, res) => {
  try {
    const { id } = req.query;
    const accountId = req.user.id;

    const file = await sanity.fetch(
      `*[_type=="encryptedFile" && _id==$id && accountId==$accountId][0]{
        _id,
        name,
        size,
        uploadedAt,
        mimeType,
        "totalChunks": count(chunks)
      }`,
      { id, accountId }
    );

    if (!file) return res.sendStatus(404);

    res.json(file);
  } catch (err) {
    console.error("Info fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch info" });
  }
});

export default router;
