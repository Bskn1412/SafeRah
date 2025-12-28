// frontend/src/pages/Authenticator.jsx
"use client";

import { useState } from "react";
import { api } from "../api";
import { Shield, ArrowRight, Check } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

export default function Authenticator() {
  const [step, setStep] = useState("INIT"); // INIT → VERIFY → DONE
  const [qrUri, setQrUri] = useState("");
  const [otp, setOtp] = useState("");
  const [msg, setMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const startSetup = async () => {
    setIsLoading(true);
    setMsg(null);
    try {
      const res = await api.post("/auth/2fa/setup");
      setQrUri(res.data.otpauthUri);
      setStep("VERIFY");
    } catch {
      setMsg({ type: "error", text: "Failed to generate QR" });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMsg(null);
    try {
      await api.post("/auth/2fa/verify-setup", { token: otp });
      setStep("DONE");
      setMsg({ type: "success", text: "Authenticator enabled successfully!" });
    } catch {
      setMsg({ type: "error", text: "Invalid code" });
    } finally {
      setIsLoading(false);
    }
  };

  const goToLogin = () => {
    window.location.href = "/login";
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center px-4 bg-black">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-black to-emerald-500/20 animate-gradient"></div>

      {/* Neon grid */}
      <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_24%,rgba(6,182,212,0.05)_25%,rgba(6,182,212,0.05)_26%,transparent_27%,transparent_74%,rgba(6,182,212,0.05)_75%,rgba(6,182,212,0.05)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(16,185,129,0.05)_25%,rgba(16,185,129,0.05)_26%,transparent_27%,transparent_74%,rgba(16,185,129,0.05)_75%,rgba(16,185,129,0.05)_76%,transparent_77%,transparent)] bg-[size:50px_50px]"></div>

      {/* Floating neon blobs */}
      <div className="absolute top-10 -left-20 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl mix-blend-screen animate-float"></div>
      <div className="absolute bottom-10 -right-20 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl mix-blend-screen animate-float-slow"></div>

      {/* Toast */}
      {msg && (
        <div
          className={`
            fixed top-8 left-1/2 -translate-x-1/2 z-50
            px-6 py-3 rounded-xl shadow-2xl backdrop-blur-xl
            text-sm font-semibold animate-fade-in-down
            ${
              msg.type === "success"
                ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-black"
                : "bg-gradient-to-r from-red-500 to-pink-500 text-white"
            }
          `}
        >
          {msg.text}
        </div>
      )}

      {/* Form */}
      <div className="relative z-10 max-w-md w-full">
        <div className="group">
          <div className=""></div>

          <div className="relative bg-black/40 border border-cyan-500/30 hover:border-emerald-500/50 backdrop-blur-2xl rounded-2xl p-8 space-y-6 shadow-2xl shadow-cyan-500/20 transition-all duration-300">
            
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent animate-fade-in">
                {step === "INIT" ? "Enable Authenticator" : step === "VERIFY" ? "Scan & Verify" : "Success!"}
              </h1>
              {step === "INIT" && <p className="text-emerald-400/70 text-sm">Optional but recommended for recovery</p>}
              {step === "VERIFY" && <p className="text-emerald-400/70 text-sm">Scan QR with your authenticator app</p>}
            </div>

            {step === "INIT" && (
              <button
                onClick={startSetup}
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-lg font-semibold text-black relative overflow-hidden group disabled:opacity-50 cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-500 animate-gradient"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition duration-500"></div>

                <div className="relative flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                      <span>Generating QR...</span>
                    </>
                  ) : (
                    <>
                      Enable 2FA
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </div>
              </button>
            )}

            {step === "VERIFY" && (
              <form onSubmit={verifyOtp} className="space-y-4 text-center">
                <div className="bg-white p-4 rounded-xl inline-block justify-center">
                  <QRCodeCanvas
                    value={qrUri}
                    size={220}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="H"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-cyan-400/80 block text-left">Enter 6-digit code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="w-full py-3 text-center bg-black/20 border border-cyan-500/30 hover:border-cyan-400/60 focus:border-emerald-400 rounded-lg text-white placeholder-white/30 focus:ring-2 focus:ring-emerald-400/30 transition"
                    placeholder="000000"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  className="w-full py-3 px-4 rounded-lg font-semibold text-black relative overflow-hidden group disabled:opacity-50 cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-500 animate-gradient"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition duration-500"></div>

                  <div className="relative flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        Verify
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </div>
                </button>
              </form>
            )}

            {step === "DONE" && (
              <div className="text-center space-y-4">
                <Check className="mx-auto h-12 w-12 text-emerald-500" />
                <h2 className="text-xl text-white">Authenticator Enabled!</h2>
                <p className="text-gray-400">Your account is now protected with 2FA.</p>
                <button
                  onClick={goToLogin}
                  className="w-full py-3 px-4 rounded-lg font-semibold text-black relative overflow-hidden group cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-500 animate-gradient"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition duration-500"></div>

                  <div className="relative flex items-center justify-center gap-2">
                    Go to Login
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </button>
              </div>
            )}

            {/* Footer */}
            {step !== "DONE" && (
              <p className="text-center text-white/70 text-sm">
                <button
                  type="button"
                  onClick={goToLogin}
                  className="text-emerald-400 hover:text-cyan-400 font-semibold transition underline"
                >
                  Skip & Login
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}