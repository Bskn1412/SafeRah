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
  enableRecovery,
  me
} from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

// Rate limit for verify (5 attempts/5min)
const verifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: "Too many attempts, try again later."
});

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// 2FA
router.post("/2fa/setup", authMiddleware, setup2FA);
router.post("/2fa/verify-setup", authMiddleware, verify2FASetup);

// Forgot password
router.post("/forgot-password", forgotPassword); // step 1: submit email
router.post("/forgot-password/reset", authMiddleware, resetPassword);
router.post("/forgot-password/verify", verifyLimiter, verifyOtp);

// Recovery (MUST be protected)
router.post("/enable-recovery", authMiddleware, enableRecovery);
router.get("/recovery-metadata", authMiddleware, recoveryMetadata);

// Get current user
router.get("/me", authMiddleware, me);

export default router;
