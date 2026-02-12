import { useState, useRef, useEffect } from "react";
import { X, Flag } from "lucide-react";

const countries = [
  "United States",
  "Canada",
  "United Kingdom",
  "Germany",
  "France",
  "India",
  "Australia",
  "Japan",
  "China",
  "Brazil",
];

export default function CountrySelector({ selected, setSelected }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>

      {/* Selected / input box */}
      <div
        className="flex items-center justify-between bg-black/20 border border-cyan-500/30 rounded-lg px-3 py-2 cursor-pointer hover:border-emerald-400 transition"
        onClick={() => setIsOpen((prev) => !prev)}
      >

       <div className="flex items-center gap-3 text-white">
            <Flag className="text-cyan-400 w-5 h-5 shrink-0" />
            <span className="truncate">
                {selected || "Select your country"}
            </span>
        </div>

        {/* {selected && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelected("");
            }}
            className="text-white hover:text-red-400"
          >
            <X className="w-4 h-4" />
          </button>
        )} */}
      </div>

      {/* Dropdown list */}
      {isOpen && (
        <ul className="absolute z-20 w-full bottom-full mb-1 max-h-60 overflow-y-auto bg-black border border-emerald-500/30 rounded-lg shadow-lg">
          {countries.map((country, idx) => (
            <li
              key={idx}
              onClick={() => {
                setSelected(country);
                setIsOpen(false);
              }}
              className={`px-4 py-2 cursor-pointer hover:bg-gray-400/30 ${
                country === selected ? "bg-cyan-600/30" : ""
              } transition`}
            >
              {country}
            </li>
          ))}
        </ul>
      )}

      {/* Optional helper text */}
      <p className="mt-2 text-sm text-white/70">
        For compliance reasons, we're required to collect country information to send you occasional updates and announcements.
      </p>
    </div>
  );
}


