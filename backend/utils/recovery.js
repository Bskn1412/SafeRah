import * as bip39 from "bip39";
import sodium from "libsodium-wrappers";
import crypto from "crypto";

/**
 * Generate 12-word recovery phrase (BIP39)
 */
export function generateRecoveryPhrase() {
  const mnemonic = bip39.generateMnemonic(128); // 12 words
  return mnemonic;
}

/**
 * Derive encryption key from recovery phrase
 */
export async function deriveRecoveryKey(mnemonic, salt) {
  await sodium.ready;

  const seed = await bip39.mnemonicToSeed(mnemonic);
  const key = crypto.scryptSync(
    seed.slice(0, 32),
    salt,
    sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES,
    { N: 1 << 15, r: 8, p: 1 }
  );

  return new Uint8Array(key);
}

/**
 * Wrap (encrypt) master key using recovery phrase
 */
export async function wrapMasterKey(masterKey, mnemonic) {
  await sodium.ready;

  const salt = sodium.randombytes_buf(16);
  const nonce = sodium.randombytes_buf(
    sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
  );

  const key = await deriveRecoveryKey(mnemonic, salt);

  const wrapped = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    masterKey,
    null,
    null,
    nonce,
    key
  );

  return {
    wrappedMasterKey: Buffer.from(wrapped).toString("base64"),
    nonce: Buffer.from(nonce).toString("base64"),
    salt: Buffer.from(salt).toString("base64")
  };
}
