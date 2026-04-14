import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, LogOut, Bell, Settings, ChevronRight, Edit, Shield } from "lucide-react";

export default function ProfileDropdown({ user, handleLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const menuVariants = {
    hidden: { opacity: 0, scale: 0.95, y: -10 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.2, ease: "easeOut" },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -10,
      transition: { duration: 0.15 },
    },
  };

  return (
    <>
      {/* Profile Trigger Button */}
      <div className="fixed top-6 right-6 z-50">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen((prev) => !prev)}
          className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 flex items-center justify-center shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 ring-2 ring-white/20 cursor-pointer"
        >
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-full h-full rounded-2xl object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <User className="w-6 h-6 text-white" />
            </div>
          )}

          {/* Online Status */}
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-400 rounded-full border-[3px] border-slate-950" />
        </button>
      </div>

      {/*  Blur when dropdown is open */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Dropdown with AnimatePresence */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={menuVariants}
            className="fixed top-24 right-6 w-80 z-50"
          >
            <div className="bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden">
              {/* Profile Header */}
              <div className="p-6 border-b border-slate-800/80 flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-semibold shadow-inner">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white text-xl font-semibold truncate">
                    {user?.name || "Guest User"}
                  </p>
                  <p className="text-slate-400 text-sm truncate">
                    {user?.email || "user@example.com"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-emerald-400 text-xs font-medium">Online</span>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-3">
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-300 hover:bg-white/5 active:bg-white/10 transition-all group">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">Notifications</p>
                    <p className="text-xs text-slate-500">Manage alerts</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition" />
                </button>

                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-300 hover:bg-white/5 active:bg-white/10 transition-all group">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">Settings</p>
                    <p className="text-xs text-slate-500">Account preferences</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition" />
                </button>

                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-300 hover:bg-white/5 active:bg-white/10 transition-all group">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                    <Edit className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">Edit Profile</p>
                    <p className="text-xs text-slate-500">Update your information</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition" />
                </button>

                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-300 hover:bg-white/5 active:bg-white/10 transition-all group">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">Security</p>
                    <p className="text-xs text-slate-500">Two-factor & sessions</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition" />
                </button>
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent my-1" />

              {/* Logout Button */}
              <div className="p-3">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleLogout?.();
                  }}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-medium transition-all active:scale-[0.985] cursor-pointer group"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}