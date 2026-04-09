"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { decryptChunk } from "../crypto/files";

export default function FilePreview({ file, vaultKeys, onClose }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const generatePreview = async () => {
    try {
      setIsLoading(true);
      setError("");

      // Fetch encrypted chunks from backend
      const res = await fetch(
        `${API}/api/files/download?id=${file.id}`,
        { credentials: "include" }
      );

      if (!res.ok) throw new Error("Failed to fetch file for preview");

      const data = await res.json();
      const { encryptedChunks, metadata } = data;

      if (!encryptedChunks?.length || !metadata)
        throw new Error("File preview data missing");

      // Decrypt chunks in memory
      const decryptedParts = [];
      for (const chunk of encryptedChunks.sort((a, b) => a.index - b.index)) {
        const plain = await decryptChunk(
          chunk.data,
          chunk.nonce,
          metadata.keyNonce,
          metadata.fileKeyCipher
        );
        decryptedParts.push(plain);
      }

      // Concatenate all decrypted parts
      const totalLength = decryptedParts.reduce((sum, p) => sum + p.length, 0);
      const decrypted = new Uint8Array(totalLength);
      let offset = 0;
      for (const part of decryptedParts) {
        decrypted.set(part, offset);
        offset += part.length;
      }

      // Create preview URL
      const blob = new Blob([decrypted], { type: metadata.mimeType });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      console.error(err);
      setError(err.message || "Preview failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate preview on mount
  useState(() => {
    generatePreview();
  }, []);

  const handleClose = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onClose();
  };

  if (isLoading) return <p className="text-slate-300">Loading preview...</p>;
  if (error) return <p className="text-red-400">{error}</p>;

  if (!previewUrl) return null;

  // Determine preview type based on MIME
  const isImage = previewUrl && file.mimeType?.startsWith("image/");
  const isText = previewUrl && file.mimeType?.startsWith("text/");
  const isPDF = previewUrl && file.mimeType === "application/pdf";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">
      <div className="relative w-full max-w-3xl h-full sm:h-auto bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 overflow-auto">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Preview content */}
        {isImage && (
          <img
            src={previewUrl}
            alt={file.name}
            className="max-w-full max-h-[80vh] mx-auto rounded-lg"
          />
        )}

        {isText && (
          <pre className="text-sm text-slate-200 overflow-auto max-h-[80vh] whitespace-pre-wrap">
            {new TextDecoder().decode(new Uint8Array(await (await fetch(previewUrl)).arrayBuffer()))}
          </pre>
        )}

        {isPDF && (
          <object
            data={previewUrl}
            type="application/pdf"
            width="100%"
            height="600px"
            className="rounded-lg"
          />
        )}

        {!isImage && !isText && !isPDF && (
          <p className="text-slate-300">
            Preview not available for this file type.
          </p>
        )}
      </div>
    </div>
  );
}
