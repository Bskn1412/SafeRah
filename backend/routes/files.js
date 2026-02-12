import express from "express";
import multer from "multer";
import { ObjectId } from "mongodb";
import { getBucket } from "../config/gridfs.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(authMiddleware);

/* ───────────────────────── Upload Config ───────────────────────── */

const upload = multer({
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB (REAL limit now)
  },
});

/* ───────────────────────── UPLOAD (STREAMING) ───────────────────────── */

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    if (!req.body.metadata) {
      return res.status(400).json({ error: "Missing metadata" });
    }

      let meta;
      try {
        meta = JSON.parse(req.body.metadata);
      } catch {
        return res.status(400).json({ error: "Invalid metadata format" });
      }

    const { fileNonce, keyNonce, fileKeyCipher } = meta;

    if (!fileNonce || !keyNonce || !fileKeyCipher) {
      return res.status(400).json({ error: "Invalid encryption metadata" });
    }

    const bucket = getBucket();
    const fileId = new ObjectId();

    const uploadStream = bucket.openUploadStreamWithId(
      fileId,
      meta.originalName || req.file.originalname,
      {
        metadata: {
          userId: req.user.id,
          originalName: meta.originalName,
          mimeType: meta.mimeType,
          size: meta.size,
          fileNonce,
          keyNonce,
          fileKeyCipher,
          uploadedAt: new Date(),
          version: 2,
        },
      }
    );

    uploadStream.end(req.file.buffer);

    uploadStream.once("finish", () => {
      res.json({ success: true, id: fileId.toString() });
    });

    uploadStream.once("error", (err) => {
      console.error("GridFS upload error:", err);
      res.status(500).json({ error: "Upload failed" });
    });
  } catch (err) {
    console.error("Upload failed:", err);
    res.status(400).json({ error: err.message });
  }
});

/* ───────────────────────── Multer Error Handler ───────────────────────── */

router.use((err, req, res, next) => {
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      error: "File too large. Max size is 100 MB",
    });
  }
  next(err);
});



// LIST
router.get("/list", async (req, res) => {
  try {
    const bucket = getBucket();

    const files = await bucket
      .find({ "metadata.userId": req.user.id })
      .project({
        _id: 1,
        length: 1,
        uploadDate: 1,
        "metadata.originalName": 1,
        "metadata.mimeType": 1,
        "metadata.size": 1,
      })
      .sort({ uploadDate: -1 })
      .toArray();

    res.json(
      files.map((f) => ({
        id: f._id.toString(),
        name: f.metadata.originalName || "unnamed",
        size: f.metadata.size || f.length,
        uploadedAt: f.uploadDate,
        mimeType: f.metadata.mimeType,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: "List failed" });
  }
});

/* ================================
   DOWNLOAD ENCRYPTED FILE
   Query: ?id=...
================================ */
router.get("/download", async (req, res) => {
  try {
    const { id } = req.query;

    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid file ID" });
    }

    const fileId = new ObjectId(id);
    const bucket = getBucket();

    const fileDoc = await bucket.find({
      _id: fileId,
      "metadata.userId": req.user.id,
    }).next();

    if (!fileDoc) {
      return res.status(404).json({ error: "File not found" });
    }

    const downloadStream = bucket.openDownloadStream(fileId);
    const chunks = [];

    await new Promise((resolve, reject) => {
      downloadStream.on("data", (c) => chunks.push(c));
      downloadStream.on("end", resolve);
      downloadStream.on("error", reject);
    });

    const buffer = Buffer.concat(chunks);

    res.json({
      encryptedData: buffer.toString("base64"),
      metadata: {
        originalName: fileDoc.metadata.originalName,
        mimeType: fileDoc.metadata.mimeType,
        size: fileDoc.metadata.size,
        fileNonce: fileDoc.metadata.fileNonce,
        keyNonce: fileDoc.metadata.keyNonce,
        fileKeyCipher: fileDoc.metadata.fileKeyCipher,
        version: fileDoc.metadata.version,
      },
    });
  } catch (err) {
    console.error("Download failed:", err);
    res.status(500).json({ error: "Download failed" });
  }
});


export default router;