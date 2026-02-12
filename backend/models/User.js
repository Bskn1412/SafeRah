import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },

  email: {
    type: String,
    required: true,
    lowercase: true
  },

  passwordHash: { type: String, required: true },

  // Account Lifecycle
  accountStatus: {
    type: String,
    enum: ["pending", "active", "suspended", "deleted"],
    default: "pending"
  },

  signupStage: {
    type: String,
    enum: [
      "email_pending",
      "email_verified",
      "recovery_pending",
      "mfa_pending",
      "complete"
    ],
    default: "email_pending"
  },

  deletedAt: { type: Date, default: null },
  verificationExpiresAt: Date,

  // Email Verification
  otp: String,
  otpExpiresAt: Date,
  isVerified: { type: Boolean, default: false },

  // 2FA
  twoFactorSecret: {
    cipherText: String,
    nonce: String
  },
  twoFactorEnabled: { type: Boolean, default: false },

  // Recovery
  recovery: {
    wrappedMasterKey: String,
    nonce: String,
    salt: String,
    enabled: { type: Boolean, default: false }
  },

  // Vault Keys (generate AFTER verification)
  encryptedMasterKey: String,
  masterNonce: String,
  argonSalt: String,
  encryptedX25519Priv: String,
  x25519PrivNonce: String,
  publicKey: String,

}, { timestamps: true });

userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);


export default mongoose.model("User", userSchema);