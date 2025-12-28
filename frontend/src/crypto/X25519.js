/**
 * src/crypto/x25519.js
 *
 * Purpose:
 * - Provide X25519 (Curve25519) ECDH utilities using libsodium-wrappers
 * - Generate keypairs suitable for ECDH (use crypto_box_keypair)
 * - Compute shared secrets (scalar multiplication)
 * - Derive a Key-Encryption-Key (KEK) from the shared secret using a safe KDF
 *
 * Exports:
 * - generateKeypair() -> { publicKey, privateKey } (Uint8Array)
 * - computeSharedSecret(ourPrivateKey, theirPublicKey) -> Uint8Array (raw shared secret)
 * - deriveKEK(sharedSecret, context) -> Uint8Array (32 bytes KEK)
 *
 * Notes:
 * - libsodium's crypto_box_keypair uses Curve25519-compatible keys suitable for X25519/ECDH.
 * - We use crypto_generichash (blake2b-like) as a KDF here; in production you can use HKDF-SHA256.
 */

import sodium from "libsodium-wrappers";

/**
 * generateKeypair
 * - Generates a Curve25519-compatible keypair for ECDH.
 * - Returns both keys as Uint8Array (publicKey, privateKey).
 *
 * Usage:
 *   const { publicKey, privateKey } = generateKeypair();
 */
export async function generateKeypair() {
  await sodium.ready;
  // crypto_box_keypair returns { publicKey, privateKey } Uint8Array
  const kp = sodium.crypto_box_keypair();
  return {
    publicKey: kp.publicKey,   // Uint8Array
    privateKey: kp.privateKey, // Uint8Array
  };
}

/**
 * computeSharedSecret
 * - Given our private key and their public key, compute ECDH shared secret.
 * - The result is raw shared bytes (32 bytes). Do NOT use raw shared secret directly for encryption;
 *   pass it through a KDF (deriveKEK) before using it as a symmetric key.
 *
 * Inputs:
 *  - ourPrivateKey: Uint8Array
 *  - theirPublicKey: Uint8Array
 *
 * Returns:
 *  - sharedSecret: Uint8Array (32 bytes)
 */
export async function computeSharedSecret(ourPrivateKey, theirPublicKey) {
  await sodium.ready;
  // crypto_scalarmult performs scalar multiplication (X25519)
  const shared = sodium.crypto_scalarmult(ourPrivateKey, theirPublicKey);
  return shared; // Uint8Array
}

/**
 * deriveKEK
 * - Derive a Key-Encryption-Key (KEK) from the raw ECDH shared secret.
 * - This prevents usage of raw ECDH output directly and allows context binding.
 *
 * Inputs:
 *  - sharedSecret: Uint8Array (raw ECDH output)
 *  - context: string (optional) - bind derivation to fileId, purpose, version
 *
 * Returns:
 *  - kek: Uint8Array (32 bytes) - safe symmetric key to use with AEAD (XChaCha20-Poly1305)
 *
 * Implementation details:
 *  - Uses libsodium's crypto_generichash (BLAKE2b-like) to derive a 32-byte key.
 *  - We concatenate the shared secret with context bytes and hash to get deterministic KEK.
 *  - In production you may prefer HKDF-SHA256 for strict standard compliance.
 */
export async function deriveKEK(sharedSecret, context = "") {
  await sodium.ready;
  const contextU8 = new TextEncoder().encode(context || "");
  const input = new Uint8Array(sharedSecret.length + contextU8.length);
  input.set(sharedSecret, 0);
  input.set(contextU8, sharedSecret.length);

  // crypto_generichash(outputLength, input, key?) -> Uint8Array
  const kek = sodium.crypto_generichash(32, input); // 32 bytes KEK
  return kek;
}

/**
 * helper: base64 helpers (optional convenience)
 */
export function toBase64(u8) {
  return btoa(String.fromCharCode(...u8));
}
export function fromBase64(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
