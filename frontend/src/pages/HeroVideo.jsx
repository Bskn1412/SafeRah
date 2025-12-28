import React from "react";

const HeroVideo = () => {
  return (
    <div className="relative w-full h-[70vh] overflow-hidden bg-black">
      {/* Video */}
      <video
        className="absolute inset-0 bg-black/30 backdrop-blur-md"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      >
        <source src="/hero.mp4" type="video/mp4" />
      </video>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/1 via-black/50 to-black pointer-events-none" />

      {/* Overlay Content */}
      <div className="relative z-10 flex items-center justify-center h-full">
        <h1 className="text-white text-5xl md:text-7xl font-bold text-center drop-shadow-lg">
          {/* Your text here */}
        </h1>
      </div>
    </div>
  );
};

export default HeroVideo;
