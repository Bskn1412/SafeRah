// src/crypto/recovery.js
import { getSodium } from "./sodium.js";
import {
  generateMnemonic,
  validateMnemonic,
  mnemonicToSeedSync
} from "@scure/bip39";
import { wordlist } from "./WordLists/english";

/* ---------------------------------- */
/* Generate 12-word recovery phrase   */
/* ---------------------------------- */
export function generateRecoveryPhrase() {
  if (!wordlist || wordlist.length !== 2048) {
    throw new Error("BIP39 wordlist not loaded correctly");
  }

  // 128 bits entropy → 12 words
  return generateMnemonic(wordlist, 128);
}

/* ---------------------------------- */
/* Derive recovery key from mnemonic  */
/* ---------------------------------- */
async function deriveKeyFromPhrase(phrase) {
  if (!phrase || typeof phrase !== "string") {
    throw new Error("Recovery phrase is required");
  }

  const normalized = phrase.trim().toLowerCase();

  if (!validateMnemonic(normalized, wordlist)) {
    throw new Error("Invalid recovery phrase");
  }

  const sodium = await getSodium();

  // BIP39 seed (512 bits)
  const seed = mnemonicToSeedSync(normalized, wordlist);

  // Derive fixed-size symmetric key (HKDF-style)
  return sodium.crypto_generichash(
    sodium.crypto_secretbox_KEYBYTES,
    seed,
    "SafeRah-Recovery-Key-v1"
  );
}

/* ---------------------------------- */
/* Wrap master key with recovery key  */
/* ---------------------------------- */
export async function wrapMasterKeyWithRecovery(masterKey, phrase) {
  if (!(masterKey instanceof Uint8Array) || masterKey.length !== 32) {
    throw new Error("Valid masterKey (Uint8Array, 32 bytes) is required");
  }

  if (!phrase || typeof phrase !== "string") {
    throw new Error("Recovery phrase is required");
  }

  const sodium = await getSodium();
  const recoveryKey = await deriveKeyFromPhrase(phrase);
  const nonce = sodium.randombytes_buf(
    sodium.crypto_secretbox_NONCEBYTES
  );

  const wrapped = sodium.crypto_secretbox_easy(
    masterKey,
    nonce,
    recoveryKey
  );

  // Optional memory wipe
  recoveryKey.fill(0);

  return {
    wrappedMasterKey: sodium.to_base64(wrapped),
    nonce: sodium.to_base64(nonce),
    scheme: "recovery-hash-v1"
  };
}

/* ---------------------------------- */
/* Unwrap master key using recovery   */
/* ---------------------------------- */
export async function unwrapWithRecovery(
  phrase,
  wrappedMasterKey,
  nonce
) {
  if (!phrase || !wrappedMasterKey || !nonce) {
    throw new Error("All inputs are required");
  }

  const sodium = await getSodium();
  const recoveryKey = await deriveKeyFromPhrase(phrase);

  let masterKey;
  try {
    masterKey = sodium.crypto_secretbox_open_easy(
      sodium.from_base64(wrappedMasterKey),
      sodium.from_base64(nonce),
      recoveryKey
    );
  } catch {
    throw new Error("Invalid recovery phrase or corrupted data");
  } finally {
    recoveryKey.fill(0);
  }

  if (!(masterKey instanceof Uint8Array) || masterKey.length !== 32) {
    throw new Error("Recovered master key is invalid");
  }

  return masterKey;
}

/* ---------------------------------- */
/* Re-wrap master key with password   */
/* ---------------------------------- */
export async function rewrapWithPassword(masterKey, password) {
  if (!(masterKey instanceof Uint8Array) || masterKey.length !== 32) {
    throw new Error("Valid masterKey is required");
  }

  if (!password || typeof password !== "string" || password.length < 8) {
    throw new Error("Strong password is required");
  }

  const sodium = await getSodium();

  const salt = sodium.randombytes_buf(
    sodium.crypto_pwhash_SALTBYTES
  );

  const passwordKey = sodium.crypto_pwhash(
    sodium.crypto_secretbox_KEYBYTES,
    password,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_MODERATE,
    sodium.crypto_pwhash_MEMLIMIT_MODERATE,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  );

  const nonce = sodium.randombytes_buf(
    sodium.crypto_secretbox_NONCEBYTES
  );

  const wrapped = sodium.crypto_secretbox_easy(
    masterKey,
    nonce,
    passwordKey
  );

  // Optional memory wipe
  passwordKey.fill(0);

  return {
    wrappedMasterKey: sodium.to_base64(wrapped),
    nonce: sodium.to_base64(nonce),
    salt: sodium.to_base64(salt),
    scheme: "password-argon2id-v1"
  };
}
