// src/crypto/chunks.js
import { getSodium } from "./sodium";
import { toBase64, getMasterKey } from "./files";

const CHUNK_SIZE = 5 * 1024 * 1024;

function splitFile(file, chunkSize = CHUNK_SIZE) {
  const chunks = [];
  let offset = 0;

  while (offset < file.size) {
    chunks.push(file.slice(offset, offset + chunkSize));
    offset += chunkSize;
  }

  return chunks;
}

export async function encryptFileChunks(file) {
  const sodium = await getSodium();
  const masterKey = await getMasterKey();

  const fileKey = sodium.randombytes_buf(32);
  const keyNonce = sodium.randombytes_buf(24);

  const wrappedFileKey =
    sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      fileKey,
      null,
      null,
      keyNonce,
      masterKey
    );

  const chunks = splitFile(file);

  const encryptedChunks = [];

  for (let i = 0; i < chunks.length; i++) {
    const data = new Uint8Array(await chunks[i].arrayBuffer());
    const nonce = sodium.randombytes_buf(24);

    const ciphertext =
      sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
        data,
        null,
        null,
        nonce,
        fileKey
      );

    encryptedChunks.push({
      index: i,
      nonce: toBase64(nonce),
      size: data.byteLength, 
      data: ciphertext, // Uint8Array
    });
  }

  return {
    encryptedChunks,
    crypto: {
      keyNonce: toBase64(keyNonce),
      fileKeyCipher: toBase64(wrappedFileKey),
      totalChunks: encryptedChunks.length,
    },
  };
}
