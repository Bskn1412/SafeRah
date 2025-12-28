import { getSodium } from "../crypto/sodium.js";

export default (async () => {
  try {
    const s = await getSodium();
    console.log("SODIUM NAMESPACE:", s);
    console.log("SODIUM KEYS:", Object.keys(s).slice(0,50));
    console.log("crypto_pwhash_SALTBYTES:", s.crypto_pwhash_SALTBYTES);
    console.log("crypto_aead_xchacha20poly1305_ietf_NPUBBYTES:", s.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  } catch (e) {
    console.error("getSodium() failed:", e);
  }
})();
