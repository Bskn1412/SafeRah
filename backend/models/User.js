import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  // 2FA Fields
twoFactorSecret: {
  cipherText: { type: String },
  nonce: { type: String }
},
twoFactorEnabled: { type: Boolean, default: false },


  // Recovery (for dual-encryption)
  recovery: {
    wrappedMasterKey: String,
    nonce: String,
    salt: String,
    enabled: { type: Boolean, default: false }
  },
  // Vault Key Fields
  encryptedMasterKey: { type: String, default: null },
  masterNonce: { type: String, default: null },
  argonSalt: { type: String, default: null },
  encryptedX25519Priv: { type: String, default: null },
  x25519PrivNonce: { type: String, default: null },
  publicKey: { type: String, default: null },
}, { timestamps: true });

export default mongoose.model("User", userSchema);