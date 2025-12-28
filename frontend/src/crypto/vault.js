// src/crypto/vault.js
import { ensureKeys } from "./ensureKeys.js";
import { createSession, getValidSession, clearSession } from "./session.js";

let cachedKeys = null;

export async function unlockVault(password) {
  // call ensureKeys without auto-create
  const res = await ensureKeys(password, { createIfMissing: false });

  if (res && res.needsInit) {
    // Vault not initialized for this account
    throw new Error("VAULT_NOT_INITIALIZED");
  }
  if (res && res.needsPassword) {
    throw new Error("PASSWORD_REQUIRED");
  }
  if (res && res.wrongPassword) {
    throw new Error("INCORRECT_PASSWORD");
  }
  if (!res.masterKey) {
    throw new Error("UNLOCK_FAILED");
  }

  // success — cache keys in memory
  cachedKeys = {
    masterKey: res.masterKey,
    privateKey: res.privateKey,
    publicKey: res.publicKey
  };

  try { await createSession(); } catch (e) { /* non-fatal */ }
  return cachedKeys;
}

export async function tryAutoUnlock() {
  if (cachedKeys) return cachedKeys;
  // We do not attempt to re-derive masterKey here; auto-unlock not supported yet
  return null;
}

export function lockVault() {
  try { clearSession(); } catch (e) {}
  if (cachedKeys) {
    try { if (cachedKeys.masterKey.fill) cachedKeys.masterKey.fill(0); } catch (_) {}
    try { if (cachedKeys.privateKey.fill) cachedKeys.privateKey.fill(0); } catch (_) {}
  }
  cachedKeys = null;
}

export function isUnlocked() {
  return cachedKeys !== null;
}

export function getKeys() {
  if (!cachedKeys) throw new Error("Vault locked");
  return cachedKeys;
}
