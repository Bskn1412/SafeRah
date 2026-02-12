// frontend/src/crypto/rotateVaultPassword.js

import { getSodium } from "./sodium";
import { deriveKeyFromPassword } from "./argon";

export async function rotateVaultPassword(masterKey, newPassword) {
  const sodium = await getSodium();

  const { key: passwordKey, salt } =
    await deriveKeyFromPassword(newPassword);

  const masterNonce = sodium.randombytes_buf(
    sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
  );

  const encryptedMasterKey =
    sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      masterKey,
      null,
      null,
      masterNonce,
      passwordKey
    );

  return {
    encryptedMasterKey: sodium.to_base64(encryptedMasterKey),
    masterNonce: sodium.to_base64(masterNonce),
    argonSalt: sodium.to_base64(salt),
  };
}
