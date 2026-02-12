import { useEffect, useRef } from "react";

export default function OTPInput({ otp, setOtp, onComplete, disabled }) {
  const inputsRef = useRef([]);

  // Focus first box on mount
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const handleChange = (value, index) => {

    const upperValue = value.toUpperCase();
    if (!/^[A-Z]?$/.test(upperValue)) return;

    const otpArray = otp.split("");
    otpArray[index] = upperValue;
    const newOtp = otpArray.join("");
    setOtp(newOtp);

    // move focus
    if (value && index < 5) inputsRef.current[index + 1]?.focus();

    // auto-submit
    if (newOtp.length === 6 && !newOtp.includes("")) onComplete();
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      const otpArray = otp.split("");
      if (otpArray[index]) {
        otpArray[index] = "";
        setOtp(otpArray.join(""));
      } else if (index > 0) {
        otpArray[index - 1] = "";
        setOtp(otpArray.join(""));
        inputsRef.current[index - 1]?.focus();
      }
    }
  };

  return (
    <div className="grid grid-cols-6 gap-2 sm:gap-3 w-full max-w-sm mx-auto">
      {Array.from({ length: 6 }).map((_, index) => (
        <input
          key={index}
          ref={(el) => (inputsRef.current[index] = el)}
          value={otp[index] || ""}
          onChange={(e) => handleChange(e.target.value, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          disabled={disabled}
          maxLength={1}
          autoCapitalize="characters"
          autoComplete="one-time-code"
          className=" uppercase
            aspect-3/4 w-full text-center text-base sm:text-xl
            font-bold rounded-xl bg-black/30
            border border-cyan-500/40
            focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40
            text-white transition
          "
        />
      ))}
    </div>
  );
}
