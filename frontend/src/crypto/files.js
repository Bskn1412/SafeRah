// file: frontend/src/crypto/files.js
import { getSodium } from "./sodium.js";

/* ───────────────────────── Base64 Helpers ───────────────────────── */

function toBase64(u8) {
  let binary = "";
  for (let i = 0; i < u8.byteLength; i++) {
    binary += String.fromCharCode(u8[i]);
  }
  return btoa(binary);
}

function fromBase64(base64) {
  if (!base64 || typeof base64 !== "string") {
    throw new Error("Invalid base64 input");
  }

  let clean = base64.trim()
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  while (clean.length % 4) clean += "=";

  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/* ───────────────────────── Master Key Cache ───────────────────────── */

let masterKeyCache = null;

async function getMasterKey() {
  if (masterKeyCache) return masterKeyCache;

  const { getKeys } = await import("./vault.js");
  const keys = await getKeys();

  if (!keys.masterKey) {
    throw new Error("Vault not unlocked");
  }

  masterKeyCache = keys.masterKey;
  return masterKeyCache;
}

/* ───────────────────────── Encrypt File ───────────────────────── */

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

export async function encryptFile(file) {
  if (file.size > MAX_FILE_SIZE) {
    console.log("File name:", file.name);
    console.error("File size:", file.size);
    throw new Error(`File too large. Max size is ${MAX_FILE_SIZE / (1024 * 1024)} MB`);
  }

  const sodium = await getSodium();
  const masterKey = await getMasterKey();
  const data = new Uint8Array(await file.arrayBuffer());

  const fileKey = sodium.randombytes_buf(32);
  const fileNonce = sodium.randombytes_buf(24);
  const keyNonce = sodium.randombytes_buf(24);

  // Encrypt file data
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    data,        // plaintext
    null,        // AAD
    null,        // nsec (must be null)
    fileNonce,   // nonce
    fileKey      // key
  );

  // Wrap file key with master key
  const wrappedFileKey = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    fileKey,
    null,
    null,
    keyNonce,
    masterKey
  );

  return {
  encryptedBytes: ciphertext, // Uint8Array (IMPORTANT)
  metadata: {
    originalName: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    fileNonce: toBase64(fileNonce),
    keyNonce: toBase64(keyNonce),
    fileKeyCipher: toBase64(wrappedFileKey),
  },
};
}

/* ───────────────────────── Decrypt File ───────────────────────── */

export async function decryptFileData(
  encryptedBase64,
  fileNonceBase64,
  keyNonceBase64,
  fileKeyCipherBase64
) {
  const sodium = await getSodium();
  const masterKey = await getMasterKey();

  const ciphertext = fromBase64(encryptedBase64);
  const fileNonce = fromBase64(fileNonceBase64);
  const keyNonce = fromBase64(keyNonceBase64);
  const wrappedFileKey = fromBase64(fileKeyCipherBase64);

  // Unwrap file key
  const fileKey = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    wrappedFileKey,
    null,
    keyNonce,
    masterKey
  );

  // Decrypt file data
  const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    ciphertext,
    null,
    fileNonce,
    fileKey
  );

  return plaintext;
}


// ───────────────────────── Chunked Encryption ─────────────────────────
export async function decryptChunk(
  encryptedBase64,
  chunkNonceBase64,
  keyNonceBase64,
  fileKeyCipherBase64
) {
  const sodium = await getSodium();
  const masterKey = await getMasterKey();

  const ciphertext = fromBase64(encryptedBase64);
  const chunkNonce = fromBase64(chunkNonceBase64);
  const keyNonce = fromBase64(keyNonceBase64);
  const wrappedFileKey = fromBase64(fileKeyCipherBase64);

  const fileKey = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    wrappedFileKey,
    null,
    keyNonce,
    masterKey
  );

  return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    ciphertext,
    null,
    chunkNonce,
    fileKey
  );
}

export { fromBase64, toBase64, getMasterKey };
