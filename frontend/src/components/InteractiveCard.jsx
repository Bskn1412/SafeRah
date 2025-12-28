"use client"

import React, { useState } from "react";

export function InteractiveCard({ children, className = "" }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative transition-all duration-300 ${
        isHovered ? "scale-105" : "scale-100"
      } ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </div>
  );
}
