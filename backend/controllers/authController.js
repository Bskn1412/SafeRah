// backend/controllers/authController.js
import User from "../models/User.js";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { createAuthenticatorSecret, verifyAuthenticator } from "../utils/authenticator.js";
import { sendOtpEmail, generateOtp } from "../email-test.js";

// Registration + auto-login
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        code: "MISSING_FIELDS",
        message: "All fields are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        code: "WEAK_PASSWORD",
        message: "Password must be at least 8 characters long",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    let existingUser = await User.findOne({ email: normalizedEmail });

    /* ================= HANDLE EXISTING USER ================= */

    if (existingUser) {

      // Already fully verified → block
      if (existingUser.isVerified) {
        return res.status(400).json({
          code: "EMAIL_EXISTS",
          message: "Email already registered",
        });
      }

      // Not verified → check expiry (24h cleanup rule)
      const isExpired =
        Date.now() - existingUser.createdAt.getTime() >
        24 * 60 * 60 * 1000;

      if (isExpired) {
        await User.deleteOne({ _id: existingUser._id });
      } else {
        // Regenerate OTP & resend
        const otp = generateOtp();
        existingUser.otp = otp;
        existingUser.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await existingUser.save();

        await sendOtpEmail(existingUser.email, otp);

        return res.json({
          message: "Verification email re-sent.",
          requiresVerification: true,
        });
      }
    }

    /* ================= CREATE NEW USER ================= */

    const passwordHash = await argon2.hash(password);

    const otp = generateOtp();

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      otp,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      isVerified: false,
    });

    await sendOtpEmail(user.email, otp);

    return res.json({
      message: "Registered successfully! Please verify your email.",
      requiresVerification: true,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      code: "SERVER_ERROR",
      message: "Server error",
    });
  }
};


// Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        code: "MISSING_FIELDS",
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        code: "INVALID_CREDENTIALS",
        message: "Email not found in our records!",
      });
    }

    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) {
      return res.status(401).json({
        success: false,
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.json({
      success: true,
      message: "Login successful",
      user: {
        name: user.name,
        email: user.email,
      },
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      code: "SERVER_ERROR",
      message: "Something went wrong. Please try again later.",
    });
  }
};

// Setup 2FA (QR Generation) - Called post-registration
export const setup2FA = async (req, res) => {
  try {
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


    console.log("req.user:", req.user);


    console.log("User from DB:", user);
    console.log("twoFactorSecret:", user?.twoFactorSecret);


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

// Forgot Password - Step 1: Email Check
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Security best practice: Always respond the same way whether user exists or not
    if (!user) {
      return res.json({
        next: "CHECK_INBOX",
        message: "The Email is not registered with us.",
      });
    }

    // Check if recovery is enabled at all
    if (!user.recovery?.enabled) {
      return res.json({
        next: "RECOVERY_NOT_ENABLED",
        message: "Recovery is not set up for this account.",
      });
    }

    // Decide next step based on 2FA status
    if (user.twoFactorEnabled) {
      return res.json({
        next: "TOTP_REQUIRED",
        message: "Enter the 6-digit code from your authenticator app.",
      });
    } else {
      // No 2FA → go directly to recovery phrase, issue recovery token
      const recoveryToken = jwt.sign(
        { userId: user._id, purpose: "recovery" }, // must be userId
        process.env.RECOVERY_SECRET,              // 🔑 important
        { expiresIn: "5m" }
      );
      return res.json({
        next: "RECOVERY_PHRASE",
        sessionToken: recoveryToken,
        message: "Enter your 12-word recovery phrase to continue.",
      });
    }
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Verify TOTP (for Forgot/Recovery) - Unchanged
export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  console.log("Verify OTP called with:", { email, otp }); // ← Log input

  try {
    const user = await User.findOne({ email });
    if (!user || !user.twoFactorSecret || !user.recovery?.enabled) {
      return res.status(403).json({ message: "Recovery not enabled for this account" });
    }

    const isValid = await verifyAuthenticator(user.twoFactorSecret, user.email, otp);
    console.log("TOTP valid?", isValid); // ← Log result

    if (isValid) {
        const recoveryToken = jwt.sign(
        { userId: user._id, purpose: "recovery" },
        process.env.RECOVERY_SECRET,
        { expiresIn: "5m" }
     );
      console.log("Recovery token generated (first 30 chars):", recoveryToken.substring(0, 30) + "...");

      res.json({ recoverySession: recoveryToken, verificationStatus: "success" });

    } else {
      res.status(401).json({ message: "Invalid code", verificationStatus: "failure" });
    }
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ message: "Verification error" });
  }
};



// Recovery Metadata - Accepts both login and recovery tokens
// backend/controllers/authController.js
export const recoveryMetadata = async (req, res) => {
  console.log("RECOVERY METADATA CONTROLLER HIT", req.userId);

  // resetAuth already verified the token
  // and attached req.userId
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: "Invalid auth context" });
  }

  const user = await User.findById(userId).select("recovery");

  if (!user?.recovery?.enabled) {
    return res.status(400).json({ message: "Recovery not enabled" });
  }

  // ✅ ONE response, at the end
  return res.json({
    wrappedMasterKey: user.recovery.wrappedMasterKey,
    nonce: user.recovery.nonce,
    salt: user.recovery.salt,
  });
};



// Reset Password (Unchanged)
// Reset Password
export const resetPassword = async (req, res) => {
  const {
    newPassword,
    encryptedMasterKey,
    masterNonce,
    argonSalt,
   
    newWrappedMasterKey,
    newSalt,
    newNonce
  } = req.body;

  const userId = req.userId;
  if (!userId) {
    return res.status(403).json({ message: "Invalid recovery session" });
  }

  const user = await User.findById(userId);
  if (!user) return res.sendStatus(404);

  console.log("Resetting password for user:", user.email);
  console.log("New password length:", newPassword.length);

  user.passwordHash = await argon2.hash(newPassword);

  // Update vault keys
  user.encryptedMasterKey = encryptedMasterKey;
  user.masterNonce = masterNonce;
  user.argonSalt = argonSalt;
  // user.encryptedX25519Priv = encryptedX25519Priv;
  // user.x25519PrivNonce = x25519PrivNonce;

  // Update recovery
  user.recovery.wrappedMasterKey = newWrappedMasterKey;
  user.recovery.salt = newSalt;
  user.recovery.nonce = newNonce;

  await user.save();
  console.log("User vault keys updated:", {
    encryptedMasterKey,
    masterNonce,
    argonSalt
  });

  console.log("Password reset successful for user:", user.email);

  return res.json({ message: "Password and vault keys updated successfully" });
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





export const verifyRecoveryPhrase = async (req, res) => {
  try {
    const { userId } = req; // set by recoveryAuth
    // at this point: recovery phrase is ALREADY verified cryptographically

    // 🔑 ISSUE RESET TOKEN HERE
    const resetToken = jwt.sign(
      {
        userId,
        purpose: "password_reset"
      },
      process.env.RESET_SECRET,
      { expiresIn: "5m" }
    );

    return res.status(200).json({
      message: "Recovery phrase verified",
      resetToken
    });
  } catch (err) {
    console.error("Recovery phrase verification failed:", err);
    return res.status(400).json({ message: "Invalid recovery phrase" });
  }
};

// Email verification 
export const verifyEmail = async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ code: "INVALID_OTP" });
  }

  if (user.isVerified) {
    return res.json({ message: "Already verified" });
  }

  if (!user.otpExpiresAt || user.otpExpiresAt < Date.now()) {
    return res.status(400).json({ code: "OTP_EXPIRED" });
  }

  if (user.otp !== otp) {
    return res.status(400).json({ code: "INVALID_OTP" });
  }

  // Mark verified
  user.isVerified = true;
  user.otp = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  // ✅ Issue JWT after verification
  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  res.json({
    message: "Email verified successfully",
    token, // optional if frontend wants to read
  });
};


// Resend OTP
export const resendOtp = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  // Always respond success (prevent leaking valid emails)
  if (!user || user.isVerified) {
    return res.json({ message: "If the email exists, OTP was resent" });
  }

  // Rate limiting: prevent frequent resend abuse
  const now = Date.now();
  if (user.otpLastSentAt && now - user.otpLastSentAt.getTime() < 60 * 1000) {
    // Optional: send back info for UX
    return res.status(429).json({
      code: "TOO_SOON",
      message: "Please wait a moment before requesting a new code",
    });
  }

  const otp = generateOtp(); // your existing function

  // Save OTP securely
  user.otp = otp;
  user.otpExpiresAt = new Date(now + 10 * 60 * 1000); // 10 min validity
  user.otpLastSentAt = new Date(now);
  user.otpAttempts = 0; // reset attempts if you track

  await user.save();

  // Send email
  await sendOtpEmail(user.email, otp);

  res.json({ message: "If the email exists, OTP was resent" });
};
