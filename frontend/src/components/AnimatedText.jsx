import React, { useEffect, useRef, useState } from "react";

export function AnimatedText({
  words = [],
  className = "",
  typingSpeed = 850,
  pause = 800,
  cursorBlinkCount = 3,
  cursorBlinkSpeed = 500,
}) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(entry.target);
      }
    });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let index = 0;
    let typingInterval;

    const typeWord = () => {
      const word = words[currentWordIndex];
      typingInterval = setInterval(() => {
        if (index < word.length) {
          // Show typed characters with cursor after last character
          setDisplayedText(word.substring(0, index + 1) + "|");
          index++;
        } else {
          clearInterval(typingInterval);

          // Blink cursor at end of word
          let blinkCount = 0;
          const blinkInterval = setInterval(() => {
            setDisplayedText((prev) =>
              prev.endsWith("|") ? prev.slice(0, -1) : prev + "|"
            );
            blinkCount++;
            if (blinkCount >= cursorBlinkCount * 2) {
              clearInterval(blinkInterval);
              setDisplayedText(""); // reset for next word
              setCurrentWordIndex((prev) => (prev + 1) % words.length);
            }
          }, cursorBlinkSpeed);
        }
      }, typingSpeed);
    };

    typeWord();

    return () => clearInterval(typingInterval);
  }, [isVisible, currentWordIndex, words, typingSpeed, pause, cursorBlinkCount, cursorBlinkSpeed]);

  return (
    <span ref={ref} className={className}>
      {displayedText}
    </span>
  );
}
