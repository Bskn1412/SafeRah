"use client";

import { useState } from "react";
import {unwrapWithRecovery, rewrapWithPassword } from "../crypto/recovery";
import { api } from "../api";

export default function EnableRecovery() {
  const [phrase, setPhrase] = useState(null);
  const [done, setDone] = useState(false);

  const generate = async () => {
    const p = await generateRecoveryPhrase();
    setPhrase(p);
  };

  const enable = async () => {
    const wrapped = await wrapMasterKeyWithRecovery(phrase);

    await api.post("/auth/enable-recovery", wrapped);
    setDone(true);
  };

  if (done) {
    return <p className="text-green-400 text-center">Recovery enabled successfully.</p>;
  }

  return (
    <div className="p-6 max-w-md mx-auto text-white">
      {!phrase ? (
        <button onClick={generate} className="btn-primary">
          Generate Recovery Phrase
        </button>
      ) : (
        <>
          <p className="text-sm text-red-400 mb-2">
            ⚠️ Save this phrase. It is shown only once.
          </p>

          <div className="bg-black p-4 rounded border">
            {phrase}
          </div>

          <button onClick={enable} className="btn-primary mt-4">
            Enable Recovery
          </button>
        </>
      )}
    </div>
  );
}
