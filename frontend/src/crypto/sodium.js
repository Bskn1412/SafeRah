// src/crypto/sodium.js
let _promise = null;

export async function getSodium() {
  if (_promise) return _promise;

  _promise = import("libsodium-wrappers-sumo").then(mod => {
    // Handle both ESM default export and named export cases
    const sodium = mod.default || mod;

    // sodium.ready is a Promise — wait for it, then return the sodium namespace
    return sodium.ready.then(() => sodium);
  });

  return _promise;
}
