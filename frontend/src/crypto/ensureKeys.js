// src/crypto/ensureKeys.js
import { getSodium } from "./sodium.js";
import { api } from "../api";
import { deriveKeyFromPassword } from "./argon.js";

export async function ensureKeys(password, { createIfMissing = false } = {}) {
  const sodium = await getSodium();

  const toB64 = (u8) => sodium.to_base64(u8);
  const fromB64 = (s) => sodium.from_base64(s);

  // fetch existing stored blobs & flags
  const { data } = await api.get("/keys/get");

  // If keys do not exist on server
  if (!data.hasKeys) {
    if (!createIfMissing) {
      // IMPORTANT: do NOT create here. Caller must explicitly request creation.
      return { needsInit: true };
    }

    // Explicit creation path (only run when caller asked to create)
    if (!password || typeof password !== "string") {
      throw new Error("Password required to initialize vault");
    }

    const { key: passwordKey, salt } = await deriveKeyFromPassword(password);

    // generate masterKey
    const masterKey = await getRandomBuffer(32, sodium);
    const mNonce = await getRandomBuffer(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES, sodium);
    const encMaster = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      masterKey, null, null, mNonce, passwordKey
    );

    // create X25519 keypair and encrypt private key with masterKey
    const kp = sodium.crypto_box_keypair();
    const pNonce = await getRandomBuffer(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES, sodium);
    const encPriv = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      kp.privateKey, null, null, pNonce, masterKey
    );

    // send encrypted blobs to server
    await api.post("/keys/store", {
      encryptedMasterKey: toB64(encMaster),
      masterNonce: toB64(mNonce),
      argonSalt: toB64(salt),
      encryptedX25519Priv: toB64(encPriv),
      x25519PrivNonce: toB64(pNonce),
      publicKey: toB64(kp.publicKey),
    });

    return { created: true, masterKey, privateKey: kp.privateKey, publicKey: kp.publicKey };
  }

  // Returning user: recover keys using provided password
  if (!password || typeof password !== "string") {
    // caller didn't provide password — we cannot proceed
    return { needsPassword: true };
  }

  const saltU8 = fromB64(data.argonSalt);
  const { key: passwordKey } = await deriveKeyFromPassword(password, saltU8);

  let masterKey;
  try {
    masterKey = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null, fromB64(data.encryptedMasterKey), null, fromB64(data.masterNonce), passwordKey
    );
  } catch {
    masterKey = null;
  }

  if (!masterKey) {
    // wrong password or tampered data
    return { wrongPassword: true };
  }

  let privateKey;
  try {
    privateKey = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null, fromB64(data.encryptedX25519Priv), null, fromB64(data.x25519PrivNonce), masterKey
    );
  } catch {
    // wrong password or tampered data
    return { wrongPassword: true };
  }

  return {
    created: false,
    masterKey,
    privateKey,
    publicKey: fromB64(data.publicKey),
  };
}

// NEW: Helper to generate random buffer with retry
async function getRandomBuffer(length, sodium) {
  let buf = sodium.randombytes_buf(length);
  if (!buf || !(buf instanceof Uint8Array) || buf.length !== length) {
    console.warn('Random buffer invalid, retrying...');
    await new Promise(r => setTimeout(r, 100));
    buf = sodium.randombytes_buf(length);
    if (!buf || buf.length !== length) {
      throw new Error('Failed to generate random buffer');
    }
  }
  return buf;
}