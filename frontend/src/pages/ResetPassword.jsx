"use client";

import { useState } from "react";
import { api } from "../api";
import { rewrapMasterKey } from "../crypto/rewrap";

export default function ResetPassword() {
  const [password, setPassword] = useState("");

  const submit = async () => {
    const masterKey = sessionStorage.getItem("recoveredMasterKey");
    const token = sessionStorage.getItem("recoverySession");

    const wrapped = await rewrapMasterKey(masterKey, password);

    await api.post(
      "/auth/reset-password",
      wrapped,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    sessionStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-slate-900 p-8 rounded-xl space-y-4">
        <h2 className="text-xl font-bold">Set New Password</h2>

        <input
          type="password"
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 bg-slate-800 rounded"
        />

        <button
          onClick={submit}
          className="w-full py-2 bg-cyan-500 text-black rounded"
        >
          Reset Password
        </button>
      </div>
    </div>
  );
}
