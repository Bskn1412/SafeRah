import sodium from "libsodium-wrappers";

(async () => {
  await sodium.ready;

  // Your MongoDB values
  const encryptedMasterKeyB64 = "UdyEza2XoFYcCKx2Ee/Oucl327xfU2iixDl02/vw/Zt2sww8YN6uK0anLFBSFSM5";
  const masterNonceB64 = "IZab5XeBEJFS0/faTVFtl60yJNhk4ba5";
  const argonSaltB64 = "0TnsWQSDsQ7Z5EHKzXPVcg==";

  const password = "saik"; // replace with your actual password

  // Helper
  const fromB64 = (str) => Uint8Array.from(atob(str), c => c.charCodeAt(0));

  const saltU8 = fromB64(argonSaltB64);
  console.log("Salt length:", saltU8.length);

  // Derive key from password
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  // Using libsodium argon2id (your deriveKeyFromPassword function)
  const derived = await deriveKeyFromPassword(password, saltU8); // replace with your actual function
  const passwordKey = derived.key;
  console.log("Password key length:", passwordKey.length);

  try {
    const decryptedMaster = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      fromB64(encryptedMasterKeyB64),
      null,
      fromB64(masterNonceB64),
      passwordKey
    );
    console.log("Decryption succeeded! Master key length:", decryptedMaster.length);
  } catch (e) {
    console.error("Decryption failed:", e.message);
  }
})();
