import React from "react";
import { useAuth as useOidcAuth } from "react-oidc-context";
import { LoadingState } from "../components/loading/LoadingState";
import { Button } from "../components/ui/button";
import { RuntLogo } from "../components/logo";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, fallback }) => {
  const auth = useOidcAuth();

  // Handle specific navigation states
  switch (auth.activeNavigator) {
    case "signinSilent":
      return (
        <LoadingState
          variant="fullscreen"
          message="Refreshing authentication..."
          animated={true}
        />
      );
    case "signoutRedirect":
      return (
        <LoadingState
          variant="fullscreen"
          message="Signing you out..."
          animated={true}
        />
      );
  }

  // General loading state
  if (auth.isLoading) {
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
  if (auth.error) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mb-8 flex items-center justify-center">
            <RuntLogo size="h-24 w-24" filterId="pixelate-auth-error" />
          </div>
          <div className="text-foreground mb-2 text-lg font-semibold">
            Authentication Error
          </div>
          <div className="mb-4 text-sm text-red-600">
            {auth.error.message || "An authentication error occurred"}
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => auth.signinRedirect()}
              className="w-full bg-[rgb(8,202,74)] text-white hover:bg-[rgb(7,180,66)]"
            >
              Try Again
            </Button>
            <Button
              onClick={() => auth.removeUser()}
              variant="outline"
              className="w-full"
            >
              Reset Auth
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Login form - not authenticated
  if (!auth.isAuthenticated) {
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
              <Button
                onClick={() => auth.signinRedirect()}
                className="w-full bg-[rgb(8,202,74)] py-3 text-lg text-white hover:bg-[rgb(7,180,66)]"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      )
    );
  }

  // Render authenticated content
  return <>{children}</>;
};
