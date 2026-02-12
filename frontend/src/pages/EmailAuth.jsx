// frontend/src/pages/EmailAuth.jsx

import { MailOpen } from "lucide-react";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import OTPInput from "./OtpInput";
export default function EmailAuth({
  handleVerifyOtp,
  handleResendOtp,
  resendTimer,
  canResend,
  setOtp,
  otpLoading,
  otp,
  showOtp,
  email,
}) {
  if (!showOtp) return null;

  
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 sm:px-6">
      <motion.form
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        onSubmit={(e) => {
          e.preventDefault();
          handleVerifyOtp();
        }}
        className="
          w-full 
          max-w-md 
          space-y-5 
          rounded-2xl 
          bg-zinc-900 
          p-5 sm:p-6 
          text-white 
          shadow-xl
        "
      >
        <MailOpen className="mx-auto sm:mx-0 w-8 h-8 text-cyan-400" />
        <h3 className="text-xl sm:text-2xl font-black text-center sm:text-left">
          Verify Email
        </h3>

        <p className="text-white/70 text-sm text-center sm:text-left">
          Enter the 6-character code sent to{" "}
          <strong className="break-all text-lime-200">{email}</strong>
        </p>

        <div className="space-y-3">
          <OTPInput
            otp={otp}
            setOtp={setOtp}
            disabled={otpLoading}
            onComplete={handleVerifyOtp}
          />

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!canResend}
              onClick={handleResendOtp}
              className="
                text-sm 
                text-cyan-400 
                disabled:text-gray-500 
                hover:underline 
                disabled:hover:no-underline 
                cursor-pointer 
                disabled:cursor-not-allowed
                transition
              "
            >
              {canResend ? "Resend code" : `Resend in ${resendTimer}s`}
            </button>
          </div>

          <p className="text-xs text-white/60 text-center sm:text-left">
            Didn’t receive the email? Please check your spam or junk folder.
          </p>
        </div>

        <motion.button
          type="submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          disabled={otpLoading}
          className="
            w-full 
            py-3 
            rounded-xl 
            bg-gradient-to-r 
            from-emerald-500 
            to-cyan-500 
            text-black 
            font-bold 
            cursor-pointer 
            disabled:opacity-70 
            disabled:cursor-not-allowed
            transition
          "
        >
          {otpLoading ? "Verifying..." : "Verify Code"}
        </motion.button>
      </motion.form>
    </div>,
    document.body
  );
}