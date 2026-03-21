"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const toggle = () => {
      setVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", toggle);
    return () => window.removeEventListener("scroll", toggle);
  }, []);

  const scrollTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollTop}
      className="fixed bottom-6 right-3 z-50 p-3 rounded-full
      bg-gradient-to-r from-cyan-400 to-blue-400
      text-black shadow-lg hover:scale-110 transition cursor-pointer"
    >
     <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5"/>
    </button>
  );
}