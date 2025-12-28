// frontend/src/pages/SetupRecovery.jsx

"use client";

import { useState } from "react";
import { api } from "../api";
import { ensureKeys } from "../crypto/ensureKeys";
import {
  generateRecoveryPhrase,
  wrapMasterKeyWithRecovery
} from "../crypto/recovery";

export default function SetupRecovery() {
  const [password, setPassword] = useState("");
  const [mnemonic, setMnemonic] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* ----------------------------- */
  /* Generate + Enable Recovery    */
  /* ----------------------------- */
  const handleGenerate = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!password || password.length < 8) {
        throw new Error("Password is required");
      }

      // 🔐 Unlock vault (ONLY source of truth)
      const vault = await ensureKeys(password);

      if (!vault || !vault.masterKey) {
        throw new Error("Unable to unlock vault");
      }

      // 🔑 Generate recovery phrase
      const phrase = generateRecoveryPhrase();
      setMnemonic(phrase);

      // 🔐 Wrap master key explicitly
      const wrapped = await wrapMasterKeyWithRecovery(
        vault.masterKey,
        phrase
      );

      // ✅ Persist recovery metadata
      await api.post("/recovery/enable", wrapped);

    } catch (err) {
      setMnemonic(null);
      setError(err.message || "Recovery setup failed");
    } finally {
      setLoading(false);
      // IMPORTANT: wipe password from memory
      setPassword("");
    }
  };

  /* ----------------------------- */
  /* Confirm + Continue            */
  /* ----------------------------- */
  const handleContinue = () => {
    if (!confirmed) return;
    window.location.href = "/dashboard";
  };

  const words =
    typeof mnemonic === "string" ? mnemonic.trim().split(/\s+/) : [];

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="w-full max-w-lg p-8 bg-black/40 rounded-xl space-y-6">

        <h1 className="text-2xl font-bold text-center">
          Set Up Account Recovery
        </h1>

        <p className="text-sm text-gray-400 text-center">
          This recovery key is the ONLY way to recover your vault if you forget
          your password. We cannot help you recover it.
        </p>

        {/* ---------------- Password + Generate ---------------- */}
        {!mnemonic && (
          <form onSubmit={handleGenerate} className="space-y-4">

            <input
              type="password"
              autoComplete="current-password"
              placeholder="Enter your account password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded bg-black/20 text-white border border-gray-600"
            />

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 bg-emerald-500 text-black rounded font-semibold disabled:opacity-50"
            >
              {loading ? "Generating…" : "Generate Recovery Key"}
            </button>

            {error && (
              <p className="text-red-400 text-sm text-center">
                {error}
              </p>
            )}
          </form>
        )}

        {/* ---------------- Phrase Display ---------------- */}
        {mnemonic && (
          <>
            <div className="grid grid-cols-3 gap-2 bg-black p-4 rounded">
              {words.map((word, i) => (
                <div
                  key={i}
                  className="text-center text-sm border p-2 rounded"
                >
                  {i + 1}. {word}
                </div>
              ))}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              I have securely saved this recovery key
            </label>

            <button
              disabled={!confirmed}
              onClick={handleContinue}
              className="w-full py-3 bg-emerald-500 text-black rounded font-semibold disabled:opacity-50"
            >
              Continue to Dashboard
            </button>
          </>
        )}

      </div>
    </div>
  );
}
