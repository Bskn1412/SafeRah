// frontend/src/crypto/session.js
let sessionMasterKey = null;

export function setSessionMasterKey(key) {
  sessionMasterKey = key;
}

export function getSessionMasterKey() {
  return sessionMasterKey;
}

export function clearSessionMasterKey() {
  sessionMasterKey = null;
}
