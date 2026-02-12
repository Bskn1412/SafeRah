import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, CheckCircle, XCircle } from "lucide-react";
import { Link, useNavigate} from "react-router-dom";
import { api } from "../api";
import { toast } from "react-toastify";
import "../toast.css";
import CountrySelector from "./CountrySelector";

import RecoveryModel from "../components/RecoveryModel";
import { signupLogic } from "./signup_logic";

export default function SignupForm({ textVariants }) {

   const {
    form,
    isLoading,
    showRecovery,
    mnemonic,
    confirmed,
    recoveryLoading,

    setConfirmed,
    handleChange,
    submit,
    confirmRecovery,
    copyPhrase,
    downloadPDF,
  } = signupLogic();

  const [showPassword, setShowPassword] = useState(false);
  


  // *** Password checking strats ***
  const errorMap = {
  MISSING_FIELDS: "Please fill in all fields",
  INVALID_CREDENTIALS: "Email or password is incorrect",
  ACCOUNT_LOCKED: "Your account is temporarily locked",
  SERVER_ERROR: "Server error. Try again later",
 };


 const passwordRules = {
  length: { test: (pw) => pw.length >= 8, message: "At least 8 characters" },
  //uppercase: { test: (pw) => /[A-Z]/.test(pw), message: "One uppercase letter" },
  lowercase: { test: (pw) => /[a-z]/.test(pw), message: "One lowercase letter" },
  number: { test: (pw) => /[0-9]/.test(pw), message: "One number" },
  special: { test: (pw) => /[!@#$%^&*(),.?":{}|<>]/.test(pw), message: "One special character" },
 };

 const checkPassword = (pw) => {
  return Object.keys(passwordRules).map((key) => ({
    ...passwordRules[key],
    valid: passwordRules[key].test(pw),
  }));
 };

 const passwordHints = checkPassword(form.password); 
 // *** End of password checking ***

 
 console.log("the words from signup_logic : ",words);
 
  return (
  <div className=" flex items-center justify-center bg-gradient-to-br from-black to-gray-900 px-4">
      <motion.form
        onSubmit={submit}
        variants={textVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="w-full max-w-sm space-y-5 text-white">
        <h3 className="text-3xl font-black">Create Account</h3>
        {/* Name */}
        <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400 w-5 h-5" />
                    <input
                      name="name"
                      autoComplete="off"
                      required
                      value={form.name}
                      placeholder="Username"
                      onChange={handleChange}
                      disabled={isLoading}
                      className="w-full pl-12 pr-4 py-3 bg-black/20 border border-cyan-500/30 hover:border-emerald-400/60 focus:border-emerald-400 rounded-lg text-white placeholder-white/70 focus:ring-2 focus:ring-emerald-400/30 transition disabled:opacity-50"
                    />
        </div>

        {/* Email */}
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400" />
          <input
            name="email"
                    type="email"
                    value={form.email}
                    autoComplete="off"
                    placeholder="E-Mail"
                    required
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full pl-12 pr-4 py-3 bg-black/20 border border-cyan-500/30 hover:border-emerald-400/60 focus:border-cyan-400 rounded-lg text-white placeholder-white/70 focus:bg-black/30 focus:ring-2 focus:ring-cyan-400/30 transition disabled:opacity-50"
                  />
        </div>

        {/* Password */}

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            name="password"
            value={form.password}
            onChange={handleChange}
            disabled={isLoading}
            className="w-full pl-12 pr-12 py-3 bg-black/20 border border-cyan-500/30 hover:border-emerald-400/60 focus:border-cyan-400 rounded-lg text-white placeholder-white/70 focus:bg-black/30 focus:ring-2 focus:ring-cyan-400/30 transition disabled:opacity-50"/>

          <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
              {showPassword ? <EyeOff /> : <Eye />}
          </button>
        </div>

        {/* Password hints */}
        {form.password.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {passwordHints
            .filter(rule => !rule.valid) // only missing rules
            .map((rule, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-sm text-red-400">
              <XCircle className="w-4 h-4" />
              <span>{rule.message}</span>
            </motion.div>
          ))}

          {/* Optional single check when all valid */}
          { passwordHints.every(r => r.valid) && (
          <CheckCircle className="mt-2 flex flex-col gap-1 top-1/2 -translate-y-1/2 text-emerald-400" />
          )}
        </div>
        )}

        {/* <CountrySelector selected={country} setSelected={setCountry} /> */}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold cursor-pointer">
          {isLoading ? "Loading..." : "Create Account"}
        </motion.button>
    </motion.form>


      {/* Recovery modal */}
      <RecoveryModel
        show={showRecovery}
        words={words}
        confirmed={confirmed}
        setConfirmed={setConfirmed}
        recoveryLoading={recoveryLoading}
        onCopy={copyPhrase}
        onDownload={downloadPDF}
        onConfirm={confirmRecovery}
      />
  </div>
  );
}
