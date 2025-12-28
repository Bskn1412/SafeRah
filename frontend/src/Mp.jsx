import { useState, useRef, useEffect } from "react";

export default function Mp() {
  const [open, setOpen] = useState(false);

  const menuRef = useRef(null);
  const [menuHeight, setMenuHeight] = useState(0);

  // Menu height animation
  useEffect(() => {
    if (open && menuRef.current) {
      setMenuHeight(menuRef.current.scrollHeight);
    } else {
      setMenuHeight(0);
    }
  }, [open]);

  return (
    <div className="min-h-screen bg-neutral-900 flex items-start p-20 text-white justify-center align-middle">
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="px-4 py-2 rounded bg-white text-black font-medium"
        >
          Open Menu
        </button>

        {/* MENU REVEAL */}
        <div
          style={{ height: menuHeight }}
          className={`absolute right-0 mt-2 w-72 rounded-lg bg-neutral-800 shadow-xl
          overflow-hidden transition-[height,opacity] duration-300 ease-out
          ${open ? "opacity-100" : "opacity-0"}`}
        >
          <div ref={menuRef}>
            <ul className="py-2">
              <li className="px-4 py-2 hover:bg-neutral-700 cursor-pointer">
                Sign In
              </li>
              <li className="px-4 py-2 hover:bg-neutral-700 cursor-pointer">
                Sign Up
              </li>
              <li className="px-4 py-2 hover:bg-neutral-700 cursor-pointer">
                Help
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
