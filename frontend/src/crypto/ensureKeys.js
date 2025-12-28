// src/crypto/ensureKeys.js
import { getSodium } from "./sodium.js";
import { api } from "../api";
import { deriveKeyFromPassword } from "./argon.js";  // Removed unused u8ToB64, b64ToU8

function toB64(u8) { return btoa(String.fromCharCode(...u8)); }
function fromB64(str) { return Uint8Array.from(atob(str), c => c.charCodeAt(0)); }

export async function ensureKeys(password, { createIfMissing = false } = {}) {
  const sodium = await getSodium();

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





    // TEST ONLY: Re-derive to verify consistency (browser-safe check)
    const urlParams = new URLSearchParams(window.location.search);
    const isDebug = urlParams.get('debug') === 'true';
    if (isDebug) {
      const { key: passwordKey2 } = await deriveKeyFromPassword(password, salt);
      const keysMatch = sodium.memcmp(passwordKey, passwordKey2);  // Secure byte comparison (constant-time)
      if (!keysMatch) {
        console.error('DERIVATION TEST FAILED: Keys do not match!');
        throw new Error('Key derivation inconsistency - check argon.js');
      }
      console.log('DERIVATION TEST PASSED: Keys match (first 8 bytes hex for debug):', 
                  Array.from(passwordKey.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(''));
    }







    
    // generate masterKey
    const masterKey = sodium.randombytes_buf(32);
    const mNonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
    const encMaster = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      masterKey, null, null, mNonce, passwordKey
    );

    // create X25519 keypair and encrypt private key with masterKey
    const kp = sodium.crypto_box_keypair();
    const pNonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
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

    // TEST ONLY: Immediate roundtrip verify (simulate unlock) - only in creation path
    if (isDebug) {
      try {
        // Re-fetch the just-stored data
        const { data: freshData } = await api.get("/keys/get");
        const freshSaltU8 = fromB64(freshData.argonSalt);
        const { key: freshPasswordKey } = await deriveKeyFromPassword(password, freshSaltU8);
        
        let freshMasterKey;
        try {
          freshMasterKey = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
            null, fromB64(freshData.encryptedMasterKey), null, fromB64(freshData.masterNonce), freshPasswordKey
          );
        } catch (decryptErr) {
          freshMasterKey = null;  // Treat SodiumError as failure
        }
        
        if (!freshMasterKey || !sodium.memcmp(masterKey, freshMasterKey)) {
          console.error('REGISTRATION ROUNDTRIP TEST FAILED: Decryption mismatch!');
          throw new Error('Vault creation verification failed - check encryption/decryption');
        }
        console.log('REGISTRATION ROUNDTRIP TEST PASSED: Master key decrypts correctly');
      } catch (testErr) {
        console.error('Roundtrip test error (non-fatal in prod):', testErr);
        // Don't throw—let creation succeed, but log for dev
      }
    }

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
  } catch (decryptErr) {
    masterKey = null;  // Treat SodiumError as wrong password
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
  } catch (decryptErr) {
    // Rare: Master ok, but priv decrypt fails? Treat as wrong password/tampered
    return { wrongPassword: true };
  }

  return {
    created: false,
    masterKey,
    privateKey,
    publicKey: fromB64(data.publicKey),
  };
}