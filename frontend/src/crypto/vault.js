// src/crypto/vault.js
import { ensureKeys } from "./ensureKeys.js";
import {setSessionMasterKey, clearSessionMasterKey} from "./session.js";
  
let cachedKeys = null;
export function cacheKeys({ masterKey, privateKey, publicKey }) {
  cachedKeys = {
    masterKey,
    privateKey,
    publicKey
  };
}


export async function unlockVault(password) {
  const res = await ensureKeys(password, { createIfMissing: false });

  if (res?.needsInit) throw new Error("VAULT_NOT_INITIALIZED");
  if (res?.needsPassword) throw new Error("PASSWORD_REQUIRED");
  if (res?.wrongPassword) throw new Error("INCORRECT_PASSWORD");
  if (!res?.masterKey) throw new Error("UNLOCK_FAILED");

  cachedKeys = {
    masterKey: res.masterKey,
    privateKey: res.privateKey,
    publicKey: res.publicKey
  };

  // store master key in session memory
  try {
    setSessionMasterKey(res.masterKey);
  } catch (_) {}

  return cachedKeys;
}

export function tryAutoUnlock() {
  return cachedKeys;
}

export function lockVault() {
  try {
    clearSessionMasterKey();
  } catch (_) {}

  if (cachedKeys) {
    try { cachedKeys.masterKey?.fill?.(0); } catch {}
    try { cachedKeys.privateKey?.fill?.(0); } catch {}
  }

  cachedKeys = null;
}

export function isUnlocked() {
  return cachedKeys !== null;
}

export function getKeys() {
  if (!cachedKeys) throw new Error("VAULT_LOCKED");
  return cachedKeys;
}




import { getSessionMasterKey } from "./session.js";

export function hydrateVaultFromSession() {
  const masterKey = getSessionMasterKey();
  if (!masterKey) return false;

  // We don’t have private/public keys yet, but recovery only needs masterKey
  cachedKeys = {
    masterKey,
    privateKey: null,
    publicKey: null
  };

  return true;
}
