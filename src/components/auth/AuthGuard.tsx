import React, { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider.js";
import LoginPrompt from "./LoginPrompt.js";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, fallback }) => {
  const { authState } = useAuth();
  const isAuthenticated = authState.valid;
  const isLoading = !authState.valid && authState.loading;
  const error =
    !authState.valid && authState.error ? authState.error.message : undefined;
  const [authExpiredError, setAuthExpiredError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Listen for authentication errors from LiveStore
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "AUTH_ERROR") {
        setAuthExpiredError(event.data.message);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600" />
          <div className="text-foreground mb-2 text-lg font-semibold">
            Checking Authentication
          </div>
          <div className="text-muted-foreground text-sm">Please wait...</div>
        </div>
      </div>
    );
  }

  // Show error state if authentication failed or auth expired
  if ((error && !isAuthenticated) || authExpiredError) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="max-w-md text-center">
          <div className="text-foreground mb-2 text-lg font-semibold">
            Authentication Required
          </div>
          <div className="mb-4 text-sm text-red-600">
            {authExpiredError || error}
          </div>
          {authExpiredError && (
            <div className="text-muted-foreground mb-4 text-xs">
              Your session has expired. Please sign in again to continue.
            </div>
          )}
          <LoginPrompt error={loginError} setError={setLoginError} />
          {authExpiredError && (
            <button
              onClick={() => {
                setAuthExpiredError(null);
                window.location.reload();
              }}
              className="mt-2 rounded-md bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
            >
              Reload Page
            </button>
          )}
        </div>
      </div>
    );
  }

  // Show sign-in form if not authenticated
  if (!isAuthenticated) {
    return (
      fallback || (
        <div className="bg-background flex min-h-screen items-center justify-center">
          <div className="max-w-md text-center">
            <div className="text-foreground mb-2 text-2xl font-bold">
              Anode Notebooks
            </div>
            <div className="text-muted-foreground mb-8 text-sm">
              Sign in to access your collaborative notebooks
            </div>
            <LoginPrompt error={loginError} setError={setLoginError} />
            <div className="text-muted-foreground mt-8 text-xs">
              <p>
                Anode is a real-time collaborative notebook system.
                <br />
                Sign in with Anaconda to sync your work across devices.
              </p>
            </div>
          </div>
        </div>
      )
    );
  }

  // Show authenticated content
  return <>{children}</>;
};
