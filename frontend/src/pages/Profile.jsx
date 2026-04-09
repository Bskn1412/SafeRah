import { useState, useRef } from "react";
import { User, LogOut, Bell, Settings } from "lucide-react";

export default function ProfileDropdown({ user, handleLogout }) {
  const [showProfile, setShowProfile] = useState(false);
  const dropdownRef = useRef(null);

  return (
    <>
      {/* Profile Button */}
      <div className="fixed top-6 right-6 z-50">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowProfile((prev) => !prev);
          }}
          className="relative w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center shadow-lg hover:scale-105 transition cursor-pointer"
        >
          <User className="w-5 h-5 text-white" />

          {/* Online indicator */}
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full"></span>
        </button>
      </div>

      {/* Overlay */}
      {showProfile && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-md z-40"
          onClick={() => setShowProfile(false)}
        />
      )}

      {/* Dropdown */}
      {showProfile && (
        <div
          ref={dropdownRef}
          className="absolute right-6 top-24 w-80 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-slate-700 shadow-2xl z-50 overflow-hidden"
        >
          {/* Top Section */}
          <div className="p-5 border-b border-slate-800 flex items-center gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>

            {/* User Info */}
            <div className="flex-1">
              <p className="text-white font-semibold text-2xl truncate">
                {user?.name || "Guest User"}
              </p>
              <p className="text-slate-400 text-xs truncate">
                {user?.email || "No email"}
              </p>
            </div>
          </div>

          {/* Menu */}
          <div className="p-3 space-y-1">

            <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition">
              <Bell className="w-4 h-4" />
              Notifications
            </button>

            <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition">
              <Settings className="w-4 h-4" />
              Settings
            </button>

          </div>

          {/* Divider */}
          <div className="border-t border-slate-800" />

          {/* Logout */}
          <div className="p-3">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </>
  );
}