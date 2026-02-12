"use client";

import { useState, useEffect, useRef } from "react";
import { Lock, Unlock, Upload, Download, Shield, FileIcon, X, MoreVertical, Info } from "lucide-react";
import { unlockVault, tryAutoUnlock, lockVault, isUnlocked } from "../crypto/vault";
import { encryptFile, decryptFileData } from "../crypto/files";
import { motion, AnimatePresence } from "framer-motion";
import "../global.css";

import { encryptFileChunks } from "../crypto/chunks"; // <-- your chunked encrypt function
import { v4 as uuidv4 } from "uuid"; // to generate uploadId
import { decryptChunk } from "../crypto/files";
import ProfileDropdown from "./Profile";

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes

export default function Dashboard() {
  const [status, setStatus] = useState("Checking vault...");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredFile, setHoveredFile] = useState(null);
  const [showProfile, setShowProfile] = useState(false);

  const [user, setUser] = useState({ id: null, name: "", email: "", });

  const [errorMessage, setErrorMessage] = useState("");

  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [vaultPassword, setVaultPassword] = useState("");
  const [unlockError, setUnlockError] = useState(null);

  const [unlocked, setUnlocked] = useState(false);

  const [isClosing, setIsClosing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false); // controls mount/unmount

  const [openMenuFor, setOpenMenuFor] = useState(null); 

  const [uploadProgress, setUploadProgress] = useState({}); 

  const timeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  /* -------------------- Helpers -------------------- */

  const resetTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      lockVault();
      setUnlocked(false);
      setUploadedFiles([]);
      setStatus("Auto-locked after inactivity");
    }, INACTIVITY_TIMEOUT);
  };

  const fetchFiles = async () => {
  try {
    const res = await fetch("http://localhost:5000/api/files/list", {
      credentials: "include",
    });

    if (!res.ok) throw new Error("List failed");

    const data = await res.json();
    console.log("📥 Files received from backend:", data);

    setUploadedFiles(data);
  } catch (err) {
    console.error("❌ File list error:", err);
    setStatus("Failed to load files");
  }
};

  useEffect(() => {
  const fetchUser = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/auth/me", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();

      setUser({
        id: data.id || data._id || data.accountId,
        name: data.name || "User",
        email: data.email || "",
      });

    } catch {}
  };
  fetchUser();
}, []);


  /* -------------------- Upload -------------------- */

 const handleUpload = async (e) => {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  setIsLoading(true);
  setStatus("Encrypting and uploading...");

  // Helper: upload with progress (XHR)
  const uploadChunkWithProgress = (url, formData, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.withCredentials = true;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(event.loaded / event.total);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed: ${xhr.status}`));
      };

      xhr.onerror = () => reject(new Error("Network error"));

      xhr.send(formData);
    });
  };

  try {
    for (const file of files) {
      const uploadId = uuidv4();

      // Init progress UI
      setUploadProgress((prev) => ({
        ...prev,
        [uploadId]: { name: file.name, progress: 0 },
      }));

      setStatus(`Encrypting ${file.name}...`);

      // Encrypt in chunks
      const { encryptedChunks, crypto } = await encryptFileChunks(file);

      // Precompute total encrypted bytes for smooth progress
      const totalBytes = encryptedChunks.reduce(
        (sum, c) => sum + c.data.byteLength,
        0
      );

      let uploadedBytes = 0;

      // Upload chunks sequentially
      for (const chunk of encryptedChunks) {
        const formData = new FormData();
        formData.append("uploadId", uploadId);
        formData.append("accountId", user.id);
        formData.append("fileName", file.name);
        formData.append("chunkIndex", chunk.index);
        formData.append("chunkData", new Blob([chunk.data]));
        formData.append("chunkNonce", chunk.nonce);
        formData.append("totalChunks", crypto.totalChunks);
        formData.append("keyNonce", crypto.keyNonce);
        formData.append("fileKeyCipher", crypto.fileKeyCipher);

        if (chunk.index === 0) {
          formData.append("plainSize", file.size.toString());
        }

        setStatus(
          `Uploading ${file.name}: chunk ${chunk.index + 1}/${encryptedChunks.length}`
        );

        await uploadChunkWithProgress(
          "http://localhost:5000/api/files/upload-chunk",
          formData,
          (fraction) => {
            const currentChunkUploaded = Math.floor(
              chunk.data.byteLength * fraction
            );

            const totalSoFar = uploadedBytes + currentChunkUploaded;

            const percent = Math.min(
              99, // keep under 100% until finalize step
              Math.floor((totalSoFar / totalBytes) * 100)
            );

            setUploadProgress((prev) => ({
              ...prev,
              [uploadId]: { name: file.name, progress: percent },
            }));
          }
        );

        // After this chunk completes, lock in its bytes
        uploadedBytes += chunk.data.byteLength;
      }

      // Finalize upload on backend
      await fetch("http://localhost:5000/api/files/complete-upload", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId, fileName: file.name, accountId: user.id }),
      });

      // Mark 100% only after finalize completes
      setUploadProgress((prev) => ({
        ...prev,
        [uploadId]: { name: file.name, progress: 100 },
      }));
    }

    await fetchFiles();
    setStatus("All uploads complete");
  } catch (err) {
    console.error(err);
    setErrorMessage(err.message || "Upload failed");
    setStatus("Upload failed");
  } finally {
    setIsLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }
};

  /* -------------------- Download -------------------- */

  const downloadFile = async (file) => {
  try {
    setIsLoading(true);
    setStatus(`Decrypting ${file.name}...`);

    const res = await fetch(
      `http://localhost:5000/api/files/download?id=${file.id}`,
      {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Download failed: ${res.status} - ${text}`);
    }

    const data = await res.json();
    const { encryptedChunks, metadata } = data;

    if (!encryptedChunks?.length || !metadata) {
      throw new Error("Download incomplete: missing chunks or metadata");
    }

    const decryptedParts = [];

    for (const chunk of encryptedChunks.sort((a, b) => a.index - b.index)) {
      const plain = await decryptChunk(
        chunk.data,
        chunk.nonce,
        metadata.keyNonce,
        metadata.fileKeyCipher
      );
      decryptedParts.push(plain);
    }

    // Concatenate decrypted chunks
    const totalLen = decryptedParts.reduce((sum, p) => sum + p.length, 0);
    const decrypted = new Uint8Array(totalLen);

    let offset = 0;
    for (const part of decryptedParts) {
      decrypted.set(part, offset);
      offset += part.length;
    }

    const blob = new Blob([decrypted], {
      type: metadata.mimeType || "application/octet-stream",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setStatus("Download complete");
  } catch (err) {
    console.error(err);
    setErrorMessage(err.message);
    setStatus("Download failed");
  } finally {
    setIsLoading(false);
  }
};

/* -------------------- Delete --------------------  */

const deleteFile = async (file) => {
  if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) return;

  try {
    setIsLoading(true);
    setStatus(`Deleting ${file.name}...`);

    const res = await fetch(
      `http://localhost:5000/api/files/delete?id=${file.id}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Delete failed: ${res.status} - ${text}`);
    }

    // Optimistic UI update
    setUploadedFiles((prev) => prev.filter((f) => f.id !== file.id));
    setOpenMenuFor(null);
    setStatus("File deleted");
  } catch (err) {
    console.error(err);
    setErrorMessage(err.message || "Delete failed");
    setStatus("Delete failed");
  } finally {
    setIsLoading(false);
  }
};


  /* -------------------- Unlock -------------------- */

  const submitUnlock = async () => {
    console.log("Vault password submitted:", vaultPassword);
    if (!vaultPassword) return "Please enter your vault password.";
    console.log("Attempting to unlock vault with password:", vaultPassword);

    try {
      setUnlockError(null);
      setStatus("Unlocking...");

      await unlockVault(vaultPassword);
      console.log("Vault unlocked with password bjksajhdvkdgkdsjdpdkla:", vaultPassword);

      setUnlocked(true);
      setVaultPassword("");
      setShowUnlockModal(false);

      await fetchFiles();
      // await fetchUser();
      resetTimer();

      setStatus("Unlocked");
    } catch (err) {
      setUnlockError("We couldn’t verify your info. Try again, your data was not shared.");
      setStatus("Incorrect password");
    }
  };

  /* -------------------- Logout -------------------- */

  const handleLogout = () => {
    lockVault();
    setUnlocked(false);
    document.cookie =
      "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "/";
  };

  /* -------------------- Effects -------------------- */

  useEffect(() => {
    if (errorMessage) {
      const t = setTimeout(() => setErrorMessage(""), 4000);
      return () => clearTimeout(t);
    }
  }, [errorMessage]);

  useEffect(() => {
    (async () => {
      const keys = await tryAutoUnlock();
      if (keys) {
        setUnlocked(true);
        setStatus("Auto-unlocked");
        await fetchFiles();
        // await fetchUser();
        resetTimer();
      } else {
        setUnlocked(false);
        setStatus("Vault Locked");
      }
    })();
  }, []);

  useEffect(() => {
    if (!unlocked) return;

    const events = [
      "mousemove",
      "mousedown",
      "scroll",
      "keypress",
      "touchstart",
    ];

    events.forEach((e) =>
      window.addEventListener(e, resetTimer)
    );
    resetTimer();

    return () => {
      events.forEach((e) =>
        window.removeEventListener(e, resetTimer)
      );
      clearTimeout(timeoutRef.current);
    };
  }, [unlocked]);


  /* -------------------- Modal Controls -------------------- */

  // Clear completed uploads from progress state after a delay
  useEffect(() => {
  const completed = Object.entries(uploadProgress).filter(
    ([_, p]) => p.progress === 100
  );

  if (completed.length === 0) return;

  const t = setTimeout(() => {
    setUploadProgress((prev) => {
      const next = { ...prev };
      for (const [id] of completed) delete next[id];
      return next;
    });
  }, 2000); // keep for 2s

  return () => clearTimeout(t);
}, [uploadProgress]);


  const openModal = () => {
    setShowUnlockModal(true);
    setIsModalVisible(true); // mount modal
    setIsClosing(false);
  };

  //close modal with animation, then unmount
const closeModal = () => {
  setIsModalVisible(false);
  setShowUnlockModal(false);
  setVaultPassword("");
  setUnlockError(null);
  setIsClosing(false);

  setTimeout(() => {
    setShowUnlockModal(false); // unmount only this
  }, 300);
};


  useEffect(() => {
    if (!showUnlockModal) {
      setVaultPassword("");
      setUnlockError(null);
      setIsClosing(false);
    }
  }, [showUnlockModal]);



if (!unlocked) {
  return (
    <div className="relative min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 overflow-hidden">

    <ProfileDropdown user={user} handleLogout={handleLogout} />
 
      {/* MAIN CONTENT */}
      <div className="relative z-10 min-h-screen flex flex-col md:flex-row items-center justify-center px-6">
        <div className="max-w-10xl w-full grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-12 items-start">

          {/* LEFT — TEXT / ACTION */}
          <div className="relative rounded-3xl p-10 text-center md:text-left flex flex-col min-h-screen">

            {/* TOP TITLE */}
            <h1 className="text-5xl font-extrabold tracking-tight mb-3 
            bg-gradient-to-r from-pink-300 via-blue-300 to-cyan-400 
            bg-clip-text text-transparent animate-gradientMove">
              SafeRaho Vault
            </h1>

            {/* CENTERED BOX */}
            <div className="flex flex-1 items-center justify-center">
              <div className=" border-emerald-500/30 rounded-3xl p-8 bg-slate-900/30 backdrop-blur-sm text-center md:text-left">

                <p className="text-3xl text-slate-300 mb-8"><Lock className="inline w-8 h-8 text-red-400" />
                  Your vault is <span className="text-lime-300 text-6xl font-semibold">Locked.</span> 
                </p>

                <p className="text-white/70 text-2xl max-w-md mx-auto md:mx-0 mb-8 wrap-break-words">
                  Your files are encrypted and inaccessible without your password.
                </p>

                <p className="mt-2 text-green-400 text-2xl wrap-break-words">
                  Even SafeRaho cannot access your vault.
                </p>
        
                {/* Security Signals 
                <div className="mt-6 flex justify-center md:justify-start gap-6 text-xs text-slate-400">
                  <div className="flex items-center gap-1">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    Zero Knowledge
                  </div>
                  <div className="flex items-center gap-1">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    End-to-End Encrypted
                  </div>
                </div> */}

                <div className="flex items-center justify-center mt-10">
                  <button
                    onClick={openModal}
                    className="mt-18 px-10 py-3 font-semibold
                    bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 
                    text-white rounded-lg border border-emerald-500/50 
                    hover:from-emerald-500/30 hover:to-cyan-500/30 
                    transition-all cursor-pointer">

                    <Unlock className="inline w-5 h-5 mr-2" />
                    Unlock Vault
                  </button>
                </div>

              </div>
            </div>


            </div>
            
          {/* RIGHT — IMAGE / VISUAL  scale-x-[-1] */}
          <div className="relative rounded-3xl overflow-hidden group p-6 group-hover:shadow-emerald-500/10 ">
            <img
              src="/dash3.jpg"
              alt="Vault visual"
              className="w-full h-[600px] md:h-[700px] object-cover rounded-2xl transition-transform duration-700 group-hover:scale-105 border border-yellow-300"/>

            {/* Floating Label */}
            <div className="absolute bottom-6 left-6 bg-slate-900/80 backdrop-blur-md border border-orange-300 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-white">
                Encrypted. Private. Yours.
              </p>
              <p className="text-xs text-slate-400">
                Decrypted only after unlock
              </p>
            </div>
          </div>
        </div>
      </div>


       {/* Modal */}
      <AnimatePresence>
        {isModalVisible && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={closeModal}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />

            {/* Modal Container */}
            <motion.div
              className="relative z-10 w-full max-w-5xl h-auto sm:h-[480px] bg-slate-900/90 border border-emerald-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col sm:flex-row"
              initial={{ scale: 0.9, opacity: 0, y: -30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -30 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
                mass: 1,
              }}
            >
              {/* Close Button */}
              <button
                onClick={closeModal}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 p-2 rounded-full
                  bg-slate-900/70 hover:bg-slate-800
                  border border-slate-700
                  text-slate-300 hover:text-white
                  transition-all duration-200
                  hover:scale-105 cursor-pointer"
              >
              <X className="w-5 h-5" />
              </button>

              {/* LEFT — Password Box */}
              <div className="w-full sm:w-1/2 pt-10 sm:pt-12 pb-8 sm:pb-10 px-6 sm:px-12 flex flex-col">
                <div className="mb-18">
                  <div className="flex items-center gap-3 mb-5">
                    <Unlock className="w-6 h-6 text-emerald-400" />
                    <h2 className="text-4xl font-bold text-white">Unlock SafeRaho Vault</h2>
                  </div>

                  <p className="text-xl text-slate-400 mt-10 wrap-break-words">
                    <Info className="inline w-4 h-4 mr-1 text-red-400" />
                    Your vault is encrypted with your <span className="text-lime-300 font-semibold">Signup Password</span>. We never store or see your password.
                  </p>
                </div>

                <input
                  type="password"
                  placeholder="Vault password"
                  value={vaultPassword}
                  onChange={(e) => setVaultPassword(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-3 mb-8 bg-black/40 border border-emerald-500/40 rounded-lg text-white placeholder-slate-400
                            focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
                />

                {unlockError && <p className="text-red-400 text-sm mb-4">{unlockError}</p>}

                <button
                  onClick={submitUnlock}
                  className="mt-2 w-full py-3 bg-linear-to-r from-emerald-500 to-cyan-500
                            text-black font-semibold rounded-lg hover:opacity-90 transition cursor-pointer"
                >
                  Unlock Vault
                </button>
              </div>

              {/* CENTER DIVIDER */}
              <div className="hidden sm:block w-px bg-linear-to-b from-transparent via-emerald-500/40 to-transparent" />

              {/* RIGHT — Image Panel */}
              <div className="w-full sm:w-1/2 relative h-40 sm:h-full">
                <img
                  src="/dash1.jpg"
                  alt="Vault security"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-br from-slate-950/80 via-slate-900/60 to-slate-950/90" />

                <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-8">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Zero-Knowledge Encryption
                  </h3>
                  <p className="text-slate-400 text-sm max-w-xs">
                    Your password never leaves this device. Files are decrypted only in your browser.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    );
  }

  /* -------------------- Main UI (UNCHANGED) -------------------- */

  // Unlocked View
  return (
    <div className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl opacity-30 animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-3 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="SafeRaho Logo" className="w-25 h-25" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">SafeRaho Vault</h1>
              <p className="text-xs text-emerald-400/80">🔓 Unlocked & Encrypted</p>
            </div>
          </div>
        </div>

      {/* Files Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Upload Section */}
        <div className="mb-12">
          <label className="block cursor-pointer group">
            <div className="border-2 border-dashed border-emerald-500/30 hover:border-emerald-500/60 bg-slate-900/30 hover:bg-slate-900/50 rounded-3xl p-12 transition-all duration-300 backdrop-blur-sm">
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Upload Files</h3>
                <p className="text-slate-400 text-center mb-6 max-w-sm">
                  Drag and drop your files or click to select. All encryption happens in your browser, zero server knowledge.
                </p>
                <div className="px-6 py-3 bg-linear-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 font-medium rounded-lg border border-emerald-500/50 group-hover:from-emerald-500/30 group-hover:to-cyan-500/30 transition-all">
                  Select Files
                </div>
              </div>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleUpload}
                ref={fileInputRef}
                disabled={isLoading}
              />
            </div>
          </label>
        </div>


        {/* Upload Progress */}

        {Object.keys(uploadProgress).length > 0 && (
          <div className="mb-10 space-y-4">
            {Object.entries(uploadProgress).map(([id, p]) => (
              <div
                key={id}
                className="bg-slate-900/50 backdrop-blur-md border border-slate-800/50 rounded-2xl p-5 shadow-lg"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="font-medium text-white truncate">
                    Uploading {p.name}
                  </div>
                  <div className="text-sm text-emerald-400 font-mono">
                    {p.progress}%
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                  <div
                   className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-emerald-500 to-cyan-500 transition-all duration-300 ease-out bg-[length:200%_100%] animate-[gradientMove_2s_linear_infinite]"
                    style={{ width: `${p.progress}%` }}
                  />
                  {/* Glow */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-emerald-400/40 to-cyan-400/40 blur-md"
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}


        {/* Files Grid */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Your Files</h2>
              <p className="text-slate-400 text-sm">
                {uploadedFiles.length} encrypted {uploadedFiles.length === 1 ? "file" : "files"}
              </p>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 text-sm font-medium rounded-lg border border-emerald-500/20">
                ✓ All secure
              </div>
            )}
          </div>

          {uploadedFiles.length === 0 ? (
            <div className="text-center py-16">
              <FileIcon className="w-16 h-16 text-slate-700 mx-auto mb-4 opacity-50" />
              <p className="text-slate-400 text-lg">No files uploaded yet</p>
              <p className="text-slate-500 text-sm mt-2">Your encrypted files will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {uploadedFiles.map((f) => (
                <div
                  key={f.id}
                  onMouseEnter={() => setHoveredFile(f.id)}
                  onMouseLeave={() => setHoveredFile(null)}
                  className="group relative bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 hover:border-emerald-500/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10">

                  {/* File Header with Icon and Menu */ }
                  <div className="flex items-start justify-between mb-4 relative">
                  <div className="w-12 h-12 rounded-xl bg-linear-to-br from-slate-800 to-slate-700 flex items-center justify-center group-hover:from-emerald-500/20 group-hover:to-cyan-500/20 transition-all">
                    <FileIcon className="w-6 h-6 text-emerald-400" />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="px-2 py-1 bg-slate-800/50 text-slate-400 text-xs font-medium rounded-lg">
                      Encrypted
                    </div>

                    {/* 3 dots */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuFor(openMenuFor === f.id ? null : f.id);
                      }}
                     className="p-1.5 rounded-lg hover:bg-slate-800/70 text-slate-400 hover:text-white transition transform hover:scale-105 cursor-pointer">
                      <MoreVertical className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Dropdown menu */}
                  {openMenuFor === f.id && (
                    <div
                      className="absolute right-0 top-10 z-30 w-40 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => deleteFile(f)}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 transition cursor-pointer"
                      >
                        Delete
                      </button>

                      {/* Future actions go here */}
                      {/* 
                      <button className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
                        Rename (soon)
                      </button>
                      */}
                    </div>
                  )}
                </div>


                  <h3 className="font-semibold text-white truncate mb-3 group-hover:text-emerald-300 transition-colors">
                    {f.name}
                  </h3>

                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Size</span>
                      <span className="text-slate-300 font-medium">
                        {(f.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Uploaded</span>
                      <span className="text-slate-300 font-medium">
                        {new Date(f.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => downloadFile(f)}
                    disabled={isLoading || !f.id}
                    className="w-full px-4 py-2.5 bg-linear-to-r from-emerald-500/20 to-cyan-500/30 hover:from-emerald-500/30 hover:to-cyan-500/30 text-emerald-300 hover:text-emerald-200 font-medium rounded-lg transition-all duration-200 border border-emerald-500/30 hover:border-emerald-500/60 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    {hoveredFile === f.id && !isLoading ? "Download" : "Decrypt & Download"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="fixed bottom-6 right-6 px-4 py-3 bg-slate-900/80 backdrop-blur-xl border border-slate-800/50 rounded-xl text-sm text-slate-300 max-w-xs">
        {status}
      </div>

      {/* Back to dashboard */}
      <button
        onClick={() => window.location.href = "/dashboard"}
        className="fixed bottom-6 left-6 px-4 py-3 bg-slate-900/80 backdrop-blur-xl border border-slate-800/50 rounded-xl text-sm text-slate-300  hover:bg-cyan-500 hover:text-white transition-colors duration-300 cursor-pointer"
      >
        ← Back to Dashboard
      </button>
    </div>
  );
}