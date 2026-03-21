const HeroVideo = () => {
  return (
    <div className="relative w-full h-[60vh] sm:h-[70vh] md:h-[80vh] overflow-hidden bg-black">
      
      {/* Video */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      >
        <source src="/hero.mp4" type="video/mp4" />
      </video>

      {/* Dark Overlay Gradient */}
      <div className="absolute inset-0 bg-linear-to-b from-black/30 via-black/50 to-black/80 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center h-full px-4">
      </div>
    </div>
  );
};

export default HeroVideo;