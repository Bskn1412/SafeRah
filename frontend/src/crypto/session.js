// src/crypto/session.js
// Simple session mechanism:
// - DOES NOT store masterKey or passwordKey
// - Only marks "user authenticated"
// - Vault remains locked until password is re-entered
// src/crypto/session.js

const SESSION_KEY = "saferaho_session";

export async function createSession() {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      active: true,
      createdAt: Date.now(),
    })
  );
}

export async function getValidSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return false;

  try {
    const session = JSON.parse(raw);
    return session.active === true;
  } catch {
    return false;
  }
}

export async function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
