import React from 'react';

export function Help() {
  return (
    <div className="min-h-screen flex flex-col justify-between px-6 py-12 bg-slate-950 text-slate-100">
      
      {/* Main Content */}
      <div className="flex flex-col items-center mt-4">
        <h1 className="text-4xl font-bold mb-6">Support & Help</h1>
        <p className="text-slate-400 mb-8 max-w-xl text-center">
          Here you can find links to our policies, contact support, and other helpful resources.
        </p>

        <div className="w-full max-w-md bg-slate-900/80 border border-emerald-500/30 rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
          <a
            href="/privacy-policy"
            className="block px-4 py-3 bg-slate-800/50 rounded-lg hover:bg-emerald-500/10 text-emerald-400 font-semibold transition"
          >
            Privacy Policy
          </a>

          <a
            href="/terms-of-service"
            className="block px-4 py-3 bg-slate-800/50 rounded-lg hover:bg-emerald-500/10 text-emerald-400 font-semibold transition"
          >
            Terms of Service
          </a>

          <a
            href="mailto:support@saferaho.com"
            className="block px-4 py-3 bg-slate-800/50 rounded-lg hover:bg-emerald-500/10 text-emerald-400 font-semibold transition"
          >
            Contact Support
          </a>

          <a
            href="/faq"
            className="block px-4 py-3 bg-slate-800/50 rounded-lg hover:bg-emerald-500/10 text-emerald-400 font-semibold transition"
          >
            FAQ
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-slate-500 text-sm text-center">
        © {new Date().getFullYear()} SafeRaho. All rights reserved.
      </footer>
    </div>
  );
}
