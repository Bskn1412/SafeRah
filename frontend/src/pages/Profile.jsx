import { useState, useEffect, useRef } from "react";
import { User } from "lucide-react";

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
            setShowProfile(prev => !prev);
          }}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center hover:scale-105 transition cursor-pointer"
        >
          <User className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Blur Overlay */}
      {showProfile && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-md z-30"
          onClick={() => setShowProfile(false)}
        />
      )}


      {/* Profile Dropdown */}
      {showProfile && (
        <div
          ref={dropdownRef}
          className="absolute right-6 top-24 w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl p-6 z-40"
        >
          <div className="mb-4">
            <p className="font-semibold text-white text-sm leading-tight">
              Welcome, 
              <span className="text-emerald-400 font-serif text-3xl ml-1">
                {user.name}
              </span>
            </p>
            <p className="mt-2 text-sm text-slate-400">{user.email}</p>
          </div>

          <div>
            <button
        
              className=" text-red-300 rounded-lg transition mb-5 cursor-pointer"
            >
              Notifications
            </button>
          </div>
          

          <div>
            <button
            
              className=" text-red-300 rounded-lg transition mb-5 cursor-pointer"
            >
              Logout
            </button>
          </div>
          


          <button
            onClick={handleLogout}
            className="w-full py-2 bg-red-900/50 hover:bg-red-800/50 text-red-300 rounded-lg transition cursor-pointer"
          >
            Logout
          </button>
        </div>
      )}
    </>
  );
}
