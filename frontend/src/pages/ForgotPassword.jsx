// frontend/src/pages/ForgotPassword.jsx

"use client";

import { useState } from "react";
import { Mail, KeyRound, Shield } from "lucide-react";
import { api } from "../api";
 import { unwrapWithRecovery, rewrapWithPassword } from "../crypto/recovery";
 
export default function ForgotPassword() {
  const [step, setStep] = useState("EMAIL"); // EMAIL, TOTP, RESET
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState(null);

  const [phrase, setPhrase] = useState("");
  const [recoveryMeta, setRecoveryMeta] = useState(null);


  const submitEmail = async (e) => {
  e.preventDefault();
  setIsLoading(true);
  setMsg(null);

  try {
    const res = await api.post("/auth/forgot-password", { email: email.toLowerCase() });

    switch (res.data.next) {
      case "TOTP_REQUIRED":
        setStep("TOTP");
        setMsg({ type: "success", text: res.data.message });
        break;
      case "RESET_ALLOWED":
        setStep("PHRASE"); // skip TOTP
        setMsg({ type: "success", text: res.data.message });
        // fetch recovery metadata here if needed
        const meta = await api.get("/auth/recovery-metadata");
        setRecoveryMeta(meta.data);
        break;
      default:
        setMsg({ type: "error", text: res.data.message });
    }
  } catch (err) {
    setMsg({ type: "error", text: err.response?.data?.message || "Something went wrong." });
  } finally {
    setIsLoading(false);
  }
};






const submitOtp = async (e) => {
  e.preventDefault();
  setIsLoading(true);
  setMsg(null);

  try {
    const res = await api.post("/auth/forgot-password/verify", { email, otp });

    if (res.data.verificationStatus === "success") {
      setRecoveryToken(res.data.recoverySession);

      // attach recovery token
      api.defaults.headers.common["Authorization"] =
        `Bearer ${res.data.recoverySession}`;

      // NOW fetch metadata
      const meta = await api.get("/auth/recovery-metadata");
      setRecoveryMeta(meta.data);

      setStep("PHRASE");
    }
  } catch (err) {
    setMsg({ type: "error", text: "Invalid code" });
  } finally {
    setIsLoading(false);
  }
};


const submitReset = async (e) => {
  e.preventDefault();
  setIsLoading(true);
  setMsg(null);

  try {
    // 1️⃣ Unwrap master key using recovery phrase
    const masterKey = await unwrapWithRecovery(
      phrase,
      recoveryMeta.wrappedMasterKey,
      recoveryMeta.nonce,
      recoveryMeta.salt
    );

    // 2️⃣ Rewrap master key with NEW password
    const wrapped = await rewrapWithPassword(
      masterKey,
      newPassword
    );

    // 3️⃣ Send to server
   await api.post("/auth/forgot-password/reset", {
    email,
    newPassword,
    newWrappedMasterKey: wrapped.wrappedMasterKey,
    newSalt: wrapped.salt,
    newNonce: wrapped.nonce
  });


    setMsg({ type: "success", text: "Password reset successful" });
    setTimeout(() => window.location.href = "/login", 2000);

  } catch (err) {
    setMsg({ type: "error", text: "Recovery phrase incorrect" });
  } finally {
    setIsLoading(false);
  }
};

  const getStepContent = () => {
    switch (step) {
      case "EMAIL":
        return (
          <div className="space-y-2">
            <input
              type="email"
              placeholder="Enter your registered email"
              className="w-full p-3 rounded bg-black/20 text-white border border-gray-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="text-xs text-gray-400">Must be registered with 2FA enabled.</p>
          </div>
        );
      case "TOTP":
        return (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="6-digit code from authenticator"
              maxLength={6}
              className="w-full p-3 rounded bg-black/20 text-white border border-gray-600 text-center text-lg"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              required
            />
            <p className="text-xs text-gray-400">Open your authenticator app.</p>
          </div>
        );
      case "RESET":
        return (
          <div className="space-y-2">
            <input
              type="password"
              placeholder="New strong password (min 8 chars)"
              className="w-full p-3 rounded bg-black/20 text-white border border-gray-600"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
            <p className="text-xs text-gray-400">This will re-encrypt your vault.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <form
        onSubmit={
          step === "EMAIL" ? submitEmail :
          step === "TOTP" ? submitOtp :
          step === "RESET" ? submitReset : null
        }
        className="bg-black/40 p-8 rounded-xl space-y-6 w-full max-w-md"
      >
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-emerald-500 mb-4" />
          <h1 className="text-2xl text-white font-bold">
            {step === "EMAIL" ? "Forgot Password?" :
             step === "TOTP" ? "Enter Authenticator Code" :
             "Set New Password"}
          </h1>
        </div>

        {getStepContent()}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-emerald-500 text-black rounded font-semibold disabled:opacity-50"
        >
          {isLoading ? "Processing..." :
           step === "EMAIL" ? "Continue" :
           step === "TOTP" ? "Verify Code" :
           "Reset Password"}
        </button>

        {msg && (
          <p className={`text-center text-sm ${msg.type === "error" ? "text-red-400" : "text-emerald-400"}`}>
            {msg.text}
          </p>
        )}

        <button
          type="button"
          onClick={() => window.location.href = "/login"}
          className="w-full py-2 text-gray-400 text-sm underline"
        >
          Back to Login
        </button>
      </form>
    </div>
  );
}