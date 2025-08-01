import React, { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider.js";
import LoginPrompt from "./LoginPrompt.js";
import { updateLoadingStage } from "../../util/domUpdates.js";
import { RuntLogo } from "../logo";
import { LoadingState } from "../loading/LoadingState";
import { useSpring, animated } from "@react-spring/web";

// DEV MODE: Force login screen for design testing
// Set to true to preview login screen locally
const FORCE_LOGIN_SCREEN = false;

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
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Spring animations for smooth transitions
  const logoSpring = useSpring({
    from: { opacity: 0, transform: "scale(0.9)" },
    to: {
      opacity: showLogin ? 1 : 0,
      transform: showLogin ? "scale(1)" : "scale(0.9)",
    },
    config: { tension: 280, friction: 60 },
  });

  const contentSpring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: {
      opacity: showLogin ? 1 : 0,
      transform: showLogin ? "translateY(0px)" : "translateY(20px)",
    },
    config: { tension: 280, friction: 60 },
    delay: showLogin ? 200 : 0,
  });

  const formSpring = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: {
      opacity: showLogin ? 1 : 0,
      transform: showLogin ? "translateY(0px)" : "translateY(20px)",
    },
    config: { tension: 280, friction: 60 },
    delay: showLogin ? 400 : 0,
  });

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

  // Trigger login form animation when auth check completes
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !error && !authExpiredError) {
      // Small delay to ensure smooth transition from loading state
      const timer = setTimeout(() => setShowLogin(true), 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, error, authExpiredError]);

  // Helper function to render login form
  const renderLoginForm = () => {
    return (
      fallback || (
        <div className="bg-background flex min-h-screen items-center justify-center p-4">
          <div className="auth-content w-full max-w-md text-center">
            {/* Hero logo section */}
            <div className="mb-16">
              <animated.div
                className="mb-10 flex items-center justify-center"
                style={logoSpring}
              >
                <RuntLogo
                  size="h-24 w-24 sm:h-32 sm:w-32"
                  animated={true}
                  energized={isButtonHovered}
                  className="auth-logo transition-transform hover:scale-105"
                  filterId="pixelate-auth"
                />
              </animated.div>
              <animated.div style={contentSpring}>
                <h1 className="text-foreground mb-8 text-4xl leading-tight font-semibold tracking-wide">
                  Chase the White Rabbit
                </h1>
                <p className="text-muted-foreground text-base font-normal">
                  Early access to the future of interactive computing
                </p>
              </animated.div>
            </div>
            <animated.div style={formSpring}>
              <LoginPrompt
                error={loginError}
                setError={setLoginError}
                onButtonHover={setIsButtonHovered}
              />
            </animated.div>
          </div>
        </div>
      )
    );
  };

  // Don't remove static loading screen here - let AnimatedLiveStoreApp handle it
  // to prevent white flicker between auth and notebook loading

  // Show loading or login in a cross-fade container
  if (isLoading || (!isAuthenticated && !error && !authExpiredError)) {
    return (
      <div className="relative min-h-screen">
        {/* Loading state */}
        <animated.div
          className="absolute inset-0"
          style={{
            opacity: isLoading ? 1 : 0,
            pointerEvents: isLoading ? "auto" : "none",
          }}
        >
          <LoadingState
            variant="fullscreen"
            message="Checking Authentication..."
            animated={true}
            skipStaticRemoval={true}
          />
        </animated.div>

        {/* Login form */}
        {!isLoading && (
          <animated.div
            className="absolute inset-0"
            style={{
              opacity: showLogin ? 1 : 0,
              pointerEvents: showLogin ? "auto" : "none",
            }}
          >
            {renderLoginForm()}
          </animated.div>
        )}
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

  // Show sign-in form if not authenticated OR if forced for design testing
  if (!isAuthenticated || FORCE_LOGIN_SCREEN) {
    return renderLoginForm();
  }

  // Show authenticated content
  return <>{children}</>;
};
