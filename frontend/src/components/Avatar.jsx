import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

export function Avatar() {
  const [isOpen, setIsOpen] = useState(false);
  const [ripples, setRipples] = useState([]);
  const containerRef = useRef(null);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Ripple effect
  const createRipple = (e) => {
    const button = e.currentTarget;
    const size = button.offsetWidth;
    const rect = button.getBoundingClientRect();

    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const newRipple = { x, y, size, key: Date.now() };
    setRipples((prev) => [...prev, newRipple]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.key !== newRipple.key));
    }, 600);
  };

  return (
    <div
      ref={containerRef}
    >
      {/* Avatar Button */}
      <button
        onClick={(e) => {
          createRipple(e);
          setIsOpen((v) => !v);
        }}
        className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center hover:shadow-lg hover:shadow-indigo-400/50 transition-all duration-300 cursor-pointer"
      >
        {/* Ripples */}
        {ripples.map((r) => (
          <span
            key={r.key}
            style={{
              top: r.y,
              left: r.x,
              width: r.size,
              height: r.size,
            }}
            className="absolute bg-white opacity-30 rounded-full animate-ripple pointer-events-none cursor-pointer"
          />
        ))}

        {/* Avatar Icon */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="7" r="5" />
          <path d="M3 22c0-4.4 4-7 9-7s9 2.6 9 7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      <div
        ref={menuRef}
        className={`
          absolute right-0 mt-8 w-60 bg-gray-900 rounded-lg
          border border-gray-700 shadow-lg overflow-hidden
          transition-all duration-700 ease-out
          ${isOpen
            ? "opacity-100 translate-y-0 max-h-60"
            : "opacity-0 -translate-y-2 max-h-0 pointer-events-none"}
        `}
      >
        <Link
          to="/login"
          onClick={() => setIsOpen(false)}
          className="block p-4 text-xl hover:bg-gray-700"
        >
          Sign In
        </Link>
        <Link
          to="/register"
          onClick={() => setIsOpen(false)}
          className="block p-4 text-xl hover:bg-gray-700"
        >
          Sign Up
        </Link>
        <Link
          to="/help"
          onClick={() => setIsOpen(false)}
          className="block p-4 text-xl hover:bg-gray-700"
        >
          Help
        </Link>
      </div>

      {/* Ripple CSS */}
      <style>{`
        @keyframes ripple {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
        .animate-ripple {
          transform: scale(0);
          animation: ripple 0.6s linear;
        }
      `}</style>
    </div>
  );
}
