import { useState } from "react";
import { Copy, Download, ArrowRight, Check } from "lucide-react";
import { createPortal } from "react-dom";

export default function RecoveryModel({
  show,
  words,
  confirmed,
  setConfirmed,
  recoveryLoading,
  onCopy,
  onDownload,
  onConfirm,
}) {
  const [copied, setCopied] = useState(false);

  if (!show) return null;

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl px-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-float-slow"></div>
      </div>

    {/* Model Container */}
      <div className="relative w-full max-w-3xl py-6 sm:py-10 px-6 sm:px-10 bg-gradient-to-br from-slate-900/80 via-black/80 to-slate-900/80 border border-emerald-500/30 rounded-3xl shadow-2xl shadow-emerald-500/20 space-y-8 max-h-[90vh] sm:max-h-none overflow-y-auto sm:overflow-visible">
        {/* Header */}
        <div className="text-center space-y-4 animate-fade-in-down">
          <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Save Your Recovery Phrases
          </h2>
          <p className="text-sm sm:text-base text-gray-300 max-w-lg mx-auto">
            This is the <strong className="text-red-400">only way</strong> to recover your files if you forget your password.
            <br />
            <strong className="text-red-400">You must save it now.</strong>
          </p>
        </div>

        {/* Phrase Container */}
        <div className="p-8 bg-gradient-to-br from-slate-800/50 to-black/50 rounded-2xl border border-emerald-500/20 backdrop-blur-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <h3 className="text-lg font-semibold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Your 12-Word Recovery Phrase
            </h3>

            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                className="px-4 py-2 sm:py-3 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-emerald-400 rounded-lg flex items-center gap-2 transition-all duration-300 border border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/20 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check size={16} /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} /> Copy
                  </>
                )}
              </button>

              <button
                onClick={onDownload}
                className="px-4 py-2 sm:py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-black rounded-lg flex items-center gap-2 transition-all duration-300 font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 cursor-pointer"
              >
                <Download size={16} /> PDF
              </button>
            </div>
          </div>

          {/* Words Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {words.map((word, i) => (
            <div
              key={i}
              className="group relative bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 hover:border-emerald-400/60 rounded-xl p-4 text-center transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105 min-w-0"
              style={{
                animation: `fade-in 0.5s ease-out ${i * 0.05}s backwards`,
              }}
            >
              <div className="relative flex items-baseline gap-2 text-left overflow-hidden">
                <span className="text-emerald-400/70 text-xs font-bold leading-none flex-shrink-0">
                  {String(i + 1).padStart(2, "0")}.
                </span>
                <span className="text-white font-semibold text-sm sm:text-base leading-none truncate">
                  {word}
                </span>
              </div>
            </div>
          ))}
        </div>  
      </div>

        {/* Confirmation */}
        <label className="flex items-center gap-3 text-base sm:text-lg cursor-pointer group transition-all duration-300">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-500 rounded accent-emerald-500 focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 focus:ring-offset-black cursor-pointer transition-all duration-300"
          />
          <span className="text-gray-300 group-hover:text-gray-100 transition-colors duration-300">
            I have saved my recovery phrase securely (copy + PDF)
          </span>
        </label>

        {/* Continue */}
        <button
          onClick={onConfirm}
          disabled={!confirmed || recoveryLoading}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:shadow-emerald-500/40 active:scale-95 cursor-pointer"
        >
          {recoveryLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin cursor-pointer"></div>
              Saving Recovery Keys...
            </>
          ) : (
            <>
              Continue
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </div>
    </div>,
    document.body
  );
}
