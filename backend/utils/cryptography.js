import sodium from "libsodium-wrappers";
import crypto from "crypto";

export async function encrypt(text, key) {
  await sodium.ready;

  const nonce = sodium.randombytes_buf(
    sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
  );

  const cipher = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    Buffer.from(text),
    null,
    null,
    nonce,
    key
  );

  return {
    cipherText: Buffer.from(cipher).toString("base64"),
    nonce: Buffer.from(nonce).toString("base64"),
  };
}

export async function decrypt(cipherTextB64, nonceB64, key) {
  await sodium.ready;

  const cipher = Buffer.from(cipherTextB64, "base64");
  const nonce = Buffer.from(nonceB64, "base64");

  const plain = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    cipher,
    null,
    nonce,
    key
  );

  return Buffer.from(plain).toString();
}

export async function deriveKey(passphrase) {
  await sodium.ready;
  return crypto.scryptSync(passphrase, "static-salt", 32);
}
