import React, { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider.js";
import LoginPrompt from "./LoginPrompt.js";
import { updateLoadingStage } from "../../util/domUpdates.js";
import { RuntLogo } from "../logo";
import { LoadingState } from "../loading/LoadingState";

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

  const [loginError, setLoginError] = useState<string | null>(null);
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  // Update loading stage when auth check starts
  useEffect(() => {
    if (isLoading) {
      updateLoadingStage("checking-auth");
    }
  }, [isLoading]);

  // Auth loading state
  if (isLoading) {
    return (
      <LoadingState
        variant="fullscreen"
        message="Checking Authentication..."
        animated={true}
        skipStaticRemoval={true}
      />
    );
  }

  // Auth error state
  if (error && !isAuthenticated) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="max-w-md text-center">
          <div className="text-foreground mb-2 text-lg font-semibold">
            Authentication Required
          </div>
          <div className="mb-4 text-sm text-red-600">{error}</div>
          <LoginPrompt error={loginError} setError={setLoginError} />
        </div>
      </div>
    );
  }

  // Login form
  if (!isAuthenticated) {
    return (
      fallback || (
        <div className="bg-background flex min-h-screen items-center justify-center p-4">
          <div className="auth-content w-full max-w-md text-center">
            {/* Hero logo section */}
            <div className="mb-16">
              <div className="mb-10 flex items-center justify-center">
                <RuntLogo
                  size="h-24 w-24 sm:h-32 sm:w-32"
                  animated={true}
                  energized={isButtonHovered}
                  className="auth-logo transition-transform hover:scale-105"
                  filterId="pixelate-auth"
                />
              </div>
              <div>
                <h1 className="text-foreground mb-8 text-4xl leading-tight font-semibold tracking-wide">
                  Chase the White Rabbit
                </h1>
                <p className="text-muted-foreground text-base font-normal">
                  Early access to the future of interactive computing
                </p>
              </div>
            </div>
            <div>
              <LoginPrompt
                error={loginError}
                setError={setLoginError}
                onButtonHover={setIsButtonHovered}
              />
            </div>
          </div>
        </div>
      )
    );
  }

  // Render authenticated content
  return <>{children}</>;
};
