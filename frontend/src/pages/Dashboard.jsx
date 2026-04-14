// frontend/src/pages/Dashboard.js

"use client";

import { useState, useEffect, useRef } from "react";
import { Lock, Unlock, Upload, Download, X, MoreVertical, Info,  
  File,
  FileText,
  FileImage,
  FileArchive,
  FileVideo,
  FileAudio,     
  FileCode,     
  FileSpreadsheet, 
  FileJson
} from "lucide-react";
import { unlockVault, tryAutoUnlock, lockVault, isUnlocked } from "../crypto/vault";
//import { encryptFile, decryptFileData } from "../crypto/files";
import { motion, AnimatePresence } from "framer-motion";
import "../global.css";

import { encryptFileChunks } from "../crypto/chunks"; // <-- your chunked encrypt function
import { v4 as uuidv4 } from "uuid"; // to generate uploadId
import { decryptChunk } from "../crypto/files";
import ProfileDropdown from "./ProfileDropdown";
import { UploadManager } from "./uploadManager";
import { toast } from "react-toastify";

// For Vercel through Render
const API = import.meta.env.VITE_API_URL;
// **************************************

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes

const getFileType = (name) => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (!ext) return "file";

  if (["pdf"].includes(ext)) return "pdf";
  if (["doc", "docx"].includes(ext)) return "doc";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  if (["zip", "rar"].includes(ext)) return "zip";
  if (["mp4", "mov", "avi", "mkv"].includes(ext)) return "video";
  if (["txt", "md"].includes(ext)) return "text";
  if (["xls", "xlsx", "ppt", "pptx", "csv"].includes(ext)) return "spreadsheet";
  if (["js", "py", "java", "c", "cpp", "html", "css"].includes(ext)) return "code";
  if (["mp3", "wav", "flac"].includes(ext)) return "audio";
  if (["json"].includes(ext)) return "json";

  return "file";
};

const FileIcon = ({ type }) => {
  switch (type) {
    case "pdf":
      return <FileText className="w-6 h-6 text-red-500" />;
    case "doc":
      return <FileText className="w-6 h-6 text-blue-500" />;
    case "image":
      return <FileImage className="w-6 h-6 text-green-400" />;
    case "zip":
      return <FileArchive className="w-6 h-6 text-yellow-400" />;
    case "video":
      return <FileVideo className="w-6 h-6 text-purple-400" />;
    case "text":
      return <FileText className="w-6 h-6 text-slate-400" />;
    case "spreadsheet": 
      return <FileSpreadsheet className="w-6 h-6 text-green-400" />;
    case "code":
      return <FileCode className="w-6 h-6 text-cyan-400" />;
    case "audio":
      return <FileAudio className="w-6 h-6 text-pink-400" />;
    case "json":
      return <FileJson className="w-6 h-6 text-purple-400" />;
    default:
      return <File className="w-6 h-6 text-slate-400" />;
  }
};

/* File type label */
const getFileTypeLabel = (file) => {
  if (file?.mimeType && file.mimeType !== "application/octet-stream") {
    return file.mimeType.split("/")[1];
  }

  if (file?.name) {
    return file.name.split(".").pop().toLowerCase();
  }

  return "unknown";
};

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

  const manager = useRef(new UploadManager(3));
  const controllersRef = useRef({});

  const uploadingCount = Object.values(uploadProgress).filter(
    (p) => p.status === "uploading" || p.status === "encrypting"
  ).length;

  const queuedCount = Object.values(uploadProgress).filter(
    (p) => p.status === "queued"
  ).length;

  const [fileToDelete, setFileToDelete] = useState(null);

  const [renameFile, setRenameFile] = useState(null);
  const [newFileName, setNewFileName] = useState("");

  const [infoFile, setInfoFile] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOnlineBanner, setShowOnlineBanner] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const [ping, setPing] = useState(null);

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
    const res = await fetch(`${API}/api/files/list`, {
      credentials: "include",
    });

    if (!res.ok) throw new Error("List failed");

    const data = await res.json();
    // console.log("📥 Files received from backend:", data);

    setUploadedFiles(data);
  } catch (err) {
    console.error("❌ File list error:", err);
    setStatus("Failed to load files");
  }
};

  useEffect(() => {
  const fetchUser = async () => {
    try {
      const res = await fetch(`${API}/api/auth/me`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();

      if (!res.ok) {
        window.location.href = "/login";
      }
    
      if (data.signupStage === "recovery_pending") {
        window.location.href = "/setup-recovery";
        return;
      }

      if (data.signupStage === "mfa_pending") {
        window.location.href = "/setup-2fa";
        return;
      }

      setUser({
        id: data.id,
        name: data.name,
        email: data.email,
      });


    } catch (err) {
      console.error("User fetch error:", err);
    }
  };
  fetchUser();
}, []);

  /* -------------------- Upload -------------------- */

const handleUpload = (e) => {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  files.forEach((file) => {
    const uploadId = uuidv4();

    setUploadProgress((prev) => ({
      ...prev,
      [uploadId]: {
        name: file.name,
        percent: 0,
        status: "queued",
      },
    }));

    manager.current.add(() => uploadSingleFile(file, uploadId));
  });

  if (fileInputRef.current) fileInputRef.current.value = "";
};


const uploadSingleFile = async (file, uploadId) => {
  try {
    setUploadProgress((prev) => ({
      ...prev,
      [uploadId]: { ...prev[uploadId], status: "encrypting" },
    }));

    const { encryptedChunks, crypto } = await encryptFileChunks(file);

    const chunkAssets = [];

    // ✅ ONE controller per file (NOT per chunk)
    const controller = new AbortController();
    controllersRef.current[uploadId] = controller;

    for (const chunk of encryptedChunks) {
      // 🛑 STOP if cancelled
      if (controller.signal.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      const formData = new FormData();
      formData.append("uploadId", uploadId);
      formData.append("fileName", file.name);
      formData.append("chunkIndex", chunk.index);
      formData.append("chunkData", new Blob([chunk.data]));
      formData.append("chunkNonce", chunk.nonce);
      formData.append("totalChunks", encryptedChunks.length);
      formData.append("keyNonce", crypto.keyNonce);
      formData.append("fileKeyCipher", crypto.fileKeyCipher);

      if (chunk.index === 0) {
        formData.append("plainSize", file.size.toString());
      }

      const data = await uploadChunk(
        formData,
        uploadId,
        chunk.index,
        encryptedChunks.length,
        controller
      );

      chunkAssets.push({
        assetId: data.assetId,
        chunkNonce: data.chunkNonce,
        keyNonce: crypto.keyNonce,
        fileKeyCipher: crypto.fileKeyCipher,
      });
    }

    // 🛑 stop if cancelled before finalize
    if (controller.signal.aborted) return;

    await fetch(`${API}/api/files/complete-upload`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadId,
        fileName: file.name,
        totalChunks: encryptedChunks.length,
        chunkAssets,
        plainSize: file.size,
      }),
    });

    setUploadProgress((prev) => ({
      ...prev,
      [uploadId]: {
        ...prev[uploadId],
        percent: 100,
        status: "completed",
      },
    }));

    await fetchFiles();

  } catch (err) {
    if (err.name === "AbortError") return;

    setUploadProgress((prev) => ({
      ...prev,
      [uploadId]: {
        ...prev[uploadId],
        status: "error",
      },
    }));
  } finally {
    // ✅ CLEANUP controller
    delete controllersRef.current[uploadId];
  }
};


const uploadChunk = (formData, uploadId, index, total, controller) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", `${API}/api/files/upload-chunk`);
    xhr.withCredentials = true;

    const token = localStorage.getItem("jwt");
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    // 🔥 Proper abort handling
    const onAbort = () => {
      xhr.abort();
      reject(new DOMException("Aborted", "AbortError"));
    };

    controller.signal.addEventListener("abort", onAbort);

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;

      const percent = Math.floor(
        ((index + e.loaded / e.total) / total) * 100
      );

      setUploadProgress((prev) => ({
        ...prev,
        [uploadId]: {
          ...prev[uploadId],
          percent,
          status: "uploading",
        },
      }));
    };

    xhr.onload = () => {
      controller.signal.removeEventListener("abort", onAbort);

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error("Chunk upload failed"));
      }
    };

    xhr.onerror = () => {
      controller.signal.removeEventListener("abort", onAbort);
      reject(new Error("Network error"));
    };

    xhr.send(formData);
  });
};


const cancelUpload = (id) => {
  if (controllersRef.current[id]) {
    controllersRef.current[id].abort();
  }

  setUploadProgress((prev) => ({
    ...prev,
    [id]: {
      ...prev[id],
      status: "cancelled",
    },
  }));
};

  /* -------------------- Download -------------------- */

 const downloadFile = async (file) => {
  try {
    setIsLoading(true);
    setStatus(`Decrypting ${file.name}...`);

    // Fetch encrypted chunks and metadata
    const res = await fetch(
      `${API}/api/files/download?id=${file.id}`,
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

    // Decrypt each chunk sequentially in memory
    for (const chunk of encryptedChunks.sort((a, b) => a.index - b.index)) {
      const plain = await decryptChunk(
        chunk.data,
        chunk.nonce,
        metadata.keyNonce,
        metadata.fileKeyCipher
      );
      decryptedParts.push(plain);
    }

    // Concatenate all decrypted chunks into a single Uint8Array
    const totalLength = decryptedParts.reduce((sum, p) => sum + p.length, 0);
    const decrypted = new Uint8Array(totalLength);

    let offset = 0;
    for (const part of decryptedParts) {
      decrypted.set(part, offset);
      offset += part.length;
    }

    // Create a Blob and trigger download
    const blob = new Blob([decrypted], { type: metadata.mimeType || "application/octet-stream" });
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
    console.error("Download error:", err);
    setErrorMessage(err.message || "Download failed");
    setStatus("Download failed");
  } finally {
    setIsLoading(false);
  }
};


/* -------------------- Delete --------------------  */

const deleteFile = async (file) => {
  if (!file) return;

  try {
    setIsLoading(true);
    setStatus(`Deleting ${file.name}...`);

    const res = await fetch(
      `${API}/api/files/delete?id=${file.id}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    if (!res.ok) throw new Error("Delete failed");

    setUploadedFiles((prev) => prev.filter((f) => f.id !== file.id));
    setStatus("File deleted");
  } catch (err) {
    setErrorMessage("Delete failed");
  } finally {
    setIsLoading(false);
    setFileToDelete(null);
  }
};

/* -------------------- Rename --------------------  */
const openRenameModal = (file) => {
  setRenameFile(file);
  setNewFileName(file.name);
};

const handleRename = async () => {
  try {
    const res = await fetch(`${API}/api/files/rename`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: renameFile.id,
        newName: newFileName,
      }),
    });

    if (!res.ok) throw new Error();

    setUploadedFiles((prev) =>
      prev.map((f) =>
        f.id === renameFile.id ? { ...f, name: newFileName } : f
      )
    );

    setRenameFile(null);
  } catch {
    setErrorMessage("Rename failed");
  }
};

/* -------------------- Info --------------------  */
const openInfoModal = async (file) => {
  try {
    setInfoFile(file);

    const res = await fetch(
      `${API}/api/files/info?id=${file.id}`,
      { credentials: "include" }
    );

    const data = await res.json();
    setFileInfo(data);
  } catch {
    setErrorMessage("Failed to fetch info");
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

      setUnlocked(true);
      setVaultPassword("");
      setShowUnlockModal(false);

      await fetchFiles();
      // await fetchUser();
      resetTimer();

      setStatus("Unlocked");
    } catch (err) {
      toast.error("We couldn’t verify your info. Try again, your data was not shared.");
      setStatus("Incorrect password");
    }
  };

  /* -------------------- Logout -------------------- */

 const handleLogout = async () => {
  await fetch(`${API}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  lockVault();
  setUnlocked(false);
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

  /* Cleanup modal state when closing */
  useEffect(() => {
    if (!showUnlockModal) {
      setVaultPassword("");
      setUnlockError(null);
      setIsClosing(false);
    }
  }, [showUnlockModal]);


  /* Close dropdowns when clicking outside */
  useEffect(() => {
  const handleClickOutside = () => {
    setOpenMenuFor(null);
  };

  if (openMenuFor !== null) {
    window.addEventListener("click", handleClickOutside);
  }

  return () => {
    window.removeEventListener("click", handleClickOutside);
  };
}, [openMenuFor]);

// Listen for online/offline status
 useEffect(() => {
  const handleOnline = () => {
    setIsOnline(true);
    setShowOnlineBanner(true);

    // ⏳ Hide after 3 seconds
    setTimeout(() => {
      setShowOnlineBanner(false);
    }, 3000);
  };

  const handleOffline = () => {
    setIsOnline(false);
    setShowOnlineBanner(false); // hide online banner if going offline
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}, []);

/* Slow Network Detection */
useEffect(() => {
  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;

  if (!connection) return;

  // Move updateSpeed outside so we can reuse
  const updateSpeed = async () => {
    try {
      const start = performance.now();
      await fetch("/ping"); // small request
      const duration = performance.now() - start;

      setPing(Math.round(duration));
      // console.log(
      //   `Ping duration: ${duration}ms, effectiveType: ${connection.effectiveType}`
      // );

      if (["slow-2g", "2g"].includes(connection.effectiveType) || duration > 1000) {
        setIsSlow(true);
        setTimeout(() => setIsSlow(false), 3000);
      } else {
        setIsSlow(false);
      }
    } catch (err) {
      console.error("Ping failed", err);
      setIsSlow(true); // maybe treat failure as slow
    }
  };

  updateSpeed(); // initial check
  connection.addEventListener("change", updateSpeed);

  // Repeat ping every 5s
  const interval = setInterval(updateSpeed, 5000);

  return () => {
    connection.removeEventListener("change", updateSpeed);
    clearInterval(interval);
  };
}, []);

  /* -------------------- Modal Controls -------------------- */

  // Clear completed uploads from progress state after a delay
  useEffect(() => {
  const timers = [];

  Object.entries(uploadProgress).forEach(([id, p]) => {
    if (["completed", "error", "cancelled"].includes(p.status)) {
      const t = setTimeout(() => {
        setUploadProgress((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }, 2500);

      timers.push(t);
    }
  });

  return () => timers.forEach(clearTimeout);
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

  /* Delete Modal */
   const openDeleteModal = (file) => {
    setFileToDelete(file);
    setOpenMenuFor(null);
  };


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
                    <h2 className="text-xl sm:text-4xl font-bold text-white">Unlock SafeRaho Vault</h2>
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

      {/* OFFLINE (always visible) */}
      <AnimatePresence>
        { !isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-lg"
          > You're offline. Upload paused.
          </motion.div>
        )}
      </AnimatePresence>

      {/* ONLINE (only temporary) */}
      <AnimatePresence>
        {showOnlineBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-500/90 text-white px-4 py-2 rounded-lg shadow-lg"
          > You're back online
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSlow && isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-yellow-500/90 text-black px-4 py-2 rounded-lg shadow-lg border border-yellow-400"> 🐢 Slow network detected. Upload may take longer.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/50">
    
        {/* Ping */}
        <p className="fixed top-8 sm:top-8 sm:left-3 text-sm text-green-400 font-bold z-50">
          {ping !== null ? `${ping} ms` : "..."}
        </p>

        <div className="max-w-7xl mx-auto px-3 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4 ml-5 sm:ml-0">
              <img src="/logo.png" alt="SafeRaho Logo" className="w-15 h-15 sm:w-25 sm:h-25" />
          </div>
          <div className="flex flex-col items-center">
            <h1 className="text-xl sm:text-2xl font-bold text-white">SafeRaho Vault</h1>
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
                <p className="text-slate-400 text-center mb-6 max-w-sm ">
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


    {/* Upload Progress - Floating Bottom Right (Responsive) */}
        <div className="fixed bottom-4 right-4 z-50 w-[260px] sm:w-[300px] max-w-[90vw]">
          {Object.keys(uploadProgress).length > 0 && (
            <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800/50 rounded-xl p-3 sm:p-4 shadow-lg">

              {/* HEADER */}
              <div className="flex justify-between items-center mb-2 sm:mb-3">
                <div className="text-white text-sm font-medium">
                  Uploading
                </div>

                <div className="text-[10px] sm:text-xs text-slate-400">
                  {uploadingCount} • {queuedCount}
                </div>
              </div>

              {/* LIST */}
              <div className="max-h-52 sm:max-h-60 overflow-y-auto pr-1 space-y-2">
                <AnimatePresence>
                  {Object.entries(uploadProgress).map(([id, p]) => (
                    <motion.div
                      key={id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="flex items-center justify-between bg-slate-900/50 border border-slate-800 rounded-lg px-2 py-2 group"
                    >

                      {/* FILE + ICON */}
                      <div className="flex items-center gap-2 max-w-[110px] sm:max-w-[140px]">
                        <FileIcon type={getFileType(p.name)} />
                        <div className="text-xs sm:text-sm text-white truncate">
                          {p.name}
                        </div>
                      </div>

                      {/* RIGHT SIDE */}
                      <div className="flex items-center gap-2">

                        {/* STATUS */}
                        <span className="text-[10px] sm:text-xs text-slate-400">
                          {p.status === "queued" && "Q"}
                          {p.status === "encrypting" && "Enc"}
                          {p.status === "uploading" && `${p.percent || 0}%`}
                          {p.status === "completed" && "✓"}
                          {p.status === "error" && "Err"}
                          {p.status === "cancelled" && "X"}
                        </span>

                        {/* PROGRESS */}
                        <div className="relative w-6 h-6 sm:w-7 sm:h-7">

                          <svg className="w-6 h-6 sm:w-7 sm:h-7 rotate-[-90deg]">
                            <circle
                              cx="12"
                              cy="12"
                              r="9"
                              stroke="#1e293b"
                              strokeWidth="2"
                              fill="none"
                            />
                            <circle
                              cx="12"
                              cy="12"
                              r="9"
                              stroke="url(#grad)"
                              strokeWidth="2"
                              fill="none"
                              strokeDasharray={56}
                              strokeDashoffset={
                                56 - (56 * (p.percent || 0)) / 100
                              }
                              className="transition-all duration-300"
                            />
                            <defs>
                              <linearGradient id="grad">
                                <stop offset="0%" stopColor="#10b981" />
                                <stop offset="100%" stopColor="#06b6d4" />
                              </linearGradient>
                            </defs>
                          </svg>

                          {/* CANCEL */}
                          {(p.status === "uploading" || p.status === "encrypting") && (
                            <button
                              onClick={() => cancelUpload(id)}
                              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                            >
                              <X className="w-3 h-3 text-red-400" />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* Files Grid */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Your Files</h2>
              <p className="text-slate-400 text-sm font-bold">
                <span className="text-orange-400 text-sm bg-orange-400/20 px-2 py-1 rounded-lg">
                  {uploadedFiles.length}
                </span> Encrypted {uploadedFiles.length === 1 ? "File" : "Files"}
              </p>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 text-sm font-medium rounded-lg border border-emerald-500/20">
                ✓ All secure
              </div>
            )}
          </div>

          {uploadedFiles.length === 0 ? (
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-slate-800 to-slate-700 flex items-center justify-center group-hover:from-emerald-500/20 group-hover:to-cyan-500/20 transition-all">
              <FileIcon type="default" />
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
                    <FileIcon type={getFileType(f.name)} className="w-6 h-6 text-emerald-400" />
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
                      className="absolute right-0 top-10 z-30 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* <button
                        onClick={() => downloadFile(f)}
                        className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition"
                      >
                        Download
                      </button> */}

                      <button
                        onClick={() => openRenameModal(f)}
                        className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition"
                      >
                        Rename
                      </button>

                      <button
                        onClick={() => openInfoModal(f)}
                        className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition"
                      >
                        File Info
                      </button>

                      <div className="border-t border-slate-700" />
                      <button
                        onClick={() => openDeleteModal(f)}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 transition cursor-pointer">
                        Delete
                      </button>

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
                        {f.size
                          ? `${(f.size / 1024 / 1024).toFixed(2)} MB`
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Uploaded</span>
                      <span className="text-slate-300 font-medium">
                        {new Date(f.uploadedAt).toLocaleString()}
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
      {/* <button
        onClick={() => window.location.href = "/dashboard"}
        className="fixed bottom-6 left-6 px-4 py-3 bg-slate-900/80 backdrop-blur-xl border border-slate-800/50 rounded-xl text-sm text-slate-300  hover:bg-cyan-500 hover:text-white transition-colors duration-300 cursor-pointer"
      >
        ← Back to Dashboard
      </button> */}

      <AnimatePresence>
          {fileToDelete && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={() => setFileToDelete(null)}
              />

              {/* Modal */}
              <motion.div
                className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-xl"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
              >
                <h2 className="text-lg font-semibold text-white mb-2">
                  Delete File
                </h2>

                <p className="text-sm text-slate-400 mb-6">
                  Are you sure you want to delete{" "}
                  <span className="text-white font-medium">
                    {fileToDelete.name}
                  </span>
                  ? This cannot be undone.
                </p>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setFileToDelete(null)}
                    className="px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() => deleteFile(fileToDelete)}
                    className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg cursor-pointer transition-all"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>


       <AnimatePresence>
        {renameFile && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setRenameFile(null)}
            />

            {/* Modal */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-900/90 backdrop-blur-sm p-6 rounded-xl z-10 w-96 border border-slate-700 shadow-xl"
            >
              <h2 className="text-white text-lg mb-4 font-semibold">
                Rename File
              </h2>

              {/* Input */}
              <input
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="w-full p-2 bg-slate-800 text-white rounded mb-4 
                          outline-none border border-slate-700
                          focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30
                          transition-all"
                placeholder="Enter new name..."
              />

              {/* Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setRenameFile(null)}
                  className="px-4 py-2 rounded-lg border border-slate-600 
                            text-slate-300 transition-all duration-200
                            hover:bg-slate-800 hover:text-white
                            active:scale-95"
                >
                  Cancel
                </button>

                <button
                  onClick={handleRename}
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-black font-medium
                            transition-all duration-200
                            hover:bg-emerald-400
                            hover:shadow-[0_0_12px_rgba(16,185,129,0.6)]
                            active:scale-95"
                >
                  Rename
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      <AnimatePresence>
      {infoFile && fileInfo && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setInfoFile(null)} />

          <div className="bg-slate-900 p-6 rounded-xl z-10 w-96 space-y-3">
            <h2 className="text-white text-lg mb-2 font-bold">File Info</h2>

            <p>Name: {fileInfo.name}</p>
            <p>Size: {fileInfo.size ? `${(fileInfo.size / 1024 / 1024).toFixed(2)} MB` : "—"}</p>
            <p>Uploaded: {new Date(fileInfo.uploadedAt).toLocaleString()}</p>
            <p>Chunks: {fileInfo.totalChunks}</p>
            <div className="flex items-center justify-between">
            <span
              className={`px-2 py-1 text-sm font-semibold rounded-md uppercase tracking-wide
                ${
                  ["png", "jpg", "jpeg", "webp", "gif"].includes(getFileTypeLabel(fileInfo))
                    ? "bg-emerald-500/20 text-emerald-400"
                    : getFileTypeLabel(fileInfo) === "pdf"
                    ? "bg-red-500/20 text-red-400"
                    : getFileTypeLabel(fileInfo) === "zip"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : getFileTypeLabel(fileInfo) === "docx"
                    ? "bg-blue-500/20 text-blue-400"
                    : ["xlsx", "csv", "pptx"].includes(getFileTypeLabel(fileInfo))
                    ? "bg-orange-500/20 text-orange-400"
                    : getFileTypeLabel(fileInfo) === "mp4"
                    ? "bg-purple-500/20 text-purple-400"
                    : "bg-slate-700 text-slate-200"

                }
              `}
            >
              {getFileTypeLabel(fileInfo)}
            </span>
          </div>

           <div className="flex justify-end">
              <button
                onClick={() => setInfoFile(null)}
                className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-800/50 text-slate-200 transition-all duration-200 hover:bg-slate-700 hover:text-white hover:shadow-[0_0_10px_rgba(148,163,184,0.5)] active:scale-95 cursor-pointer"
                > Close
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    </div>
  );
}