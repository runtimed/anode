import React, { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider.js";
import LoginPrompt from "./LoginPrompt.js";
import {
  updateLoadingStage,
  removeStaticLoadingScreen,
} from "../../util/domUpdates.js";

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

  // Update loading stage when auth check starts
  useEffect(() => {
    if (isLoading) {
      updateLoadingStage("checking-auth");
    }
  }, [isLoading]);

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

  // Remove static loading screen when auth check completes
  useEffect(() => {
    if (!isLoading) {
      removeStaticLoadingScreen();
    }
  }, [isLoading]);

  // Show transparent loading state - let static HTML loading screen handle UI
  if (isLoading) {
    return null;
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
        <div className="bg-background flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md text-center">
            <div className="mb-12">
              <h1 className="text-foreground mb-3 text-3xl font-bold tracking-tight">
                Welcome to Runt
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Your collaborative notebook that thinks with you
              </p>
            </div>
            <LoginPrompt error={loginError} setError={setLoginError} />
          </div>
        </div>
      )
    );
  }

  // Show authenticated content
  return <>{children}</>;
};
