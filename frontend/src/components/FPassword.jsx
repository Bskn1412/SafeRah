import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, ArrowRight, CheckCircle } from 'lucide-react';

export default function FPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsLoading(false);
    setIsSubmitted(true);
    
    // Reset after 3 seconds
    setTimeout(() => {
      setIsSubmitted(false);
      setEmail('');
    }, 3000);
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: 20,
      transition: { duration: 0.4 },
    },
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (delay) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay,
        duration: 0.5,
        ease: 'easeOut',
      },
    }),
  };

  const iconVariants = {
    hidden: { opacity: 0, rotate: -20, scale: 0 },
    visible: {
      opacity: 1,
      rotate: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 20,
        delay: 0.1,
      },
    },
  };

  const buttonVariants = {
    hover: { scale: 1.02 },
    tap: { scale: 0.98 },
  };

  const successVariants = {
    hidden: { opacity: 0, scale: 0 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 260,
        damping: 20,
      },
    },
  };

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950">
      {/* Premium animated background gradient with floating orbs */}
      <div className="absolute inset-0">
        {/* Dark gradient base */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900" />
        
        {/* Animated glowing orbs */}
        <motion.div
          className="absolute top-10 left-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-3xl opacity-25"
          animate={{
            x: [0, 100, 0],
            y: [0, 60, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute -bottom-20 right-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-3xl opacity-20"
          animate={{
            x: [0, -80, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute top-1/3 -right-20 w-80 h-80 bg-indigo-500 rounded-full mix-blend-screen filter blur-3xl opacity-15"
          animate={{
            x: [0, 60, 0],
            y: [0, -80, 0],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,68,68,.05)_25%,rgba(68,68,68,.05)_50%,transparent_50%,transparent_75%,rgba(68,68,68,.05)_75%,rgba(68,68,68,.05))] bg-[length:60px_60px]" />
      </div>

      {/* 3D Geometric Elements - Left Side */}
      <motion.div
        className="absolute top-1/4 left-8 hidden lg:block"
        animate={{
          y: [0, 30, 0],
          rotate: [0, 10, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div className="relative w-24 h-24">
          {/* Cube shape */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg opacity-80 transform -rotate-12 shadow-2xl" />
          <div className="absolute inset-2 bg-gradient-to-br from-cyan-300 to-blue-400 rounded-lg transform rotate-6" />
        </div>
      </motion.div>

      {/* 3D Geometric Elements - Right Side */}
      <motion.div
        className="absolute top-1/3 right-12 hidden lg:block"
        animate={{
          y: [0, -40, 0],
          rotate: [0, -15, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div className="relative w-32 h-32">
          {/* Gradient sphere */}
          <div className="absolute inset-0 bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600 rounded-full opacity-70 shadow-2xl blur-sm" />
          <div className="absolute inset-4 bg-gradient-to-tr from-pink-300 to-purple-400 rounded-full opacity-60" />
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        className="relative z-10 w-full max-w-md"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Premium Glass card with enhanced backdrop blur */}
        <motion.div
          className="bg-gradient-to-br from-white/20 via-white/10 to-white/5 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/30 relative overflow-hidden"
          whileHover={{ 
            boxShadow: '0 30px 60px -12px rgba(59, 130, 246, 0.4)',
            scale: 1.01,
          }}
          transition={{ duration: 0.3 }}
        >
          {/* Inner glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-transparent to-purple-400/5 rounded-3xl pointer-events-none" />
          {/* Lock Icon */}
          <motion.div
            className="flex justify-center mb-8 relative z-10"
            variants={iconVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div 
              className="p-4 bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 rounded-full shadow-lg"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Lock className="w-8 h-8 text-white drop-shadow-lg" />
            </motion.div>
          </motion.div>

          {/* Content - Reset Form or Success State */}
          {!isSubmitted ? (
            <>
              {/* Heading */}
              <motion.div
                className="text-center mb-8 relative z-10"
                custom={0.15}
                variants={contentVariants}
                initial="hidden"
                animate="visible"
              >
                <h2 className="text-4xl font-black text-white mb-3 text-balance bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text">
                  Reset Your Password
                </h2>
                <p className="text-white/60 text-base leading-relaxed">
                  Don&apos;t worry! We&apos;ll help you to recover your account in a few easy steps.
                </p>
              </motion.div>

              {/* Email Input */}
              <motion.div
                className="mb-8 relative z-10"
                custom={0.25}
                variants={contentVariants}
                initial="hidden"
                animate="visible"
              >
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/30 transition-all duration-300 backdrop-blur-sm hover:bg-white/15 text-xl"
                    disabled={isLoading}
                  />
                </div>
              </motion.div>

              {/* Submit Button */}
              <motion.button
                onClick={handleSubmit}
                disabled={!email || isLoading}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-700 disabled:from-gray-600 disabled:via-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl relative z-10 border border-white/20"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                custom={0.35}
                initial="hidden"
                animate="visible"
              >
                {isLoading ? (
                  <>
                    <motion.div
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Reset Password</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>

              {/* Footer Link */}
                <motion.div 
                    className="text-center mt-6 relative z-10"
                    custom={0.45}
                    variants={contentVariants}
                    initial="hidden"    
                    animate="visible"
                >
                    <p className="text-white/60 text-sm">
                        Remember your password? <a href="/login" className="text-blue-400 hover:text-blue-500 transition-colors font-bold">Login here</a>
                    </p>
                </motion.div>
            </>
          ) : (
            // Success State
            <motion.div
              className="text-center py-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div
                className="flex justify-center mb-4"
                variants={successVariants}
                initial="hidden"
                animate="visible"
              >
                <CheckCircle className="w-16 h-16 text-emerald-400" />
              </motion.div>

              <motion.h3
                className="text-2xl font-bold text-white mb-2"
                custom={0.1}
                variants={contentVariants}
                initial="hidden"
                animate="visible"
              >
                Check your email!
              </motion.h3>

              <motion.p
                className="text-white/70 text-sm mb-4"
                custom={0.2}
                variants={contentVariants}
                initial="hidden"
                animate="visible"
              >
                We&apos;ve sent password reset instructions to {email}
              </motion.p>

              <motion.div
                className="h-1 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 2.5, ease: 'easeInOut' }}
              />
            </motion.div>
          )}
        </motion.div>

        {/* Floating squares */}
       
       
      </motion.div>

      {/* Footer Social Links */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-6 z-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        {/* Copyright text */}
        <p className="text-white/50 text-xs text-center max-w-xs">
           © {new Date().getFullYear()} SafeRaho. All rights reserved. | <a href="#" className="hover:text-white/80 transition-colors">Privacy Policy</a>
        </p>
      </motion.div> 
    </div>
  );
}