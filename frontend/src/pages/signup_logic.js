// frontend/src/pages/signup_logic.js
import { useState, useEffect } from "react";
import { api } from "../api";
import { ensureKeys } from "../crypto/ensureKeys";
import { generateRecoveryPhrase, wrapMasterKeyWithRecovery } from "../crypto/recovery";
import jsPDF from "jspdf";
import { toast } from "react-toastify";
import "../toast.css";

export function signupLogic(form, isLoading, setIsLoading, passwordHints) {
  const [showRecovery, setShowRecovery] = useState(false);
  const [mnemonic, setMnemonic] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [masterKey, setMasterKey] = useState(null);

  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);


  const email =
  form.email?.toLowerCase().trim() ||
  localStorage.getItem("pendingVerificationEmail");



  const errorMap = {
  MISSING_FIELDS: "Please fill in all fields",
  WEAK_PASSWORD: "Password must be at least 8 characters",
  EMAIL_EXISTS: "This email is already registered",
  INVALID_CREDENTIALS: "Email or password is incorrect",
  ACCOUNT_LOCKED: "Your account is temporarily locked",
  SERVER_ERROR: "Server error. Try again later",
};




 
  const submit = async (e) => {
  e.preventDefault();
  if (isLoading) return;

  if (!form.name || !form.email || !form.password) {
    toast.error("Please fill in all fields");
    return;
  }

  // ✅ Frontend password validation
  if (form.password.length < 8) {
    toast.error("Password must be at least 8 characters");
    return;
  }

  setIsLoading(true);

  try {
    await api.post("/auth/register", {
      name: form.name.trim(),
      email: form.email.toLowerCase().trim(),
      password: form.password,
    });

    localStorage.setItem("pendingVerificationEmail", form.email);
    setShowOtp(true);

    // const vault = await ensureKeys(form.password, { createIfMissing: true });
    // setMasterKey(vault.masterKey);

    // const phrase = generateRecoveryPhrase();
    // setMnemonic(phrase);
    // // setShowRecovery(true);
    // setShowOtp(true);

  } catch (err) {
    const code = err.response?.data?.code;

    toast.error(
      errorMap[code] ||
      err.response?.data?.message ||
      "Unable to create account"
    );

  } finally {
    setIsLoading(false);
  }
};

  // *** Email verification logic ***
   const handleVerifyOtp = async () => {
    if (!otp) return;

    setOtpLoading(true);

    try {
      const pendingEmail = localStorage.getItem("pendingVerificationEmail");
      await api.post("/auth/verifyEmail", {
        email: pendingEmail || form.email,
        otp,
      });

      // Generate keys AFTER verification
      const vault = await ensureKeys(form.password, { createIfMissing: true });
      setMasterKey(vault.masterKey);

      const phrase = generateRecoveryPhrase();
      setMnemonic(phrase);

      setShowOtp(false);
      setShowRecovery(true);

      toast.success("Email verified! Now set up your recovery options.");

      // Clear pending email flag
      localStorage.removeItem("pendingVerificationEmail");

    } catch (err) {
      if (err.response?.status === 404) {
        localStorage.removeItem("pendingVerificationEmail");
        setShowOtp(false);
      }
      toast.error(
        err.response?.data?.code === "OTP_EXPIRED"
          ? "Verification code expired"
          : "Invalid verification code"
      );
    } finally {
      setOtpLoading(false);
    }
   };


//   useEffect(() => {
//   const pendingEmail = localStorage.getItem("pendingVerificationEmail");
//   if (pendingEmail) {
//     setShowOtp(true);
//   }
// }, []);


// Resend OTP logic with timer
const [resendTimer, setResendTimer] = useState(60);
const [canResend, setCanResend] = useState(false);

// inside your signupLogic useEffect for OTP persistence
// Initialize timer from localStorage
  useEffect(() => {
    if (!showOtp || !email) return;

    const lastSent = parseInt(localStorage.getItem(`otpLastSent-${email}`)) || 0;
    const now = Date.now();
    const diff = Math.floor((now - lastSent) / 1000);

    if (diff >= 60) {
      setCanResend(true);
      setResendTimer(0);
    } else {
      setCanResend(false);
      setResendTimer(60 - diff);

      const interval = setInterval(() => {
        setResendTimer((t) => {
          if (t <= 1) {
            clearInterval(interval);
            setCanResend(true);
            return 0;
          }
          return t - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [showOtp, email]);

const handleResendOtp = async () => {
    if (!canResend || !email) return;

    try {
      await api.post("/auth/resend-otp", { email });

      const now = Date.now();
      localStorage.setItem(`otpLastSent-${email}`, now.toString());

      setCanResend(false);
      setResendTimer(60);

      const interval = setInterval(() => {
        setResendTimer((t) => {
          if (t <= 1) {
            clearInterval(interval);
            setCanResend(true);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } catch (err) {
      console.error(err);
    }
  };



  /*  Recovery Logic */
  const handleConfirmRecovery = async () => {
    if (!confirmed) return;
    if (!(masterKey instanceof Uint8Array) || masterKey.length !== 32) {
      toast.error("Internal error: master key missing");
      return;
    }

    setRecoveryLoading(true);
    
    try {
      const wrapped = await wrapMasterKeyWithRecovery(masterKey, mnemonic);
      await api.post("/auth/enable-recovery", wrapped);
      masterKey.fill(0);
      setMasterKey(null);

      window.location.href = "/authenticator";

    } catch (err) {
      console.error(err);
      toast.error("Failed to save recovery key");
      setRecoveryLoading(false);
    }
  };

  const handleCopyPhrase = () => {
    navigator.clipboard.writeText(mnemonic);
    toast.success("Recovery phrase copied!");
  };

 const handleDownloadPDF = () => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = 20;

  const canonical = mnemonic.trim().toLowerCase().replace(/\s+/g, " ");
  const words = canonical.split(" ");

  /* ================= HEADER ================= */
  doc.setFillColor(15, 23, 42); // dark navy
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setFont("helvetica", "bold"); 
  doc.setFontSize(24);
  doc.setTextColor(56, 189, 248); // cyan
  doc.text("SafeRaho", margin, 25);

  doc.setFontSize(14);
  doc.setTextColor(226, 232, 240); // light gray
  doc.text("Recovery Phrase Backup", margin, 33);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(147, 51, 234); // violet
  doc.text(`${form.email}`, pageWidth - margin, 25, {
    align: "right",
  });

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Created on ${new Date().toLocaleDateString('en-US', { month: 'long' })}, ${((d) => d + (d > 3 && d < 21 ? 'th' : ['th', 'st', 'nd', 'rd'][d % 10] || 'th'))(new Date().getDate())}, ${new Date().getFullYear()}`,
    pageWidth - margin,
    33,
    { align: "right" }
  );

  y = 55;

  /* ================= WARNING BOX ================= */
  doc.setFillColor(254, 243, 199); // soft amber
  doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 3, 3, "F");

  doc.setFontSize(11);
  doc.setTextColor(146, 64, 14); // dark amber
  doc.setFont("helvetica", "bold");
  doc.text("IMPORTANT SECURITY NOTICE", margin + 4, y + 7);

  doc.setFont("helvetica", "normal");
  doc.text(
    "Anyone with this recovery phrase can fully access your vault.\nStore it offline. Never upload, email, or share it with anyone.",
    margin + 4,
    y + 13
  );

  y += 35;

  /* ================= RECOVERY PHRASE BOX ================= */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text("Recovery Phrase", margin, y);

  y += 6;

  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 60, 4, 4, "FD");

  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);

  words.forEach((word, i) => {
    const colWidth = (pageWidth - margin * 2) / 2;
    const x = margin + (i % 2 === 0 ? 6 : colWidth + 6);
    doc.text(`${i + 1}. ${word}`, x, y);
    if (i % 2 === 1) y += 8;
  });

  y += 15;

  /* ================= CANONICAL FORMAT ================= */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Canonical Format (for recovery)", margin, y);

  y += 6;
  doc.setFont("courier", "normal");
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 3, 3, "F");
  doc.text(canonical, margin + 4, y + 8, {
    maxWidth: pageWidth - margin * 2 - 8,
  });

  y += 28;

  /* ================= SAFE STORAGE TIPS ================= */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text("Safe Storage Tips", margin, y);

  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);

  const tips = [
    "• Write the phrase on paper and store it in a secure location",
    "• Never store this file on cloud services or email",
    "• Do not take screenshots or photos of the phrase",
    "• Consider keeping a second copy in a separate physical location",
    "• Anyone with this phrase has full access to your vault",
  ];

  tips.forEach(tip => {
    doc.text(tip, margin, y);
    y += 6;
  });

  /* ================= FOOTER ================= */
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generated on ${new Date().toLocaleString()}`,
    margin,
    pageHeight - 12
  );
  doc.text(
    "SafeRaho never stores or can recover this phrase for you.",
    margin,
    pageHeight - 6
  );

  toast.success("Recovery phrase downloaded securely");

  doc.save(
    `SafeRaho-Recovery-Phrase-${new Date().toISOString().split("T")[0]}.pdf`
  );
};

   const words = mnemonic ? mnemonic.trim().split(/\s+/) : [];

  return {
    submit,
    handleVerifyOtp,
    handleResendOtp,
    resendTimer,
    canResend,
    showRecovery,
    otp,
    setOtp,
    otpLoading,
    showOtp,
    mnemonic,
    confirmed,
    setConfirmed,
    recoveryLoading,
    handleConfirmRecovery,
    handleCopyPhrase,
    handleDownloadPDF,
    words,
  };
}