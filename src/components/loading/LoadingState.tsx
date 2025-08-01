import React, { useEffect } from "react";
import { RuntLogo } from "../logo/RuntLogo";
import { removeStaticLoadingScreen } from "../../util/domUpdates";

interface LoadingStateProps {
  /** Variant of the loading state */
  variant?: "fullscreen" | "inline" | "minimal";
  /** Optional loading message */
  message?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the animated version */
  animated?: boolean;
  /** Whether to skip removing the static loading screen */
  skipStaticRemoval?: boolean;
}

/**
 * Reusable loading state component that uses the Runt logo
 * Perfect for Suspense boundaries and loading states
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  variant = "inline",
  message,
  className = "",
  animated = true,
  skipStaticRemoval = false,
}) => {
  useEffect(() => {
    if (!skipStaticRemoval) {
      removeStaticLoadingScreen();
    }
  }, [skipStaticRemoval]);
  if (variant === "fullscreen") {
    return (
      <div
        className={`flex min-h-screen items-center justify-center bg-white ${className}`}
      >
        <div className="text-center">
          <RuntLogo
            size="h-24 w-24 sm:h-32 sm:w-32"
            variant="portal"
            animated={animated}
            className="mx-auto mb-8"
            filterId="pixelate-loading-state"
          />
          {message && (
            <div
              className="relative z-50 mb-2 text-xl font-black text-white sm:text-2xl"
              style={{
                textShadow:
                  "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 2px 0 #000, 2px 0 0 #000, 0 -2px 0 #000, -2px 0 0 #000, 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0 1px 0 #000, 1px 0 0 #000, 0 -1px 0 #000, -1px 0 0 #000",
              }}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
        {message && (
          <span className="text-muted-foreground ml-2 text-sm">{message}</span>
        )}
      </div>
    );
  }

  // Default "inline" variant
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 ${className}`}
    >
      <RuntLogo
        size="h-16 w-16"
        variant="portal"
        animated={animated}
        className="mb-4"
        filterId="pixelate-loading-inline"
      />
      {message && (
        <div className="text-muted-foreground animate-pulse text-sm">
          {message}
        </div>
      )}
    </div>
  );
};

// Export convenience components for common use cases
export const FullscreenLoading: React.FC<{ message?: string }> = ({
  message = "Loading FULL...",
}) => <LoadingState variant="fullscreen" message={message} />;

export const InlineLoading: React.FC<{ message?: string }> = ({
  message = "Loading INLINE...",
}) => <LoadingState variant="inline" message={message} />;

export const MinimalLoading: React.FC<{ message?: string }> = ({ message }) => (
  <LoadingState variant="minimal" message={message} />
);
