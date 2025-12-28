// frontend/src/crypto/recovery.js
import sodium from "libsodium-wrappers";
import { generateMnemonic, validateMnemonic, mnemonicToSeedSync } from "@scure/bip39";
import { wordlist } from "./WordLists/english";
import { getKeys } from "./vault";

/* ---------------------------------- */
/* Generate 12-word recovery phrase    */
/* ---------------------------------- */
export function generateRecoveryPhrase() {
  return generateMnemonic(wordlist, 128);
}
/* ---------------------------------- */
/* Derive key from recovery phrase     */
/* ---------------------------------- */
async function deriveKeyFromPhrase(phrase, salt) {
  await sodium.ready;

  if (!bip39.validateMnemonic(phrase.trim())) {
    throw new Error("Invalid recovery phrase");
  }
const seed = mnemonicToSeedSync(phrase, wordlist);


  return sodium.crypto_pwhash(
    sodium.crypto_secretbox_KEYBYTES,
    seed.slice(0, 32),
    salt,
    sodium.crypto_pwhash_OPSLIMIT_MODERATE,
    sodium.crypto_pwhash_MEMLIMIT_MODERATE,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  );
}

/* ---------------------------------- */
/* Wrap master key with recovery key   */
/* ---------------------------------- */
export async function wrapMasterKeyWithRecovery(phrase) {
  await sodium.ready;

  const keys = getKeys(); // vault must be unlocked
  const masterKey = keys.masterKey;

  if (!masterKey) {
    throw new Error("Vault is locked");
  }

  const salt = sodium.randombytes_buf(
    sodium.crypto_pwhash_SALTBYTES
  );

  const key = await deriveKeyFromPhrase(phrase, salt);

  const nonce = sodium.randombytes_buf(
    sodium.crypto_secretbox_NONCEBYTES
  );

  const wrapped = sodium.crypto_secretbox_easy(
    masterKey,
    nonce,
    key
  );

  return {
    wrappedMasterKey: sodium.to_base64(wrapped),
    nonce: sodium.to_base64(nonce),
    salt: sodium.to_base64(salt)
  };
}

/* ---------------------------------- */
/* Unwrap master key (password reset)  */
/* ---------------------------------- */
export async function unwrapWithRecovery(
  phrase,
  wrappedMasterKey,
  nonce,
  salt
) {
  await sodium.ready;

  const key = await deriveKeyFromPhrase(
    phrase,
    sodium.from_base64(salt)
  );

  const masterKey = sodium.crypto_secretbox_open_easy(
    sodium.from_base64(wrappedMasterKey),
    sodium.from_base64(nonce),
    key
  );

  if (!masterKey) {
    throw new Error("Invalid recovery phrase");
  }

  return masterKey;
}

/* ---------------------------------- */
/* Re-wrap master key with new password*/
/* ---------------------------------- */
export async function rewrapWithPassword(masterKey, newPassword) {
  await sodium.ready;

  const salt = sodium.randombytes_buf(
    sodium.crypto_pwhash_SALTBYTES
  );

  const key = sodium.crypto_pwhash(
    sodium.crypto_secretbox_KEYBYTES,
    newPassword,
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
    key
  );

  return {
    wrappedMasterKey: sodium.to_base64(wrapped),
    nonce: sodium.to_base64(nonce),
    salt: sodium.to_base64(salt)
  };    
}
