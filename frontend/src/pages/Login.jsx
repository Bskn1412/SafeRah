// frontend/src/pages/Login.jsx

"use client";

import { useState } from "react";
import { api } from "../api";
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";


export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [msg, setMsg] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async (e) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    // 1️⃣ Login → sets JWT cookie
    const res = await api.post("/auth/login", form);

    console.log("Login response:", res.data);

    // // 2️⃣ Unlock existing vault ONLY
    // const result = await ensureKeys(form.password);

    // console.log("Login key derivation result:", result);

//    if (result?.wrongPassword) {
//     console.log("Invalid password provided", result);
//   throw new Error("Invalid password");
// }

    // 3️⃣ Start client session (fine)
    // setSessionMasterKey(result.masterKey);

    setMsg({
      text: res.data.message || "Login successful!",
      type: "success",
    });

    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 800);

  } catch (err) {
    setMsg({
      text: err.message || err.response?.data?.message || "Login failed",
      type: "error",
    });
  } finally {
    setIsLoading(false);
  }
};


  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center px-4 bg-black">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-black to-cyan-500/20 animate-gradient"></div>

      {/* Neon grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_24%,rgba(16,185,129,0.05)_25%,rgba(16,185,129,0.05)_26%,transparent_27%,transparent_74%,rgba(16,185,129,0.05)_75%,rgba(16,185,129,0.05)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(6,182,212,0.05)_25%,rgba(6,182,212,0.05)_26%,transparent_27%,transparent_74%,rgba(6,182,212,0.05)_75%,rgba(6,182,212,0.05)_76%,transparent_77%,transparent)] bg-[length:50px_50px]"></div>

      {/* Floating neon blobs */}
      <div className="absolute top-10 -left-20 w-64 h-64 bg-emerald-500/15 rounded-full mix-blend-screen blur-3xl animate-float"></div>
      <div className="absolute bottom-10 -right-20 w-64 h-64 bg-cyan-500/15 rounded-full mix-blend-screen blur-3xl animate-float-slow"></div>

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
      <form onSubmit={submit} className="relative z-10 max-w-md w-full">
        <div className="group">
          <div className=""></div>

          <div className="relative bg-black/40 backdrop-blur-2xl border border-emerald-500/30 hover:border-cyan-500/50 rounded-2xl p-8 space-y-6 shadow-2xl shadow-emerald-500/20 transition-all duration-300">
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent animate-fade-in">
                Welcome Back
              </h1>
              <p className="text-cyan-400/70 text-sm">Login to continue</p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-emerald-400/80">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400" />
                <input
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={form.email}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-full pl-12 pr-4 py-3 bg-black/20 border border-emerald-500/30 hover:border-emerald-400/60 focus:border-cyan-400 rounded-lg text-white placeholder-white/30 focus:bg-black/30 focus:ring-2 focus:ring-cyan-400/30 transition disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-emerald-400/80">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400" />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  value={form.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-full pl-12 pr-12 py-3 bg-black/20 border border-emerald-500/30 hover:border-emerald-400/60 focus:border-cyan-400 rounded-lg text-white placeholder-white/30 focus:bg-black/30 focus:ring-2 focus:ring-cyan-400/30 transition disabled:opacity-50"
                />
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-cyan-400 transition"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Login + Forgot Password */}
            <div className="flex items-center justify-between mt-6 gap-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3 px-4 rounded-lg font-semibold text-black relative overflow-hidden group disabled:opacity-50 cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500 animate-gradient"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition duration-500"></div>

                <div className="relative flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                      <span>Logging in...</span>
                    </>
                  ) : (
                    <>
                      Login
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </div>
              </button>

              <Link
                to="/forgot-password"
                className="text-sm text-cyan-400 hover:text-emerald-400 transition font-medium whitespace-nowrap underline"
              >
                Forgot your password?
              </Link>
            </div>

            {/* Footer */}
            <p className="text-center text-white/70 text-sm">
              Don’t have an account?{" "}
              <Link
                to="/register"
                className="text-cyan-400 hover:text-emerald-400 transition font-semibold"
              >
                Register
              </Link>
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
