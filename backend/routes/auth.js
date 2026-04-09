// backend/routes/auth.js

import express from "express";
import rateLimit from "express-rate-limit"; // npm i express-rate-limit
import {
  register,
  login,
  setup2FA,
  verify2FASetup,
  forgotPassword,
  verifyOtp,
  resetPassword,
  recoveryMetadata,

  verifyRecoveryPhrase,

  enableRecovery,
  me,

  verifyEmail,
  resendOtp,
  logout,

} from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

import { recoveryAuth } from "../middleware/recoveryAuth.js";

import { resetAuth } from "../middleware/resetAuth.js";

// Rate limit for verify (5 attempts/5min)
const verifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: "Too many attempts, try again later."
});

// Rate limit for login (10 attempts/15min)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts. Try again later.",
});

const router = express.Router();

router.post("/register", register);
router.post("/verifyEmail", verifyEmail);
router.post("/resend-otp", resendOtp);
router.post("/login", loginLimiter, login);

router.post("/logout", logout);

// 2FA
router.post("/2fa/setup", authMiddleware, setup2FA);
router.post("/2fa/verify-setup", authMiddleware, verify2FASetup);

// Forgot password
router.post("/forgot-password", forgotPassword); // step 1: submit email
router.post("/forgot-password/reset", resetAuth, resetPassword);
router.post("/forgot-password/verify",  verifyOtp);

router.post(
  "/forgot-password/verify-recovery",
  recoveryAuth,
  verifyRecoveryPhrase
);

// Recovery (MUST be protected)
router.post("/enable-recovery", authMiddleware, enableRecovery);
// Accept both normal and recovery tokens for recovery-metadata

router.get("/recovery-metadata", resetAuth, recoveryMetadata);

// Get current user
router.get("/me", authMiddleware, me);

export default router;
