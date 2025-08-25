import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { User } from "oidc-client-ts";

const OidcCallback: React.FC = () => {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("🔍 OidcCallback: URL debugging", {
      windowLocation: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
      searchParams: Object.fromEntries(
        new URLSearchParams(window.location.search)
      ),
    });

    console.log("🔍 OidcCallback: Auth state", {
      isAuthenticated: auth.isAuthenticated,
      isLoading: auth.isLoading,
      hasError: !!auth.error,
      error: auth.error?.message,
      hasUser: !!auth.user,
      activeNavigator: auth.activeNavigator,
    });

    if (auth.isAuthenticated) {
      console.log("🔍 OidcCallback: Authenticated, navigating to home");
      navigate("/", { replace: true });
    }
  }, [
    auth.isAuthenticated,
    auth.isLoading,
    auth.error,
    auth.user,
    auth.activeNavigator,
    navigate,
  ]);

  // Fallback: manually check localStorage for stored auth
  useEffect(() => {
    if (!auth.isAuthenticated && !auth.isLoading && !auth.error) {
      const authKey = `oidc.user:${import.meta.env.VITE_AUTH_URI}:${import.meta.env.VITE_AUTH_CLIENT_ID}`;
      const storedUser = localStorage.getItem(authKey);

      if (storedUser) {
        console.log(
          "🔍 OidcCallback: Found stored user, attempting manual load",
          storedUser.substring(0, 100) + "..."
        );
        try {
          const user = User.fromStorageString(storedUser);
          if (user && !user.expired) {
            console.log(
              "🔍 OidcCallback: Valid stored user found, redirecting"
            );
            navigate("/", { replace: true });
          } else {
            console.log("🔍 OidcCallback: Stored user expired or invalid");
          }
        } catch (error) {
          console.error("🔍 OidcCallback: Failed to parse stored user", error);
        }
      }
    }
  }, [auth.isAuthenticated, auth.isLoading, auth.error, navigate]);

  if (auth.error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold text-red-600">
            Authentication Error
          </div>
          <p className="mt-2 text-sm text-gray-600">{auth.error.message}</p>
          <button
            onClick={() => navigate("/", { replace: true })}
            className="mt-4 rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="text-lg font-semibold">
          Following the White Rabbit...
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Preparing your notebook in just a moment
        </p>
      </div>
    </div>
  );
};

export default OidcCallback;
