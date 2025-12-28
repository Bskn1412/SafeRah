import { useEffect, useState } from "react";
import { api } from "../api";

export default function Enable2FA() {
  const [qr, setQr] = useState(null);
  const [otp, setOtp] = useState("");

  useEffect(() => {
    api.post("/auth/2fa/setup").then(res => {
      setQr(res.data.qr);
    });
  }, []);

  const verify = async () => {
    await api.post("/auth/2fa/verify", { token: otp });
    alert("2FA Enabled");
  };

  return (
    <div>
      <h2>Scan QR</h2>
      {qr && <img src={qr} />}
      <input onChange={e => setOtp(e.target.value)} placeholder="OTP" />
      <button onClick={verify}>Verify</button>
    </div>
  );
}
