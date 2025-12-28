import sodium from "libsodium-wrappers";

/**
 * Master Key Module
 * ------------------------------
 * Purpose:
 * - Generate a user's master key (256-bit)
 * - Encrypt it using the key derived from password (Argon2id)
 * - Decrypt it later during login using the same password
 *
 * Important:
 * The server NEVER sees the plaintext master key.
 * It only stores:
 *      encryptedMasterKey + argonSalt
 */

export async function generateMasterKey() {
  await sodium.ready;
  return sodium.randombytes_buf(32); // 256-bit master key
}

/**
 * Encrypt master key using password-derived key
 *
 * Inputs:
 *  masterKey → Uint8Array (256-bit)
 *  derivedKey → Uint8Array (from Argon2id)
 *
 * Returns:
 *  { encryptedMasterKey, nonce }
 */

export async function encryptMasterKey(masterKey, derivedKey) {
  await sodium.ready;

  // Generate XChaCha20 24-byte nonce
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);

  // Encrypt the master key
  const encryptedMasterKey = sodium.crypto_secretbox_easy(
    masterKey,
    nonce,
    derivedKey
  );

  return { encryptedMasterKey, nonce };
}

/**
 * Decrypt master key using derived key
 *
 * Inputs:
 *  encryptedMasterKey → Uint8Array
 *  nonce → Uint8Array
 *  derivedKey → Uint8Array
 *
 * Returns:
 *  masterKey → Uint8Array (plaintext)
 */

export async function decryptMasterKey(encryptedMasterKey, nonce, derivedKey) {
  await sodium.ready;

  const masterKey = sodium.crypto_secretbox_open_easy(
    encryptedMasterKey,
    nonce,
    derivedKey
  );

  if (!masterKey) throw new Error("Invalid password or corrupted master key.");

  return masterKey; // Uint8Array
}
