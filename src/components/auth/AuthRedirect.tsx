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
    // NOTE: Do not add dependencies to this useEffect
    // It's only meant to be called once, during initial load
    // The double-reload mode in dev mode already causes enough headaches
    // without adding even more mount/unmonut cycles
    // If this continues to be a problem, we should move the login handling code
    // completely outside of the react lifecycle, and into some global store
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div>Logging in...</div>;
};

export default AuthRedirect;
