"use client";

import { useState } from "react";
import { api } from "../api";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ensureKeys } from "../crypto/ensureKeys";
import { generateRecoveryPhrase, wrapMasterKeyWithRecovery } from "../crypto/recovery";
import jsPDF from "jspdf";
import RecoveryModel from "../components/RecoveryModel";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [msg, setMsg] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [masterKey, setMasterKey] = useState(null);

  // Recovery state
  const [showRecovery, setShowRecovery] = useState(false);
  const [mnemonic, setMnemonic] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setMsg(null);

    try {
      await api.post("/auth/register", {
        name: form.name.trim(),
        email: form.email.toLowerCase().trim(),
        password: form.password,
      });
 
      const vault = await ensureKeys(form.password, { createIfMissing: true });
      setMasterKey(vault.masterKey);

      setMsg({
        type: "success",
        text: "Account created! Generating your recovery phrase...",
      });

      const phrase = generateRecoveryPhrase();
      setMnemonic(phrase);
      setShowRecovery(true);
    } catch (err) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Registration failed",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmRecovery = async () => {
    if (!confirmed) return;

    if (!(masterKey instanceof Uint8Array) || masterKey.length !== 32) {
      setMsg({ type: "error", text: "Internal error: master key missing" });
      return;
    }

    setRecoveryLoading(true);

    try {
      const wrapped = await wrapMasterKeyWithRecovery(masterKey, mnemonic);
      await api.post("/auth/enable-recovery", wrapped);

      masterKey.fill(0);
      setMasterKey(null);

      window.location.href = "/authenticator";
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: "Failed to save recovery key" });
      setRecoveryLoading(false);
    }
  };

  const handleCopyPhrase = () => {
    navigator.clipboard.writeText(mnemonic);
    setMsg({ type: "success", text: "Recovery phrase copied!" });
    setTimeout(() => setMsg(null), 2000);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 30

    const canonical = mnemonic.trim().toLowerCase().replace(/\s+/g, " ");
    const words = canonical.split(" ");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("SafeRaho Recovery Phrase", pageWidth / 2, y, { align: "center" });

    y += 15;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(
      "Anyone with this phrase can access your vault.\nStore it offline and never share it.",
      margin,
      y,
      { maxWidth: pageWidth - margin * 2 }
    );

    y += 25;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("Recovery Phrase (Human-readable)", margin, y);

    y += 12;
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");

    words.forEach((word, i) => {
      const x = margin + (i % 2 === 0 ? 0 : 80);
      doc.text(`${i + 1}. ${word}`, x, y);
      if (i % 2 === 1) y += 8;
    });

    y += 15;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Canonical Format (for recovery)", margin, y);

    y += 10;
    doc.setFontSize(12);
    doc.setFont("courier", "normal");
    doc.setTextColor(40);
    doc.text(canonical, margin, y, { maxWidth: pageWidth - margin * 2 });

    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Generated on ${new Date().toLocaleString()}`, margin, 280);
    doc.text("Never upload or share this phrase.", margin, 286);

    doc.save("SafeRaho-Recovery-Phrase.pdf");
  };

  const words = mnemonic ? mnemonic.trim().split(/\s+/) : [];

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
            ${msg.type === "success" ? "bg-gradient-to-r from-em       erald-500 to-cyan-500 text-black" : "bg-gradient-to-r from-red-500 to-pink-500 text-white"}
          `}
        >
          {msg.text}
        </div>
      )}

      {!showRecovery && (
        <form onSubmit={submit} className="relative z-10 max-w-md w-full">
          <div className="group">
            <div className="relative bg-black/40 border border-cyan-500/30 hover:border-emerald-500/50 backdrop-blur-2xl rounded-2xl p-8 space-y-6 shadow-2xl shadow-cyan-500/20 transition-all duration-300">
              <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent animate-fade-in">
                  Create Account
                </h1>
                <p className="text-emerald-400/70 text-sm">Secure your files with zero-knowledge encryption</p>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm text-cyan-400/80">Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 w-5 h-5" />
                  <input
                    name="name"
                    required
                    value={form.name}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full pl-12 pr-4 py-3 bg-black/20 border border-cyan-500/30 hover:border-cyan-400/60 focus:border-emerald-400 rounded-lg text-white placeholder-white/30 focus:ring-2 focus:ring-emerald-400/30 transition disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm text-cyan-400/80">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 w-5 h-5" />
                  <input
                    type="email"
                    name="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full pl-12 pr-4 py-3 bg-black/20 border border-cyan-500/30 hover:border-cyan-400/60 focus:border-emerald-400 rounded-lg text-white placeholder-white/30 focus:ring-2 focus:ring-emerald-400/30 transition disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm text-cyan-400/80">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 w-5 h-5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full pl-12 pr-12 py-3 bg-black/20 border border-cyan-500/30 hover:border-cyan-400/60 focus:border-emerald-400 rounded-lg text-white placeholder-white/30 focus:ring-2 focus:ring-emerald-400/30 transition disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-emerald-400 transition"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 mt-6 rounded-lg font-semibold text-black relative overflow-hidden group disabled:opacity-50 cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-500 animate-gradient"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition duration-500"></div>
                <div className="relative flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <>
                      Register
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </div>
              </button>

              <p className="text-center text-white/70 text-sm">
                Already have an account?{" "}
                <Link to="/login" className="text-emerald-400 hover:text-cyan-400 font-semibold transition">
                  Login
                </Link>
              </p>
            </div>
          </div>
        </form>
      )}

      <RecoveryModel
        show={showRecovery}
        words={words}
        confirmed={confirmed}
        setConfirmed={setConfirmed}
        recoveryLoading={recoveryLoading}
        onCopy={handleCopyPhrase}
        onDownload={handleDownloadPDF}
        onConfirm={handleConfirmRecovery}
      />
    </div>
  );
}
