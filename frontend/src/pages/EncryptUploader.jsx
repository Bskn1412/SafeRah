import { useState } from "react";
import { encryptFileChunks } from "../crypto/chunks"; // you already built this
import { v4 as uuidv4 } from "uuid";

const CHUNK_PARALLELISM = 3;

export default function EncryptedUploader() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);

  async function uploadChunk(uploadId, chunk) {
    const form = new FormData();
    form.append("chunk", new Blob([chunk.data]));
    form.append("uploadId", uploadId);
    form.append("index", chunk.index);
    form.append("nonce", chunk.nonce);

    await fetch("/api/upload-chunk", {
      method: "POST",
      body: form,
    });
  }

  async function handleFile(file) {
    setUploading(true);
    setStatus("Encrypting…");

    const uploadId = uuidv4();

    const {
      encryptedChunks,
      crypto,
    } = await encryptFileChunks(file);

    // Ask backend which chunks already exist
    const uploadedIndexes = await fetch(
      `/api/upload-status/${uploadId}`
    ).then(r => r.json());

    let completed = uploadedIndexes.length;
    const total = encryptedChunks.length;

    setProgress((completed / total) * 100);
    setStatus("Uploading…");

    // Upload queue with limited parallelism
    const queue = encryptedChunks.filter(
      c => !uploadedIndexes.includes(c.index)
    );

    async function worker() {
      while (queue.length) {
        const chunk = queue.shift();
        await uploadChunk(uploadId, chunk);

        completed++;
        setProgress(Math.round((completed / total) * 100));
      }
    }

    await Promise.all(
      Array.from({ length: CHUNK_PARALLELISM }, worker)
    );

    // Finalize upload
    setStatus("Finalizing…");

    await fetch("/api/upload-finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadId,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        crypto,
      }),
    });

    setStatus("Done ✅");
    setUploading(false);
  }

  return (
    <div style={{ maxWidth: 400 }}>
      <input
        type="file"
        disabled={uploading}
        onChange={(e) => handleFile(e.target.files[0])}
      />

      {uploading && (
        <>
          <div style={{ marginTop: 12 }}>
            <progress value={progress} max="100" />
          </div>
          <div>{status} ({progress}%)</div>
        </>
      )}
    </div>
  );
}
