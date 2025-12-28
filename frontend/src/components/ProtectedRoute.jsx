import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../api";

export default function ProtectedRoute({ children }) {
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    let mounted = true;

    api
      .get("/auth/me", { withCredentials: true })
      .then(() => mounted && setAllowed(true))
      .catch(() => mounted && setAllowed(false));

    return () => (mounted = false);
  }, []);

  if (allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Verifying session…
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
