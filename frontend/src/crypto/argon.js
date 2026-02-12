// src/crypto/argon.js
import { getSodium } from "./sodium.js";

/**
 * deriveKeyFromPassword(password, salt?)
 *
 * - password: string (non-empty)
 * - salt: Uint8Array (optional)
 *
 * Returns { key: Uint8Array(32), salt: Uint8Array }
 */
export async function deriveKeyFromPassword(password, salt = null) {
  const sodium = await getSodium();

  if (typeof sodium.crypto_pwhash !== "function") {
    throw new Error("Argon2 not available — use libsodium-wrappers-sumo");
  }

  if (!password || typeof password !== "string") {
    throw new Error("deriveKeyFromPassword: password must be a non-empty string");
  }

  const SALTBYTES = sodium.crypto_pwhash_SALTBYTES;
  const OPSLIMIT = sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE;
  const MEMLIMIT = sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE;

  if (!salt) {
    salt = sodium.randombytes_buf(SALTBYTES);
  }

  if (!(salt instanceof Uint8Array) || salt.length !== SALTBYTES) {
    throw new Error("deriveKeyFromPassword: invalid salt");
  }

  try {
    const key = sodium.crypto_pwhash(
      32,
      password,
      salt,
      OPSLIMIT,
      MEMLIMIT,
      sodium.crypto_pwhash_ALG_ARGON2ID13
    );

    return { key, salt };
  } catch (err) {
    throw new Error(
      "deriveKeyFromPassword failed: " +
      (err?.message || String(err))
    );
  }
}
