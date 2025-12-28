// crypto/files.js
import { getSodium } from "./sodium.js";

const sodium = await getSodium();

// Safe base64 – uses libsodium directly (zero chance of recursion)
const toB64 = (buf) => sodium.to_base64(buf, sodium.base64_variants.ORIGINAL);
const fromB64 = (str) => sodium.from_base64(str, sodium.base64_variants.ORIGINAL);

let masterKeyCache = null;

// Get master key from vault (cached for performance)
async function getMasterKey() {
  if (masterKeyCache) return masterKeyCache;
  const keys = await (await import("./vault.js")).getKeys();
  masterKeyCache = keys.masterKey; // assuming your vault returns { masterKey }
  return masterKeyCache;
}

// ENCRYPT A FILE
export async function encryptFile(file) {
  const masterKey = await getMasterKey();

  const data = new Uint8Array(await file.arrayBuffer());

  const fileKey = sodium.randombytes_buf(32);        // random per-file key
  const nonce = sodium.randombytes_buf(24);           // 24-byte nonce for XChaCha20

  const ciphertext = sodium.crypto_secretbox_easy(data, nonce, fileKey);
  const wrappedFileKey = sodium.crypto_secretbox_easy(fileKey, nonce, masterKey);

  return {
    id: null, // server generates ObjectId
    encryptedData: toB64(ciphertext),
    metadata: {
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      nonce: toB64(nonce),
      fileKeyCipher: toB64(wrappedFileKey), // wrapped with master key
    },
  };
}

// DECRYPT A FILE (used on download)
export async function decryptFileData(encryptedB64, nonceB64, fileKeyCipherB64) {
  const masterKey = await getMasterKey();

  const ciphertext = fromB64(encryptedB64);
  const nonce = fromB64(nonceB64);
  const wrappedFileKey = fromB64(fileKeyCipherB64);

  // 1. Unwrap the file key
  const fileKey = sodium.crypto_secretbox_open_easy(wrappedFileKey, nonce, masterKey);

  // 2. Decrypt the actual file
  const plaintext = sodium.crypto_secretbox_open_easy(ciphertext, nonce, fileKey);

  return plaintext; // Uint8Array → becomes Blob in Dashboard
}