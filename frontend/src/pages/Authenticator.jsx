"use client";

import { useState, useRef, useEffect } from "react";
import { Shield, ArrowRight, Check, Copy as CopyIcon } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { api } from "../api";

export default function Authenticator() {
  const [step, setStep] = useState("INIT"); // INIT → VERIFY → DONE
  const [qrUri, setQrUri] = useState("");
  const [setupKey, setSetupKey] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [msg, setMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const inputRefs = useRef([]);

  /* ---------------------------------- */
  /* Auto start setup on page load       */
  /* ---------------------------------- */
  useEffect(() => {
    startSetup();
  }, []);

  /* ---------------------------------- */
  /* Start 2FA Setup                     */
  /* ---------------------------------- */
  const startSetup = async () => {
    setIsLoading(true);
    setMsg(null);

    try {
      const res = await api.post("/auth/2fa/setup");
      const uri = res.data.otpauthUri;

      setQrUri(uri);

      const parsed = new URL(uri);
      const secret = parsed.searchParams.get("secret");
      setSetupKey(secret || "");

      setStep("VERIFY");
    } catch {
      setMsg({ type: "error", text: "Failed to generate authenticator QR" });
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------------------------------- */
  /* OTP Handling                        */
  /* ---------------------------------- */
  const handleOtpChange = (index, value) => {
    if (/\D/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  /* ---------------------------------- */
  /* Verify OTP                          */
  /* ---------------------------------- */
  const verifyOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMsg(null);

    try {
      const code = otp.join("");
      await api.post("/auth/2fa/verify-setup", { token: code });

      setStep("DONE");
      setMsg({ type: "success", text: "Authenticator enabled successfully!" });
    } catch {
      setMsg({ type: "error", text: "Invalid authentication code" });
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------------------------------- */
  /* Helpers                             */
  /* ---------------------------------- */
  const copySetupKey = () => {
    navigator.clipboard.writeText(setupKey);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const goToLogin = () => {
    window.location.href = "/login";
  };

  /* ---------------------------------- */
  /* UI                                 */
  /* ---------------------------------- */
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-black overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-black to-emerald-500/20" />
      <div className="absolute inset-0 bg-[size:50px_50px] bg-[linear-gradient(0deg,transparent_24%,rgba(6,182,212,0.05)_25%,rgba(6,182,212,0.05)_26%,transparent_27%)]" />

      {/* Toast */}
      {msg && (
        <div
          className={`fixed top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl backdrop-blur-xl font-semibold
            ${
              msg.type === "success"
                ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-black"
                : "bg-gradient-to-r from-red-500 to-pink-500 text-white"
            }`}
        >
          {msg.text}
        </div>
      )}

      {/* Card */}
      <div className="relative z-10 max-w-md w-full bg-black/40 border border-cyan-500/30 backdrop-blur-2xl rounded-2xl p-8 space-y-6 shadow-2xl shadow-cyan-500/20">

        {/* INIT */}
        {step === "INIT" && (
          <div className="text-center text-cyan-400 animate-pulse">
            Generating secure QR…
          </div>
        )}

        {/* VERIFY */}
        {step === "VERIFY" && qrUri && (
          <form onSubmit={verifyOtp} className="space-y-5 text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent animate-fade-in">Verify Authenticator</h1>
            <p className="text-emerald-400/70 text-sm">
              Scan the QR with your authenticator app
            </p>

            <div className="bg-white p-4 rounded-xl inline-block">
              <QRCodeCanvas value={qrUri} size={220} />
            </div>

            {setupKey && (
              <div className="space-y-2">
                <p className="text-sm text-cyan-400/80">
                  Or enter the key manually
                </p>
                <div className="flex items-center justify-between bg-black/20 border border-cyan-500/30 rounded-lg p-3">
                  <span className="font-mono text-sm text-white truncate">
                    {setupKey}
                  </span>
                  <button type="button" onClick={copySetupKey}>
                    {isCopied ? (
                      <Check className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <CopyIcon className="w-5 h-5 text-emerald-400 cursor-pointer" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm text-cyan-400/80 block text-left mb-2">
                Enter 6-digit code
              </label>
              <div className="flex gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    autoFocus={index === 0}
                    maxLength={1}
                    value={digit}
                    onChange={(e) =>
                      handleOtpChange(index, e.target.value)
                    }
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-full py-3 text-center bg-black/20 border border-cyan-500/30 rounded-lg text-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition"
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.join("").length !== 6}
              className="w-full py-3 rounded-lg font-semibold text-black bg-gradient-to-r from-cyan-500 to-emerald-500 disabled:opacity-50 cursor-pointer hover:opacity-90 transition-opacity"
            >
              {isLoading ? "Verifying…" : "Verify"}
            </button>
          </form>
        )}

        {/* DONE */}
        {step === "DONE" && (
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent animate-fade-in">Success!</h2>
            <Check className="mx-auto w-12 h-12 text-emerald-500" />
            <h2 className="text-xl text-white">Authenticator Enabled</h2>
            <p className="text-gray-400">
              Your account is now protected with 2FA.
            </p>
            <button
              onClick={goToLogin}
              className="w-full py-3 rounded-lg font-semibold text-black bg-gradient-to-r from-cyan-500 to-emerald-500 cursor-pointer hover:opacity-90 transition-opacity"
            >
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
