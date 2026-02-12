"use client";

import { useState } from "react";
import { Mail, KeyRound, Shield, CheckCircle, Copy } from "lucide-react";
import { api } from "../api";
import { unwrapWithRecovery, rewrapWithPassword, wrapMasterKeyWithRecovery } from "../crypto/recovery";

import { rotateVaultPassword } from "../crypto/rotateVaultPassword";

import { lockVault } from "../crypto/vault";

import { toast } from "react-toastify";
import "../global.css";

import OTPInput from "./OtpInput"; 

export default function ForgotPassword() {
  const [step, setStep] = useState("EMAIL");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [phrase, setPhrase] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
 
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryMeta, setRecoveryMeta] = useState(null);
  const [sessionToken, setSessionToken] = useState(""); // single token state

  const getToken = () => sessionToken?.trim(); // helper

    const notify = {
    success: (msg) => toast.success(msg),
    error: (msg) => toast.error(msg),
    info: (msg) => toast.info(msg),
  };


  const submitEmail = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await api.post("/auth/forgot-password", { email: email.toLowerCase().trim() });

      if (res.data.next === "TOTP_REQUIRED") {
        setStep("TOTP");
        notify.info("Enter your authenticator code");
      } else if (res.data.next === "RECOVERY_PHRASE") {
        const recoveryToken = res.data.sessionToken?.trim();
        if (!recoveryToken) throw new Error("No session token received");

        setSessionToken(recoveryToken);

        const metaRes = await api.get("/auth/recovery-metadata", {
          
          headers: { Authorization: `Bearer ${recoveryToken}` },
        });

        setRecoveryMeta(metaRes.data);
        setStep("PHRASE");
        notify.info("Enter your recovery phrase");
      } else {
        notify.info(res.data.message);
      }
    } catch (err) {
      notify.error(
        err.response?.data?.message ||
        "Email not found or recovery not enabled"
      );

    } finally {
      setIsLoading(false);
    }
  };

  const submitOtp = async (e) => {
  e.preventDefault();
  setIsLoading(true);

  // 1️⃣ Sanitize OTP: remove non-digits and trim
  const sanitizedOtp = otp.trim().replace(/\D/g, "");

  // 2️⃣ Validate length
  if (sanitizedOtp.length !== 6) {
    notify.error("OTP must be exactly 6 digits");
    setIsLoading(false);
    return;
  }

  try {
    const res = await api.post("/auth/forgot-password/verify", {
      email: email.trim().toLowerCase(),
      otp: sanitizedOtp,
    });

    if (res.data.verificationStatus !== "success") {
      throw new Error("Invalid code");
    }

    const recoveryToken = res.data.recoverySession?.trim();
    if (!recoveryToken) throw new Error("No recovery session token received");

    setSessionToken(recoveryToken);

    const metaRes = await api.get("/auth/recovery-metadata", {
      headers: { Authorization: `Bearer ${recoveryToken}` },
    });

    setRecoveryMeta(metaRes.data);
    setStep("PHRASE");
    notify.success("Code verified. Enter your recovery phrase.");

  } catch (err) {
    notify.error(err.response?.data?.message || err.message || "Invalid authenticator code");
  } finally {
    setIsLoading(false);
  }
};
   

  const submitPhrase = async (e) => {
    e.preventDefault();
    if (phrase.trim().split(/\s+/).length !== 12) {
      notify.error("Recovery phrase must be exactly 12 words");
      return;
    }

    setIsLoading(true);

    try {
      await unwrapWithRecovery(
        phrase.trim(),
        recoveryMeta.wrappedMasterKey,
        recoveryMeta.nonce
      );
      setStep("NEW_PASSWORD");
      notify.success("Recovery phrase accepted! Set your new password.");
    } catch (err) {
      notify.error("Invalid recovery phrase");
    } finally {
      setIsLoading(false);
    }
  };

  const submitNewPassword = async (e) => {
  e.preventDefault();

  if (newPassword.length < 8) {
    notify.error("Password must be at least 8 characters");
    return;
  }
  if (newPassword !== confirmPassword) {
    notify.error("Passwords do not match");
    return;
  }

  const token = getToken();
  if (!token) {
    notify.error("Session expired — please start over");
    return;
  }

  setIsLoading(true);


  try {
    const masterKey = await unwrapWithRecovery(
      phrase.trim(),
      recoveryMeta.wrappedMasterKey,
      recoveryMeta.nonce
    );

    console.log("Unwrapped masterKey (length):", masterKey.length); // Debug

    // 1️⃣ rewrap for VAULT
    const vaultWrap = await rotateVaultPassword(masterKey, newPassword);
    console.log("New vault wrap:", vaultWrap); // Debug new wrap

    // 2️⃣ rewrap for RECOVERY
    const recoveryWrap = await wrapMasterKeyWithRecovery(
      masterKey,
      phrase.trim()
    );

    await api.post(
      "/auth/forgot-password/reset",
      {
        newPassword,
        encryptedMasterKey: vaultWrap.encryptedMasterKey,
        masterNonce: vaultWrap.masterNonce,
        argonSalt: vaultWrap.argonSalt,

        
        // recovery stays unchanged
        newWrappedMasterKey: recoveryWrap.wrappedMasterKey,
        newSalt: recoveryWrap.salt,
        newNonce: recoveryWrap.nonce,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setStep("SUCCESS");
    notify.success("Password reset successful! Redirecting to login...");

    lockVault();

    setTimeout(() => {
      window.location.href = "/login";
    }, 3000);
  } catch (err) {
    console.error("Reset error:", err.response || err);
    notify.error(
      err.response?.data?.message ||
      "Failed to reset password. Please check your recovery phrase and try again."
    );
  } finally {
    setIsLoading(false);
  }
};



// const copyPhrase = () => {
//   navigator.clipboard.writeText(phrase);
//   notify.success("Copied to clipboard!");
//   setTimeout(() => notify.clear(), 2000);
// };


return (
    <div className="min-h-screen flex flex-col md:flex-row items-center justify-between bg-black px-8 md:px-16 gap-10">

        {/* Image Section */}
        <div className="flex items-center justify-center bg-linear-to-br from-sky-400 to-cyan-500 p-10 rounded-3xl shadow-xl">
          <div className="relative">
            {/* Glow */}
            <div className="absolute inset-0 bg-white/30 blur-3xl rounded-full" />

              {/* Image */}
              <img
                src="/forgot.png"
                alt="Forgot Password Illustration"
                className="relative max-w-base w-full md:h-auto rounded-2xl "
              />
          </div>
        </div>


        <div className="w-full md:w-2/3 lg:w-1/2 max-w-xl mx-auto">

          <div className="bg-black/40 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-8 shadow-2xl shadow-cyan-500/20 min-h-[500px]">
         <div className="text-center mb-10">
          <h1
            className={`font-extrabold tracking-tight text-white
              ${step === "EMAIL" ? "text-4xl md:text-5xl" : "text-2xl md:text-3xl"}
            `}
            >
            {step === "EMAIL" && "Forgot Password"}
            {step === "TOTP" && "Verify Authenticator"}
            {step === "PHRASE" && "Recovery Phrase"}
            {step === "NEW_PASSWORD" && "Set New Password"}
            {step === "SUCCESS" && "Success!"}
          </h1>

          {step === "EMAIL" && (
            <p className="mt-5 text-slate-300 text-sm md:text-base">
              Don’t worry — we’ll help you get back in securely.
            </p>
          )}
        </div>

         

          <form onSubmit={
            step === "EMAIL" ? submitEmail :
            step === "TOTP" ? submitOtp :
            step === "PHRASE" ? submitPhrase :
            step === "NEW_PASSWORD" ? submitNewPassword :
            null
          } className="space-y-6">

            {step === "EMAIL" && (
              <div className="relative">
                <Mail className="absolute left-18 top-3/4 -translate-y-1/2 text-emerald-400 w-5 h-5" />
                <input
                  type="email"
                  placeholder="Your registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-13 ml-15 w-3/4 pl-12 pr-4 py-3 bg-black/20 border border-cyan-500/30 rounded-lg text-white placeholder-white/30 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition"
                />
              </div>
            )}

           {step === "TOTP" && (
              <div className="flex flex-col items-center gap-4">
                <p className="text-center text-gray-400 text-sm mb-2.5">
                  Enter the 6-digit code from your authenticator app to verify your identity.
                </p>
                {/* <KeyRound className="text-emerald-400 w-6 h-6" /> */}
                <OTPInput
                  otp={otp}
                  setOtp={setOtp}
                  disabled={isLoading}
                  onComplete={submitOtp} // auto-submit when all 6 digits filled
                />
              </div>
            )}


           {step === "PHRASE" && (
              <>
              <textarea
                placeholder="Enter your 12-word recovery phrase (space-separated)"
                value={phrase}
                rows={4}
                required
                onChange={(e) => {
                  // normalize while typing (optional but safe)
                  const cleaned = e.target.value.replace(/\s+/g, " ");
                  setPhrase(cleaned);
                }}
                onPaste={(e) => {
                  e.preventDefault();

                  const pastedText = e.clipboardData.getData("text");

                  // 🔑 Normalize pasted content (PDF-safe)
                  const normalized = pastedText
                    .trim()
                    .replace(/\s+/g, " "); // replaces newlines, tabs, multiple spaces

                  setPhrase(normalized);
                }}
                className="w-full p-4 bg-black/20 border border-cyan-500/30 rounded-lg
                  text-orange-300 placeholder-white/30
                  focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30
                  transition font-sans text-base tracking-wide"
              />

              {/* Optional helper */}
              <p className="mt-2 text-xs text-slate-300 text-center">
                Tip: You can paste directly from a PDF — formatting will be fixed automatically.
              </p>
              </>
            )}

            {step === "NEW_PASSWORD" && (
              <>
                <input
                  type="password"
                  placeholder="New password (min 8 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="ml-15 mb-10 w-3/4 px-4 py-3 bg-black/20 border border-cyan-500/30 rounded-lg text-white placeholder-white/30 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition"
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="ml-15 w-3/4 mb-15 px-4 py-3 bg-black/20 border border-cyan-500/30 rounded-lg text-white placeholder-white/30 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition"
                />
              </>
            )}

            {step === "SUCCESS" && (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-16 w-16 text-emerald-500 mb-4" />
                <p className="text-white text-lg">Password reset complete!</p>
                <p className="text-gray-400 text-sm mt-2">Redirecting to login...</p>
              </div>
            )}

            {step !== "SUCCESS" && (
              <button
                type="submit"
                disabled={isLoading}
                className="ml-15 w-3/4 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-bold rounded-lg disabled:opacity-50 hover:shadow-lg hover:shadow-emerald-500/50 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? "Processing..." :
                 step === "EMAIL" ? "Continue" :
                 step === "TOTP" ? "Verify Code" :
                 step === "PHRASE" ? "Verify Phrase" :
                 "Reset Password"}
              </button>
            )}
          </form>

          <div className="text-center mt-6">
            <button
              onClick={() => window.location.href = "/login"}
              className="text-gray-400 hover:text-emerald-400 text-sm underline transition cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}