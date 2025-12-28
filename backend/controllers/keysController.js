// backend/controllers/keysController.js
import User from "../models/User.js";

export const getKeys = async (req, res) => {
  const user = await User.findById(req.user.id).select(
    "encryptedMasterKey masterNonce argonSalt encryptedX25519Priv x25519PrivNonce publicKey"
  );

  if (!user || !user.encryptedMasterKey) {
    return res.json({ hasKeys: false });
  }

  res.json({
    hasKeys: true,
    encryptedMasterKey: user.encryptedMasterKey,
    masterNonce: user.masterNonce,
    argonSalt: user.argonSalt,
    encryptedX25519Priv: user.encryptedX25519Priv,
    x25519PrivNonce: user.x25519PrivNonce,
    publicKey: user.publicKey
  });
};

export const storeKeys = async (req, res) => {
  const userId = req.user.id;
  const {
    encryptedMasterKey,
    masterNonce,
    argonSalt,
    encryptedX25519Priv,
    x25519PrivNonce,
    publicKey
  } = req.body;

  const updated = await User.findByIdAndUpdate(
    userId,
    {
      encryptedMasterKey,
      masterNonce,
      argonSalt,
      encryptedX25519Priv,
      x25519PrivNonce,
      publicKey
    },
    {
      new: true,        // return updated doc
      runValidators: true, // enforce schema
      upsert: false        // don't auto-create new user (keep false)
    }
  );

  if (!updated) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({ message: "Keys stored", hasKeys: true });
};
