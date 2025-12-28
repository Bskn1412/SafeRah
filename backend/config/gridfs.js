// config/gridfs.js
import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";

let bucket = null;

export async function initGridFS() {
  if (bucket) return bucket;

  // Wait until mongoose connection is actually ready
  if (mongoose.connection.readyState !== 1) {
    await new Promise(resolve => mongoose.connection.once("connected", resolve));
  }

  const db = mongoose.connection.db;

  bucket = new GridFSBucket(db, {
    bucketName: "encryptedFiles" // creates encryptedFiles.files + encryptedFiles.chunks
  });

  console.log("GridFS ready");
  return bucket;
}

export function getBucket() {
  if (!bucket) {
    throw new Error("GridFS not initialized yet – did you await initGridFS()?");
  }
  return bucket;
}