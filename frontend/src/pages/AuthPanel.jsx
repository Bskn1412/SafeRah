import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence} from "framer-motion";
import { X } from "lucide-react";
import { Link } from "react-router-dom";

import LoginForm from "./LoginForm";
import SignupForm from "./SignUpForm";

import { useLocation, useNavigate } from "react-router-dom";

export default function AuthPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const isFirstRender = useRef(true);

  const mode = location.pathname === "/register" ? "register" : "login";

  const toggleMode = () => {
  navigate(mode === "login" ? "/register" : "/login");
  };


  useEffect(() => {
    isFirstRender.current = false;
  }, []);



  /* ---- SAME animations ---- */
  const textVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
  };

  const flipVariants = {
    login: {
      rotateY: 0,
      rotateX: 0,
      y: 0,
      transition: { duration: 0.7, ease: [0.77, 0, 0.175, 1] },
    },
    register: {
      rotateY: 180,
      rotateX: 90,
      y: -20,
      transition: { duration: 0.7, ease: [0.77, 0, 0.175, 1] },
    },
  };

  // For close icon
  // const closeModal = () => {
  //   setIsClosing(true); // trigger exit animation
  //   setTimeout(() => {
  //     setIsModalVisible(false); // unmount
  //     setShowUnlockModal(false);
  //     setVaultPassword("");
  //     setUnlockError(null);
  //     setIsClosing(false);
  //   }, 350); // match animation duration
  // };

  return (
    <>
   {/* Navigate Back Button */}
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="fixed mb-5 w-40 left-5 z-50 bottom-5">

      <Link to="/"
      className="block w-full text-center px-4 py-3 bg-gray-500 text-black font-semibold rounded-lg hover:bg-cyan-500 hover:text-white transition-colors duration-300">
        ← Back to Home
      </Link>
    </motion.div>


    <div className="min-h-screen bg-black flex items-center justify-center px-4 overflow-hidden relative">
      {/* Close Button 
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 z-20 p-2 rounded-full
                  bg-slate-900/70 hover:bg-slate-800
                  border border-slate-700
                  text-slate-300 hover:text-white
                  transition-all duration-200
                  hover:scale-105 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
      */}
      {/* Background Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-emerald-500/20 to-cyan-500/10 rounded-full blur-3xl"
          animate={{ x: [0, 50, -30, 0], y: [0, -50, 30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-l from-cyan-500/20 to-emerald-500/10 rounded-full blur-3xl"
          animate={{ x: [0, -50, 30, 0], y: [0, 50, -30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-4xl min-h-[520px] md:h-[500px] bg-slate-900/30 rounded-3xl overflow-hidden backdrop-blur-sm border border-emerald-500/20">
        {/* Flip Gradient */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-cyan-600 to-emerald-700 z-0"
          variants={flipVariants}
          animate={mode}
          initial={isFirstRender.current ? false : "register"}
          style={{ perspective: 1200, transformOrigin: "center" }}
        />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 h-full">

          {/* LEFT TEXT */}
          <div className="flex flex-col justify-center px-8 md:px-12 text-white">
            <AnimatePresence mode="wait">
              {mode === "login" ? (
                <motion.div
                  key="login-text"
                  variants={textVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <h2 className="text-5xl font-black">Welcome Back</h2>
                  <p className="text-white/70">
                    Access your secure vault and manage encrypted files.
                  </p>
                  <button
                    onClick={toggleMode}
                    className="w-fit px-8 py-3 rounded-full border border-white/40 hover:bg-white/10 cursor-pointer"
                  >
                    New? Sign up
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="signup-text"
                  variants={textVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <h2 className="text-5xl font-black">Join SafeRaho</h2>
                  <p className="text-white/70">
                    Military-grade encryption starts here.
                  </p>
                  <button
                    onClick={toggleMode}
                    className="w-fit px-8 py-3 rounded-full border border-white/40 hover:bg-white/10 cursor-pointer"
                  >
                    Have an account? Sign in
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT FORM */}
          <div className="flex items-center justify-center p-8">
            <AnimatePresence mode="wait">
              {mode === "login" ? (
                <LoginForm
                  key="login"
                  textVariants={textVariants}
                />
              ) : (
                <SignupForm
                  key="signup"
                  textVariants={textVariants}
                />
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  </>
  );
}
