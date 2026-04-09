"use client";

import { useState, useRef, useEffect } from "react";
import { Shield, ArrowRight, Check, Copy as CopyIcon } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "react-toastify";
import { api } from "../api";

export default function Authenticator() {
  const [step, setStep] = useState("INIT"); // INIT → VERIFY → DONE
  const [qrUri, setQrUri] = useState("");
  const [setupKey, setSetupKey] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const inputRefs = useRef([]);

  /* ---------------------------------- */
  /* Auto start setup on page load       */
  /* ---------------------------------- */
  useEffect(() => {
    startSetup();
  }, []);

 // Auto-Redirect after success
  useEffect(() => {
  if (step === "DONE") {
    const timer = setTimeout(() => {
      goToLogin();
    }, 3000); // 3 seconds

    return () => clearTimeout(timer);
  }
}, [step]);

  /* ---------------------------------- */
  /* Start 2FA Setup                     */
  /* ---------------------------------- */
  const startSetup = async () => {
    setIsLoading(true);
    
    try {
      const res = await api.post("/auth/2fa/setup");
      const uri = res.data.otpauthUri;

      setQrUri(uri);

      const parsed = new URL(uri);
      const secret = parsed.searchParams.get("secret");
      setSetupKey(secret || "");
      setStep("VERIFY");
    } catch {
      toast.error({type: "error", render: "Failed to generate authenticator QR" });
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------------------------------- */
  /* OTP Handling                        */
  /* ---------------------------------- */
  const handleOtpChange = (index, value) => {
  const cleaned = value.replace(/\D/g, ""); // remove non-digits

  const newOtp = [...otp];
  newOtp[index] = cleaned.slice(-1);
  setOtp(newOtp);

    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
  const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
  if (!paste) return;

  const newOtp = paste.split("");
  setOtp([...newOtp, ...Array(6 - newOtp.length).fill("")]);

  paste.split("").forEach((_, i) => {
    inputRefs.current[i]?.focus();
  });
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

  if (isLoading) return;
  setIsLoading(true);

  try {
    const code = otp.join("");
    const res = await api.post("/auth/2fa/verify-setup", { token: code });

    // ✅ Use backend message
    if (res.data.driftWarning) {
      toast.warning(res.data.message);  // toast shows drift warning
    } else {
      toast.success(res.data.message);  // toast shows "2FA enabled successfully"
    }

    setStep("DONE");
  } catch (err) {
    console.log("FULL ERROR:", err);
    console.log("RESPONSE:", err.response);

    toast.error(err.response?.data?.message || "Invalid authentication code");
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
              <div className="flex gap-2" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
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
