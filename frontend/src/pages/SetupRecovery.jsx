"use client";

import { useState } from "react";
import { api } from "../api";
import { ensureKeys } from "../crypto/ensureKeys";
import {
  generateRecoveryPhrase,
  wrapMasterKeyWithRecovery
} from "../crypto/recovery";
import { Copy, Check } from "lucide-react";

export default function SetupRecovery() {
  const [password, setPassword] = useState("");
  const [mnemonic, setMnemonic] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const vault = await ensureKeys(password);

      if (!vault || !vault.masterKey) {
        throw new Error("Unable to unlock vault");
      }

      const phrase = generateRecoveryPhrase();
      setMnemonic(phrase);

      const wrapped = await wrapMasterKeyWithRecovery(
        vault.masterKey,
        phrase
      );

      await api.post("/recovery/enable", wrapped);

    } catch (err) {
      setMnemonic(null);
      setError(err.message || "Recovery setup failed");
    } finally {
      setLoading(false);
      setPassword("");
    }
  };

  const handleContinue = () => {
    if (!confirmed) return;
    window.location.href = "/dashboard";
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(mnemonic);
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
          your password. We cannot help you recover it. Store it offline securely.
        </p>

        {!mnemonic && (
          <form onSubmit={handleGenerate} className="space-y-4">

            <input
              type="password"
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

        {mnemonic && (
          <>
            <div className="grid grid-cols-3 gap-2 bg-black p-4 rounded">
              {words.map((word, i) => (
                <div key={i} className="text-center text-sm border p-2 rounded">
                  {i + 1}. {word}
                </div>
              ))}
            </div>

            <button onClick={handleCopy} className="w-full py-2 bg-gray-600 text-white rounded flex items-center justify-center gap-2">
              <Copy size={16} /> Copy Phrase
            </button>

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
              className="w-full py-3 bg-emerald-500 text-black rounded font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check size={16} /> Continue to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}