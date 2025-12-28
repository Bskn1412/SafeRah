"use client"

import { useState, useEffect, useRef } from "react"
import { Lock, Unlock, Upload, Download, Shield, LogOut, FileIcon, ArrowRight } from "lucide-react"
import { unlockVault, tryAutoUnlock, lockVault, isUnlocked } from "../crypto/vault"
import { encryptFile, decryptFileData } from "../crypto/files"
import { ensureKeys } from "../crypto/ensureKeys" 

const INACTIVITY_TIMEOUT = 10 * 60 * 1000

export default function Dashboard() {
  const [status, setStatus] = useState("Checking vault...")
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [hoveredFile, setHoveredFile] = useState(null)
  const timeoutRef = useRef(null)
  const fileInputRef = useRef(null)
  const [errorMessage, setErrorMessage] = useState("")

  const resetTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      lockVault()
      setUploadedFiles([])
      setStatus("Auto-locked after inactivity")
    }, INACTIVITY_TIMEOUT)
  }

  // Local fetch function (renamed for consistency; removed unused import)
  const fetchFiles = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/files/list", { credentials: "include" })
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
      const files = await res.json()
     // console.log('🔄 Fetched files (valid IDs):', files)  // Debug: Confirm IDs
      setUploadedFiles(files)
    } catch (err) {
      console.error('Fetch files error:', err)
      setStatus("Failed to load files")
    }
  }



// Add this with your other useEffects — unconditionally at top level
useEffect(() => {
  if (errorMessage) {
    const timer = setTimeout(() => setErrorMessage(""), 4000)
    return () => clearTimeout(timer)
  }
}, [errorMessage])



  useEffect(() => {
    async function init() {
      const keys = await tryAutoUnlock()
      if (keys) {
        setStatus("Auto-unlocked")
        await fetchFiles()  // ✅ Use local fetchFiles
        resetTimer()
        return
      }
      setStatus("Vault Locked")
    }
    init()
  }, [])

  useEffect(() => {
    if (!isUnlocked()) return

    const events = ["mousemove", "mousedown", "scroll", "keypress", "touchstart"]
    const handler = () => resetTimer()

    events.forEach((ev) => window.addEventListener(ev, handler))
    resetTimer()

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handler))
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [isUnlocked()])

  const handleUnlock = async () => {
    const password = prompt("Enter your vault password:")
    if (!password) return

    try {
      setStatus("Unlocking...")
      await unlockVault(password)
      setStatus("Unlocked")
      await fetchFiles()  // ✅ Refresh with server IDs
      resetTimer()  // ✅ Fixed: was resetInactivityTimer()
    } catch (err) {
      console.error(err)
      if (err.message === "VAULT_NOT_INITIALIZED") {
        const ok = confirm("Vault not initialized yet for this account. Initialize now with this password? (This will create your vault tied to this password.)")
        if (!ok) {
          setStatus("Vault is not initialized")
          return
        }

        try {
          setStatus("Initializing vault...")
          const initRes = await ensureKeys(password, { createIfMissing: true })
          if (initRes && initRes.created) {
            await unlockVault(password)  // Now succeeds
            setStatus("Vault initialized and unlocked")
            await fetchFiles()  // ✅ Refresh
            resetTimer()
          } else {
            throw new Error("Initialization failed")
          }
        } catch (e) {
          console.error("Init failed:", e)
          alert("Vault initialization failed. Make sure you entered the intended registration password.")
          setStatus("Initialization failed")
        }
        return
      }

      if (err.message === "INCORRECT_PASSWORD" || err.message === "UNLOCK_FAILED") {
        setErrorMessage("Incorrect password. Please try again.")
        setStatus("Unlock failed")
        return
      }

      setErrorMessage("Failed to unlock vault. Please try again.")
      setStatus("Unlock error")
    }
  }

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    setIsLoading(true)

    for (const file of files) {
      try {
        setStatus(`Encrypting ${file.name}...`)
        const encrypted = await encryptFile(file)

        const response = await fetch("http://localhost:5000/api/files/upload", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            encryptedData: encrypted.encryptedData,
            metadata: encrypted.metadata,  // Remove client id—backend generates
          }),
        })

        if (!response.ok) throw new Error(`Upload failed: ${response.status}`)

        const result = await response.json()  // { success: true, id: serverObjectId }
        if (!result.success || !result.id) throw new Error("Invalid upload response")

        // ✅ Use SERVER ID for state (no more null/wrong IDs)
        setUploadedFiles((prev) => [
          ...prev,
          {
            id: result.id,  // Server ObjectId
            name: file.name,  // Or encrypted.metadata.originalName
            size: file.size,
            uploadedAt: new Date().toISOString(),
          },
        ])

        setStatus(`${file.name} encrypted & uploaded`)
      } catch (err) {
        console.error(err)
        alert(`Failed to upload ${file.name}: ${err.message}`)
      }
    }

    setIsLoading(false)
    fileInputRef.current.value = ""
    await fetchFiles()  // ✅ Refresh full list with server IDs (optional but ensures consistency)
  }

  const downloadFile = async (file) => {
    console.log('File object:', file)  // Keep for debug
    console.log('file.id:', file?.id, 'Type:', typeof file?.id)

    // ✅ Guard: Prevent null ID requests
    if (!file?.id || file.id === null || file.id === 'null') {
      console.error('🚫 Invalid file ID for download:', file)
      alert("Invalid file selected—please refresh the page and try again.")
      return
    }

    try {
      setIsLoading(true)
      setStatus(`Decrypting ${file.name}...`)

      const res = await fetch(`http://localhost:5000/api/files/download?id=${file.id}`, {
        credentials: "include",
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `Download failed: ${res.status}`)
      }

      const data = await res.json()

      // ✅ Map backend metadata to expected keys (adjust based on your encryptFile)
      // Assuming: nonce = fileNonce, fileKeyCipher = wrappedKey; add wrapNonce if stored separately
      const plaintext = await decryptFileData(
        data.encryptedData,
        data.metadata.nonce,  // → fileNonce
        data.metadata.fileKeyCipher,  // → wrappedKey
        data.metadata.wrapNonce || null  // If wrapNonce stored, add to backend metadata; else derive/fix in encrypt
      )

      const blob = new Blob([plaintext], { type: data.metadata.mimeType || "application/octet-stream" })
      const url = URL.createObjectURL(blob)

      const a = document.createElement("a")
      a.href = url
      a.download = file.name
      a.click()

      URL.revokeObjectURL(url)
      setStatus(`${file.name} decrypted & downloaded`)
    } catch (err) {
      console.error('Download/decrypt error:', err)
      alert(`Decryption failed: ${err.message} — Ensure vault is unlocked.`)
    } finally {
      setIsLoading(false)
    }
  }


   // === ONLY ONE LOCKED UI BLOCK ===
  if (!isUnlocked()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 relative">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl opacity-20 animate-pulse"></div>
          <div
            className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl opacity-20 animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
        </div>

        <div className="relative z-10 max-w-md w-full">
          {/* Error Card - Above unlock box */}
          {errorMessage && (
            <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="bg-red-900/95 backdrop-blur-md border border-red-700/50 rounded-2xl shadow-2xl p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-800/60 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5 text-red-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Access Denied</h3>
                    <p className="text-red-200 text-sm">{errorMessage}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Unlock Box */}
          <div className="bg-slate-900/50 backdrop-blur-2xl border border-emerald-500/20 rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 mb-6">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">SafeRaho</h1>
              <p className="text-slate-400">Secure File Vault</p>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700/50">
              <p className="text-slate-300 text-sm text-center">{status}</p>
            </div>

            <button
              onClick={handleUnlock}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-emerald-500/50 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Unlock className="w-5 h-5" />
              {isLoading ? "Unlocking..." : "Unlock Vault"}
            </button>

            <p className="text-xs text-slate-500 text-center mt-6">
              🔒 Your files are encrypted end-to-end. Only you can decrypt them.
            </p>
          </div>
        </div>
      </div>
    )
  }





  // Unlocked UI (unchanged except minor tweaks for consistency)
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl opacity-30 animate-pulse"></div>
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl opacity-30 animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">SafeRaho Vault</h1>
              <p className="text-xs text-emerald-400/80">🔓 Unlocked & Encrypted</p>
            </div>
          </div>

          <button
            onClick={() => {
              lockVault()
              setUploadedFiles([])
              setStatus("Vault locked")
            }}
            className="px-5 py-2.5 bg-slate-800/50 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-medium rounded-lg transition-all duration-200 border border-slate-700/50 hover:border-red-500/50 flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Lock
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Upload Section */}
        <div className="mb-12">
          <label className="block cursor-pointer group">
            <div className="border-2 border-dashed border-emerald-500/30 hover:border-emerald-500/60 bg-slate-900/30 hover:bg-slate-900/50 rounded-3xl p-12 transition-all duration-300 backdrop-blur-sm">
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Upload Files</h3>
                <p className="text-slate-400 text-center mb-6 max-w-sm">
                  Drag and drop your files or click to select. All encryption happens in your browser — zero server
                  knowledge.
                </p>
                <div className="px-6 py-3 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 font-medium rounded-lg border border-emerald-500/50 group-hover:from-emerald-500/30 group-hover:to-cyan-500/30 transition-all">
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
                  className="group relative bg-slate-900/40 backdrop-blur-sm border border-slate-800/50 hover:border-emerald-500/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center group-hover:from-emerald-500/20 group-hover:to-cyan-500/20 transition-all">
                      <FileIcon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div className="px-2 py-1 bg-slate-800/50 text-slate-400 text-xs font-medium rounded-lg">
                      Encrypted
                    </div>
                  </div>

                  <h3 className="font-semibold text-white truncate mb-3 group-hover:text-emerald-300 transition-colors">
                    {f.name}
                  </h3>

                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Size</span>
                      <span className="text-slate-300 font-medium">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Uploaded</span>
                      <span className="text-slate-300 font-medium">{new Date(f.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => downloadFile(f)}
                    disabled={isLoading || !f.id}  // ✅ Disable if no ID
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-500/20 to-cyan-500/30 hover:from-emerald-500/30 hover:to-cyan-500/30 text-emerald-300 hover:text-emerald-200 font-medium rounded-lg transition-all duration-200 border border-emerald-500/30 hover:border-emerald-500/60 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    {hoveredFile === f.id && !isLoading ? (
                      <>
                        Download
                      </>
                    ) : (
                      "Decrypt & Download"
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Status */}
      <div className="fixed bottom-6 right-6 px-4 py-3 bg-slate-900/80 backdrop-blur-xl border border-slate-800/50 rounded-xl text-sm text-slate-300 max-w-xs">
        {status}
      </div>
    </div>
  )
}