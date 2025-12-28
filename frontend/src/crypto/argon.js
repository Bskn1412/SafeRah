// src/crypto/argon.js
import { getSodium } from "./sodium.js";

/**
 * Small helper to read a list of possible constant names from the sodium object.
 * Returns the first numeric value found, otherwise `undefined`.
 */
function findConst(sodium, candidates) {
  for (const name of candidates) {
    if (typeof sodium[name] === "number") return sodium[name];
    if (typeof sodium[name] === "bigint") return Number(sodium[name]);
  }
  return undefined;
}

let _warned = false;
function warnOnce(msg) {
  if (!_warned) {
    console.warn(msg);
    _warned = true;
  }
}

/**
 * deriveKeyFromPassword(password, salt?)
 *
 * - password: string (non-empty)
 * - salt: optional Uint8Array or base64 string
 *
 * Returns { key: Uint8Array(32), salt: Uint8Array }
 */
export async function deriveKeyFromPassword(password, salt = null) {
  const sodium = await getSodium();


if (typeof sodium.crypto_pwhash !== 'function') {
  throw new Error('Argon2 not available - install libsodium-wrappers-sumo');
}
console.log('Argon2 available:', !!sodium.crypto_pwhash);


  if (!password || typeof password !== "string") {
    throw new Error("deriveKeyFromPassword: password must be a non-empty string");
  }

  // Try several common constant name variants (some builds expose different names)
  const SALTBYTES = findConst(sodium, [
    "crypto_pwhash_SALTBYTES",
    "crypto_pwhash_saltbytes",
    "crypto_pwhash_salt_bytes",
    "crypto_pwhash_SALTBYTES()", // unlikely
  ]) || 16; // fallback

  const OPSLIMIT = findConst(sodium, [
    "crypto_pwhash_OPSLIMIT_INTERACTIVE",
    "crypto_pwhash_opslimit_interactive",
    "crypto_pwhash_OPSLIMIT_MODERATE",
    "crypto_pwhash_OPSLIMIT_MIN"
  ]) || sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE || 2;

  const MEMLIMIT = findConst(sodium, [
    "crypto_pwhash_MEMLIMIT_INTERACTIVE",
    "crypto_pwhash_memlimit_interactive",
    "crypto_pwhash_MEMLIMIT_MODERATE",
    "crypto_pwhash_MEMLIMIT_MIN"
  ]) || sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE || 67108864; // 64MB

  if (!sodium || typeof sodium.randombytes_buf !== "function") {
    throw new Error("libsodium not loaded correctly (randombytes_buf missing).");
  }

  // Build or convert salt to Uint8Array
  let usedSalt;
  if (!salt) {
    usedSalt = sodium.randombytes_buf(SALTBYTES);
  } else if (salt instanceof Uint8Array) {
    usedSalt = salt;
  } else if (typeof salt === "string") {
    usedSalt = Uint8Array.from(atob(salt), c => c.charCodeAt(0));
    if (usedSalt.length < SALTBYTES) {
      // If provided base64 salt is shorter/longer, normalize to expected length by padding/truncating
      const tmp = new Uint8Array(SALTBYTES);
      tmp.set(usedSalt.subarray(0, SALTBYTES));
      usedSalt = tmp;
    }
  } else {
    throw new Error("deriveKeyFromPassword: salt must be Uint8Array or base64 string if provided");
  }

  // If we had to fall back to sane defaults, warn once so you know.
  if (! (sodium.crypto_pwhash_SALTBYTES && sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE && sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE)) {
    warnOnce("libsodium Argon2 constants missing — using fallback numeric values. Consider installing 'libsodium-wrappers-sumo' if you need full build.");
    console.info("Using SALTBYTES =", SALTBYTES, "OPSLIMIT =", OPSLIMIT, "MEMLIMIT =", MEMLIMIT);
  }

  try {
    // Use sodium.crypto_pwhash — libsodium accepts a string password directly
    const outLen = 32;
    const derived = sodium.crypto_pwhash(
      outLen,
      password,
      usedSalt,
      OPSLIMIT,
      MEMLIMIT,
      sodium.crypto_pwhash_ALG_ARGON2ID13
    );




console.log('pwhash result:', { isUint8: derived instanceof Uint8Array, length: derived?.length, firstBytes: derived ? Array.from(derived.slice(0, 4)).map(b => b.toString(16)) : 'NULL' });


    return { key: derived, salt: usedSalt };
  } catch (err) {
    throw new Error("deriveKeyFromPassword failed: " + (err && err.message ? err.message : String(err)));
  }
}















/** helpers */
export function u8ToB64(u8) {
  return btoa(String.fromCharCode(...u8));
}
export function b64ToU8(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}
