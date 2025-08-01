import React, { useEffect } from "react";

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
          {/* Large layered logo with portal */}
          <div className="relative mx-auto mb-8 h-24 w-24 sm:h-32 sm:w-32">
            {/* Precisely positioned SVG hole */}
            <div
              className="absolute"
              style={{
                left: "37%",
                top: "63%",
                width: "119%",
                height: "119%",
                transform: "translate(-50%, -50%)",
              }}
            >
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 200 200"
                style={{ transformOrigin: "center center" }}
              >
                <defs>
                  <filter id="pixelate-loading-state">
                    <feMorphology
                      operator="erode"
                      radius="2"
                      in="SourceGraphic"
                      result="morphed"
                    />
                    <feComponentTransfer in="morphed">
                      <feFuncA type="discrete" tableValues="0 1" />
                    </feComponentTransfer>
                  </filter>
                </defs>
                <circle
                  cx="100"
                  cy="100"
                  r="95"
                  fill="#000000"
                  filter="url(#pixelate-loading-state)"
                />
              </svg>
            </div>
            <img
              src="/shadow.png"
              alt=""
              className="pixel-logo absolute inset-0 h-full w-full"
            />
            <img
              src="/bunny.png"
              alt=""
              className="pixel-logo absolute inset-0 h-full w-full"
            />
            <img
              src="/runes.png"
              alt=""
              className={`pixel-logo absolute inset-0 h-full w-full ${
                animated ? "rune-throb" : ""
              }`}
            />
            <img
              src="/bracket.png"
              alt="Runt"
              className="pixel-logo absolute inset-0 h-full w-full"
            />
          </div>
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
      {/* Medium layered logo with portal */}
      <div className="relative mb-4 h-16 w-16">
        {/* Precisely positioned SVG hole */}
        <div
          className="absolute"
          style={{
            left: "37%",
            top: "63%",
            width: "119%",
            height: "119%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 200 200"
            style={{ transformOrigin: "center center" }}
          >
            <defs>
              <filter id="pixelate-loading-inline">
                <feMorphology
                  operator="erode"
                  radius="2"
                  in="SourceGraphic"
                  result="morphed"
                />
                <feComponentTransfer in="morphed">
                  <feFuncA type="discrete" tableValues="0 1" />
                </feComponentTransfer>
              </filter>
            </defs>
            <circle
              cx="100"
              cy="100"
              r="95"
              fill="#000000"
              filter="url(#pixelate-loading-inline)"
            />
          </svg>
        </div>
        <img
          src="/shadow.png"
          alt=""
          className="pixel-logo absolute inset-0 h-full w-full"
        />
        <img
          src="/bunny.png"
          alt=""
          className="pixel-logo absolute inset-0 h-full w-full"
        />
        <img
          src="/runes.png"
          alt=""
          className={`pixel-logo absolute inset-0 h-full w-full ${
            animated ? "rune-throb" : ""
          }`}
        />
        <img
          src="/bracket.png"
          alt="Runt"
          className="pixel-logo absolute inset-0 h-full w-full"
        />
      </div>
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
