// backend/utils/authenticator.js

import { authenticator } from "otplib";
import sodium from "libsodium-wrappers";
import crypto from "crypto";

export async function deriveKeyFromPassphrase(passphrase, userEmail) {
  await sodium.ready;

  const KEYBYTES =
    sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES;

  const saltBuf = crypto
    .createHash("sha256")
    .update(passphrase + userEmail)
    .digest()
    .subarray(0, 16);

  const keyBuf = crypto.scryptSync(
    passphrase,
    saltBuf,
    KEYBYTES,
    { N: 1 << 14, r: 8, p: 1 }
  );

  return new Uint8Array(keyBuf);
}

export async function encryptionKey(text, key) {
  await sodium.ready;

  const nonce = sodium.randombytes_buf(
    sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
  );

  const cipherText =
    sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      Buffer.from(text),
      null,
      null,
      nonce,
      key
    );

  return {
    cipherText: Buffer.from(cipherText).toString("base64"),
    nonce: Buffer.from(nonce).toString("base64"),
  };
}

export async function decryptionKey(cipherTextB64, nonceB64, key) {
  await sodium.ready;

  const cipherText = Buffer.from(cipherTextB64, "base64");
  const nonce = Buffer.from(nonceB64, "base64");

  const decryptedText =
    sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      cipherText,
      null,
      nonce,
      key
    );

  if (!decryptedText) throw new Error("Decryption failed");

  return Buffer.from(decryptedText).toString("utf-8");
}

export async function createAuthenticatorSecret(userEmail) {
  const secret = authenticator.generateSecret(); // BASE32 ✔

  const passphrase = process.env.APP_2FA_SECRET;
  if (!passphrase) {
    throw new Error("Server config error: APP_2FA_SECRET missing");
  }

  const key = await deriveKeyFromPassphrase(passphrase, userEmail);
  const encryptedSecret = await encryptionKey(secret, key);

 const issuer = "SafeRaho";
const label = `${issuer}:${userEmail}`;

const otpauth =
  `otpauth://totp/${encodeURIComponent(label)}` +
  `?secret=${secret}` +
  `&issuer=${encodeURIComponent(issuer)}` +
  `&algorithm=SHA1` +
  `&digits=6` +
  `&period=30`;


  // DEBUG (temporary)
  // console.log("OTPAUTH URI:", otpauth);

  return {
    encryptedSecret, // store encrypted
    otpauth,         // QR value
    secret,          // show ONLY once
  };
}

export async function verifyAuthenticator(
  encryptedSecret,
  userEmail,
  token
) {
  const passphrase = process.env.APP_2FA_SECRET;
  if (!passphrase) throw new Error("APP_2FA_SECRET not set");

  const key = await deriveKeyFromPassphrase(passphrase, userEmail);

  const decryptedSecret = await decryptionKey(
    encryptedSecret.cipherText,
    encryptedSecret.nonce,
    key
  );

  // console.log("----- DEBUG 2FA -----");
  // console.log("Token from user:", token);
  // console.log("Decrypted secret:", decryptedSecret);

  const check = authenticator.checkDelta(token, decryptedSecret);
  // console.log("Raw checkDelta result:", check);

  if (check === null) {
    return { success: false, reason: "invalid", drift: 0 };
  }

  // Normalize drift: if number → use as is, if object → use .delta
  const delta = typeof check === "number" ? check : check?.delta ?? 0;

  return {
    success: true,
    drift: delta, // always numeric
  };
}