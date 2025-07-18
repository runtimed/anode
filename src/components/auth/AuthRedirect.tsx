import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";

const AuthRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { handleRedirect } = useAuth();

  useEffect(() => {
    let cancelled = false;
    const doRedirect = async () => {
      try {
        await handleRedirect(new URL(window.location.href));
      } catch (e) {
        // Optionally log error or show a message
      } finally {
        if (!cancelled) {
          navigate("/", { replace: true });
        }
      }
    };
    doRedirect();
    return () => {
      cancelled = true;
    };
  }, []);

  return <div>Logging in...</div>;
};

export default AuthRedirect; 
