import { getSodium } from "./sodium";

export async function rewrapMasterKey(
  phrase,
  wrappedMasterKey,
  nonce,
  salt,
  newPassword
) {
  const sodium = await getSodium();

  const recoveryKey = sodium.crypto_pwhash(
    sodium.crypto_secretbox_KEYBYTES,
    phrase,
    sodium.from_base64(salt),
    sodium.crypto_pwhash_OPSLIMIT_MODERATE,
    sodium.crypto_pwhash_MEMLIMIT_MODERATE,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  );

  const masterKey = sodium.crypto_secretbox_open_easy(
    sodium.from_base64(wrappedMasterKey),
    sodium.from_base64(nonce),
    recoveryKey
  );

  // now wrap masterKey with NEW password (ensureKeys flow)
  return masterKey;
}
