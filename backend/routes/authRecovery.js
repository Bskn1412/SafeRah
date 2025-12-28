// backend/routes/authRecovery.js
import express from "express";
import User from "../models/User.js";
import { authenticator } from "otplib";
import sodium from "libsodium-wrappers";

const router = express.Router();

// POST /auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  // Step 1 success → ask for OTP
  return res.json({
    step: "OTP_REQUIRED",
    message: "Enter authenticator code",
  });
});

// POST /auth/verify-otp
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res.status(400).json({ message: "Missing fields" });

  const user = await User.findOne({ email });
  if (!user || !user.twoFactorSecret)
    return res.status(404).json({ message: "2FA not enabled" });

  await sodium.ready;

  // 🔐 decrypt stored TOTP secret
  const secret = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    Buffer.from(user.twoFactorSecret.cipherText, "base64"),
    null,
    Buffer.from(user.twoFactorSecret.nonce, "base64"),
    Buffer.from(process.env.TWOFA_DERIVATION_KEY, "base64")
  );

  const isValid = authenticator.verify({
    token: otp,
    secret: Buffer.from(secret).toString(),
    window: 2,
  });

  if (!isValid)
    return res.status(401).json({ message: "Invalid authenticator code" });

  // Issue short-lived recovery token (NOT login token)
  const recoveryToken = crypto.randomUUID();

  user.recoverySession = {
    token: recoveryToken,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };
  await user.save();

  res.json({
    step: "RECOVERY_ALLOWED",
    recoveryToken,
    message: "Authenticator verified",
  });
});

export default router;
