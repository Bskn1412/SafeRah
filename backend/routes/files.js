// backend/routes/files.js
import express from "express";
import { ObjectId } from "mongodb";
import { getBucket } from "../config/gridfs.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(authMiddleware); // ← ALL routes protected

// UPLOAD
router.post("/upload", async (req, res) => {
  try {
    const { encryptedData, metadata } = req.body;

    const meta = typeof metadata && typeof metadata === "object" ? metadata : JSON.parse(metadata);

    const bucket = getBucket();
    const buffer = Buffer.from(encryptedData, "base64");

    const fileId = new ObjectId();

    await new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStreamWithId(fileId, meta.originalName || "file", {
        metadata: {
          userId: req.user.id,
          originalName: meta.originalName,
          mimeType: meta.mimeType,
          size: meta.size,
          nonce: meta.nonce,
          fileKeyCipher: meta.fileKeyCipher,
          uploadedAt: new Date(),
        },
      });

      uploadStream.once("finish", () => resolve());
      uploadStream.once("error", reject);
      uploadStream.end(buffer);
    });

    res.json({ success: true, id: fileId.toString() });
  } catch (err) {
    console.error("Upload failed:", err.message);
    res.status(500).json({ error: "Upload failed" });
  }
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

// DOWNLOAD
router.get("/download", async (req, res) => {
  try {
    const { id } = req.query;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid ID" });

    const bucket = getBucket();
    const fileId = new ObjectId(id);

    const fileDoc = await bucket.find({ _id: fileId, "metadata.userId": req.user.id }).next();
    if (!fileDoc) return res.status(404).json({ error: "File not found" });

    const downloadStream = bucket.openDownloadStream(fileId);

    const chunks = [];
    for await (const chunk of downloadStream) chunks.push(chunk);

    const encryptedData = Buffer.concat(chunks).toString("base64");

    res.json({
      encryptedData,
      metadata: {
        nonce: fileDoc.metadata.nonce,
        fileKeyCipher: fileDoc.metadata.fileKeyCipher,
        mimeType: fileDoc.metadata.mimeType || "application/octet-stream",
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Download failed" });
  }
});

export default router;