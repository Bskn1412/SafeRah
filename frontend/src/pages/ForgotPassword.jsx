import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, ArrowRight, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { api } from '../api';
import { toast } from 'react-toastify';

// Crypto functions
import { unwrapWithRecovery, wrapMasterKeyWithRecovery } from "../crypto/recovery";
import { rotateVaultPassword } from "../crypto/rotateVaultPassword";

export default function ForgotPassword() {
  const [step, setStep] = useState("EMAIL");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [phrase, setPhrase] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryMeta, setRecoveryMeta] = useState(null);
  const [sessionToken, setSessionToken] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");

  const otpRefs = useRef([]);

  const notify = {
    success: (msg) => toast.success(msg),
    error: (msg) => toast.error(msg),
    info: (msg) => toast.info(msg),
  };

  // ====================== PASSWORD VALIDATION ======================
  const passwordRules = {
    length: { test: (pw) => pw.length >= 8, message: "At least 8 characters" },
    lowercase: { test: (pw) => /[a-z]/.test(pw), message: "One lowercase letter" },
    number: { test: (pw) => /[0-9]/.test(pw), message: "One number" },
    special: { test: (pw) => /[!@#$%^&*(),.?":{}|<>]/.test(pw), message: "One special character" },
  };

  const checkPassword = (pw) => {
    return Object.keys(passwordRules).map((key) => ({
      ...passwordRules[key],
      valid: passwordRules[key].test(pw || ""),
    }));
  };

  // Get password hints (only show failed rules when user starts typing)
  const passwordHints = checkPassword(newPassword);

  // ====================== EMAIL HANDLERS ======================
  const handleEmailChange = (e) => {
    let value = e.target.value.trim().toLowerCase();
    value = value.replace(/[^a-z0-9@._+\-]/g, '');
    setEmail(value);
    setEmailError("");
  };

  // ====================== OTP HANDLERS ======================
  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newOtp = pasted.split("").concat(Array(6 - pasted.length).fill(""));
    setOtp(newOtp);
  };

  // ====================== API FUNCTIONS ======================
  const submitEmail = async (e) => {
    e.preventDefault();
    setError("");
    setEmailError("");

    if (!email || emailError) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email });

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
      const msg = err.response?.data?.message || "Email not found or recovery not enabled";
      setError(msg);
      notify.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const submitOtp = async () => {
    setIsLoading(true);
    setError("");
    const sanitizedOtp = otp.join("").replace(/\D/g, "");

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

      if (res.data.verificationStatus !== "success") throw new Error("Invalid code");

      const recoveryToken = res.data.recoverySession?.trim();
      if (!recoveryToken) throw new Error("No recovery session token received");

      setSessionToken(recoveryToken);

      const metaRes = await api.get("/auth/recovery-metadata", {
        headers: { Authorization: `Bearer ${recoveryToken}` },
      });

      setRecoveryMeta(metaRes.data);
      setStep("PHRASE");
      notify.success("Code verified successfully");
    } catch (err) {
      const msg = err.response?.data?.message || "Invalid authenticator code";
      setError(msg);
      notify.error(msg);
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
    setError("");
    try {
      await unwrapWithRecovery(phrase.trim(), recoveryMeta.wrappedMasterKey, recoveryMeta.nonce);
      setStep("NEW_PASSWORD");
      notify.success("Recovery phrase accepted! Set your new password.");
    } catch (err) {
      setError("Invalid recovery phrase");
      notify.error("Invalid recovery phrase");
    } finally {
      setIsLoading(false);
    }
  };

  const submitNewPassword = async (e) => {
    e.preventDefault();
    setError("");

    // Check password strength
    const failedRules = passwordHints.filter(rule => !rule.valid).map(rule => rule.message);
    if (failedRules.length > 0) {
      notify.error(failedRules.join(" • "));
      return;
    }

    // Check password match
    if (newPassword !== confirmPassword) {
      notify.error("Passwords do not match!");
      return;
    }

    if (!sessionToken) {
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

      const vaultWrap = await rotateVaultPassword(masterKey, newPassword);
      const recoveryWrap = await wrapMasterKeyWithRecovery(masterKey, phrase.trim());

      await api.post(
        "/auth/forgot-password/reset",
        {
          newPassword,
          encryptedMasterKey: vaultWrap.encryptedMasterKey,
          masterNonce: vaultWrap.masterNonce,
          argonSalt: vaultWrap.argonSalt,
          newWrappedMasterKey: recoveryWrap.wrappedMasterKey,
          newSalt: recoveryWrap.salt,
          newNonce: recoveryWrap.nonce,
        },
        { headers: { Authorization: `Bearer ${sessionToken}` } }
      );

      setStep("SUCCESS");
      notify.success("Password reset successful! Redirecting to login...");
      
      setTimeout(() => window.location.href = "/login", 2500);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to reset password";
      setError(msg);
      notify.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ====================== MOTION VARIANTS ======================
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900" />
        <motion.div className="absolute top-10 left-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-3xl opacity-25"
          animate={{ x: [0, 100, 0], y: [0, 60, 0] }} transition={{ duration: 12, repeat: Infinity }} />
        <motion.div className="absolute -bottom-20 right-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-3xl opacity-20"
          animate={{ x: [0, -80, 0], y: [0, -50, 0] }} transition={{ duration: 14, repeat: Infinity }} />
        <motion.div className="absolute top-1/3 -right-20 w-80 h-80 bg-indigo-500 rounded-full mix-blend-screen filter blur-3xl opacity-15"
          animate={{ x: [0, 60, 0], y: [0, -80, 0] }} transition={{ duration: 16, repeat: Infinity }} />
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,68,68,.05)_25%,rgba(68,68,68,.05)_50%,transparent_50%,transparent_75%,rgba(68,68,68,.05)_75%,rgba(68,68,68,.05))] bg-[length:60px_60px]" />
      </div>

      {/* Decorative 3D Elements */}
      <motion.div className="absolute top-1/4 left-8 hidden lg:block" animate={{ y: [0, 30, 0], rotate: [0, 10, 0] }} transition={{ duration: 8, repeat: Infinity }}>
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg opacity-80 transform -rotate-12 shadow-2xl" />
          <div className="absolute inset-2 bg-gradient-to-br from-cyan-300 to-blue-400 rounded-lg transform rotate-6" />
        </div>
      </motion.div>

      <motion.div className="absolute top-1/3 right-12 hidden lg:block" animate={{ y: [0, -40, 0], rotate: [0, -15, 0] }} transition={{ duration: 10, repeat: Infinity }}>
        <div className="relative w-32 h-32">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600 rounded-full opacity-70 shadow-2xl blur-sm" />
          <div className="absolute inset-4 bg-gradient-to-tr from-pink-300 to-purple-400 rounded-full opacity-60" />
        </div>
      </motion.div>

      {/* Main Glass Card */}
      <motion.div className="relative z-10 w-full max-w-md" variants={containerVariants} initial="hidden" animate="visible">
        <motion.div className="bg-gradient-to-br from-white/20 via-white/10 to-white/5 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-transparent to-purple-400/5 rounded-3xl pointer-events-none" />

          {/* Header */}
          <div className="text-center mb-8">
            <motion.div className="flex justify-center mb-6" initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
              <div className="p-4 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 rounded-full shadow-lg">
                <Lock className="w-9 h-9 text-white" />
              </div>
            </motion.div>

            <h2 className="text-4xl font-black text-white mb-3 tracking-tight bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text">
              {step === "EMAIL" && "Reset Your Password"}
              {step === "TOTP" && "Verify Authenticator"}
              {step === "PHRASE" && "Recovery Phrase"}
              {step === "NEW_PASSWORD" && "Set New Password"}
              {step === "SUCCESS" && "Success!"}
            </h2>
            <p className="text-white/60 text-base">
              {step === "EMAIL" && "Don’t worry, we’ll help you to get back your account securely."}
              {step === "TOTP" && <>Enter the 6-digit code from your <span className="text-blue-400 font-bold">Authenticator App</span></>}
              {step === "PHRASE" && "Enter your 12-word recovery phrase"}
              {step === "NEW_PASSWORD" && "Create a strong new password"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={
            step === "EMAIL" ? submitEmail :
            step === "PHRASE" ? submitPhrase :
            step === "NEW_PASSWORD" ? submitNewPassword : (e) => e.preventDefault()
          } className="space-y-6">

            {/* Email Field */}
            {step === "EMAIL" && (
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="your@email.com"
                    className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
                    disabled={isLoading}
                  />
                </div>
                {emailError && (
                  <p className="text-red-400 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {emailError}
                  </p>
                )}
              </div>
            )}

            {/* OTP Field */}
            {step === "TOTP" && (
              <div className="space-y-4">
                {/* <p className="text-center text-white/70 text-sm">Enter 6-digit code from your authenticator app</p> */}
                <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      disabled={isLoading}
                      className="w-14 h-16 text-center text-4xl font-bold bg-white/10 border border-white/40 rounded-2xl text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 transition-all"
                      autoFocus={index === 0}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Recovery Phrase */}
            {step === "PHRASE" && (
              <>
              <textarea
                value={phrase}
                onChange={(e) => setPhrase(e.target.value.replace(/\s+/g, " "))}
                placeholder="Ex: word1 word2 word3 ... word12"
                rows={5}
                className="w-full p-5 bg-white/10 border border-white/30 rounded-2xl placeholder-white/50 focus:outline-none focus:border-blue-400 resize-y min-h-[160px] text-sm focus:ring-2 focus:ring-blue-400/30 transition-all text-orange-300 font-bold"
                disabled={isLoading}
              />
                {/* Tip for pasting from PDF */}
                <p className="mt-2 text-sm text-slate-300 text-center">
                    Tip: Enter Copy - Paste format from your backup PDF for best results.                
                    </p>
              </>
            )}

            {/* New Password Fields with Live Validation */}
            {step === "NEW_PASSWORD" && (
              <div className="space-y-5">
                <div>
                  <input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-5 py-4 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-5 py-4 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
                    disabled={isLoading}
                  />
                </div>

                {/* Live Password Hints */}
                {newPassword.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {passwordHints
                      .filter(rule => !rule.valid)
                      .map((rule, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 text-sm text-red-400"
                        >
                          <XCircle className="w-4 h-4 flex-shrink-0" />
                          <span>{rule.message}</span>
                        </motion.div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Success State */}
            {step === "SUCCESS" && (
              <div className="text-center py-10">
                <CheckCircle className="mx-auto w-20 h-20 text-emerald-400 mb-6" />
                <h3 className="text-2xl font-bold text-white">Password Reset Successful!</h3>
                <p className="text-white/70 mt-2">Redirecting to login page...</p>
              </div>
            )}

            {/* {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-xl">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )} */}

            {/* Submit Button */}
            {step !== "SUCCESS" && (
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={step === "TOTP" ? submitOtp : undefined}
                className="mt-6 w-full py-4 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg cursor-pointer transition-all disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {step === "EMAIL" && "Continue"}
                    {step === "TOTP" && "Verify Code"}
                    {step === "PHRASE" && "Verify Phrase"}
                    {step === "NEW_PASSWORD" && "Reset Password"}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            )}
          </form>

          {/* Back to Login */}
          <div className="text-center mt-8">
            <button
              onClick={() => window.location.href = "/login"}
              className="text-white/60 hover:text-white transition-colors text-sm"
            >
              ← Back to Login
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <div className="absolute bottom-5 text-white/50 text-xs text-center">
        © {new Date().getFullYear()} SafeRaho. All rights reserved.
      </div>
    </div>
  );
}