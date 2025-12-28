import { useEffect, useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";

export default function RecoveryGuard({ children }) {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkRecovery = async () => {
      try {
        const res = await api.get("/auth/me");
        if (!res.data.recoveryEnabled) {
          navigate("/setup-recovery", { replace: true });
        }
      } catch (err) {
        navigate("/login", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    checkRecovery();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Checking account security…
      </div>
    );
  }

  return children;
}
