// backend/controllers/authController.js
import User from "../models/User.js";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { createAuthenticatorSecret, verifyAuthenticator } from "../utils/authenticator.js";
import { generateRecoveryPhrase, wrapMasterKey } from "../utils/recovery.js";

// Registration + auto-login
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already registered" });

    const passwordHash = await argon2.hash(password);
    const user = await User.create({ name, email, passwordHash });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d"
    });

    // ✅ SET COOKIE (THIS WAS MISSING)
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    });

    res.json({ message: "Registered successfully!" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};



// Login (Unchanged)
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid email or password" });

    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    });

    res.json({
      message: "Login successful",
      user: { name: user.name, email: user.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Setup 2FA (QR Generation) - Called post-registration
// backend/controllers/authController.js
export const setup2FA = async (req, res) => {
  try {
    // user identity must come from JWT, not request body
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: "2FA already enabled" });
    }

    const { encryptedSecret, otpauth } =
      await createAuthenticatorSecret(user.email);

    user.twoFactorSecret = encryptedSecret;
    await user.save();

    res.json({
      otpauthUri: otpauth,
      message: "Scan QR and verify code"
    });
  } catch (err) {
    console.error("setup2FA error:", err);
    res.status(500).json({ message: "2FA setup failed" });
  }
};

// Verify 2FA Setup
export const verify2FASetup = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id);

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ message: "2FA not initialized" });
    }

    const isValid = await verifyAuthenticator(
      user.twoFactorSecret,
      user.email,
      token
    );

    if (!isValid) {
      return res.status(400).json({ message: "Invalid code" });
    }

    user.twoFactorEnabled = true;
    await user.save();

    res.json({ message: "2FA enabled successfully" });
  } catch (err) {
    console.error("verify2FASetup error:", err);
    res.status(500).json({ message: "Verification failed" });
  }
};

// Forgot Password - Step 1: Strict Email Check
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      // Always respond vaguely for security
      return res.json({
        next: "EMAIL_NOT_FOUND",
        message: "If the account exists, you will receive instructions."
      });
    }

    if (!user.twoFactorEnabled) {
      // User does not have 2FA enabled
      return res.json({
        next: "RESET_ALLOWED",
        message: "Enter new password to reset your vault."
      });
    }

    // User has 2FA enabled → require TOTP
    res.json({
      next: "TOTP_REQUIRED",
      message: "Enter 6-digit code from your authenticator app."
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};



// Verify TOTP (for Forgot/Recovery) - Unchanged
// backend/controllers/authController.js
export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !user.twoFactorSecret || !user.recovery?.enabled) {
      return res.status(403).json({
        message: "Recovery not enabled for this account"
      });
    }

    const isValid = await verifyAuthenticator(user.twoFactorSecret, user.email, otp);

    if (isValid) {
      const recoveryToken = jwt.sign(
        { uid: user._id, purpose: "recovery" },
        process.env.JWT_SECRET,
        { expiresIn: "5m" }
      );

      res.json({ recoverySession: recoveryToken, verificationStatus: "success" });
    } else {
      res.status(401).json({ message: "Invalid code", verificationStatus: "failure" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Verification error" });
  }
};


// Recovery Metadata (Unchanged)
export const recoveryMetadata = async (req, res) => {
  const user = await User.findById(req.user.id).select("recovery");

  if (!user?.recovery?.enabled) {
    return res.status(400).json({ message: "Recovery not enabled" });
  }

  res.json({
    wrappedMasterKey: user.recovery.wrappedMasterKey,
    nonce: user.recovery.nonce,
    salt: user.recovery.salt
  });
};


// Reset Password (Unchanged)
export const resetPassword = async (req, res) => {
  const { newPassword, newWrappedMasterKey, newSalt, newNonce } = req.body;

  // 🔐 JWT MUST be recovery token
  if (req.user.purpose !== "recovery") {
    return res.status(403).json({ message: "Invalid recovery session" });
  }

  const user = await User.findById(req.user.uid);
  if (!user) return res.sendStatus(404);

  user.passwordHash = await argon2.hash(newPassword);

  user.recovery.wrappedMasterKey = newWrappedMasterKey;
  user.recovery.salt = newSalt;
  user.recovery.nonce = newNonce;

  await user.save();
  res.json({ message: "Password reset successful" });
};

// Enable Recovery (New)
export const enableRecovery = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.sendStatus(404);

  if (user.recovery?.enabled) {
    return res.status(400).json({
      message: "Recovery already enabled"
    });
  }

  const { wrappedMasterKey, nonce, salt } = req.body;

  user.recovery = {
    enabled: true,
    wrappedMasterKey,
    nonce,
    salt
  };

  await user.save();
  res.json({ message: "Recovery enabled successfully" });
};


// Get Current User Info (Unchanged)
export const me = async (req, res) => {
  const user = await User.findById(req.user.id).select(
    "name email recovery.enabled"
  );

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({
    name: user.name,
    email: user.email,
    recoveryEnabled: !!user.recovery?.enabled
  });
};
