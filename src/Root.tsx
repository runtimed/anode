import { makePersistedAdapter } from "@livestore/adapter-web";
import LiveStoreSharedWorker from "@livestore/adapter-web/shared-worker?sharedworker";
import { LiveStoreProvider } from "@livestore/react";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

// Dynamic import for FPSMeter - development tool only
const FPSMeter = React.lazy(() =>
  import("@overengineering/fps-meter").then((m) => ({
    default: m.FPSMeter,
  }))
);
import { unstable_batchedUpdates as batchUpdates } from "react-dom";

import { NotebookViewer } from "./components/notebook/NotebookViewer.js";
import { NotebookLoadingScreen } from "./components/notebook/NotebookLoadingScreen.js";
import { AuthGuard } from "./components/auth/AuthGuard.js";
import AuthRedirect from "./components/auth/AuthRedirect.js";
import { AuthProvider } from "./components/auth/AuthProvider.js";

import LiveStoreWorker from "./livestore.worker?worker";
import { schema } from "./schema.js";
import { getCurrentNotebookId, getStoreId } from "./util/store-id.js";
import { useAuth } from "./components/auth/AuthProvider.js";
import { ErrorBoundary } from "react-error-boundary";

interface NotebookAppProps {
  showIncomingAnimation?: boolean;
  onAnimationComplete?: () => void;
}

const NotebookApp: React.FC<NotebookAppProps> = ({
  showIncomingAnimation = false,
  onAnimationComplete,
}) => {
  // In the simplified architecture, we always show the current notebook
  // The notebook ID comes from the URL and is the same as the store ID
  const currentNotebookId = getCurrentNotebookId();
  const [debugMode, setDebugMode] = useState(false);
  // Note: Auth token updates are handled via error detection and page reload
  // rather than dynamic sync payload updates, as LiveStore doesn't support
  // runtime sync payload changes

  return (
    <div className="bg-background min-h-screen">
      {/* Debug FPS Meter - fixed position in corner */}
      {debugMode && import.meta.env.DEV && (
        <div
          style={{
            bottom: 0,
            right: debugMode ? 400 : 0, // Leave space for debug panel
            position: "fixed",
            background: "#333",
            zIndex: 50,
          }}
        >
          <Suspense fallback={<div>Loading FPS meter...</div>}>
            <FPSMeter height={40} />
          </Suspense>
        </div>
      )}
      {/* Main Content */}
      <ErrorBoundary fallback={<div>Error loading notebook</div>}>
        <NotebookViewer
          notebookId={currentNotebookId}
          debugMode={debugMode}
          onDebugToggle={setDebugMode}
          showIncomingAnimation={showIncomingAnimation}
          onAnimationComplete={onAnimationComplete}
        />
      </ErrorBoundary>
    </div>
  );
};

// Animation wrapper with minimum loading time and animation completion
const AnimatedLiveStoreApp: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [showIncomingAnimation, setShowIncomingAnimation] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [liveStoreReady, setLiveStoreReady] = useState(false);
  const [minimumTimeElapsed, setMinimumTimeElapsed] = useState(false);
  const [portalAnimationComplete, setPortalAnimationComplete] = useState(false);

  // Ensure minimum loading time (so users see the progressive loading)
  useEffect(() => {
    const minimumLoadingTimer = setTimeout(() => {
      setMinimumTimeElapsed(true);
    }, 2500); // Minimum 2.5 seconds to appreciate the loading

    return () => clearTimeout(minimumLoadingTimer);
  }, []);

  // Trigger animation when both LiveStore is ready AND minimum time elapsed
  useEffect(() => {
    if (liveStoreReady && minimumTimeElapsed && isLoading) {
      setShowIncomingAnimation(true);
      // Wait for portal animation to complete (expansion + shrink to dot)
      setTimeout(() => {
        setPortalAnimationComplete(true);
      }, 2200); // Time for full portal sequence
    }
  }, [liveStoreReady, minimumTimeElapsed, isLoading]);

  // Complete transition only after portal animation finishes
  useEffect(() => {
    if (portalAnimationComplete && showIncomingAnimation) {
      setIsLoading(false);
      // Allow time for header animation to complete
      setTimeout(() => setAnimationComplete(true), 1500);
    }
  }, [portalAnimationComplete, showIncomingAnimation]);

  return (
    <>
      {/* Loading screen overlay - fixed position to prevent layout shift */}
      {isLoading && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <NotebookLoadingScreen
            ready={liveStoreReady}
            onPortalAnimationComplete={() => setPortalAnimationComplete(true)}
          />
        </div>
      )}

      {/* Main app with LiveStore integration */}
      <LiveStoreApp
        showIncomingAnimation={showIncomingAnimation && !animationComplete}
        onAnimationComplete={() => setAnimationComplete(true)}
        onLiveStoreReady={() => setLiveStoreReady(true)}
      />
    </>
  );
};

// Component to detect when LiveStore is ready
const LiveStoreReadyDetector: React.FC<{ onReady?: () => void }> = ({
  onReady,
}) => {
  const readyRef = useRef(false);

  useEffect(() => {
    // If this component renders, LiveStore is ready
    if (!readyRef.current) {
      readyRef.current = true;
      onReady?.();
    }
  }, [onReady]);

  return null;
};

// LiveStore setup - moved inside AuthGuard to ensure auth happens first
const LiveStoreApp: React.FC<{
  showIncomingAnimation?: boolean;
  onAnimationComplete?: () => void;
  onLiveStoreReady?: () => void;
}> = ({
  showIncomingAnimation = false,
  onAnimationComplete,
  onLiveStoreReady,
}) => {
  const storeId = getStoreId();

  // Check for reset parameter to handle schema evolution issues
  const resetPersistence =
    new URLSearchParams(window.location.search).get("reset") !== null;

  // Clean up URL if reset was requested
  useEffect(() => {
    if (resetPersistence) {
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.delete("reset");
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}?${searchParams.toString()}`
      );
    }
  }, [resetPersistence]);

  // Get authenticated user info to set clientId
  const {
    user: { sub: clientId },
    accessToken,
  } = useAuth();

  const adapter = makePersistedAdapter({
    storage: { type: "opfs" },
    worker: LiveStoreWorker,
    sharedWorker: LiveStoreSharedWorker,
    resetPersistence,
    clientId, // This ties the LiveStore client to the authenticated user
  });

  return (
    <LiveStoreProvider
      schema={schema}
      adapter={adapter}
      renderLoading={(_status) => {
        // Let our overlay handle loading
        // console.debug(`LiveStore Loading status: ${JSON.stringify(_status)}`);
        return <></>;
      }}
      batchUpdates={batchUpdates}
      storeId={storeId}
      syncPayload={{ authToken: accessToken, clientId }}
    >
      <LiveStoreReadyDetector onReady={onLiveStoreReady} />
      <NotebookApp
        showIncomingAnimation={showIncomingAnimation}
        onAnimationComplete={onAnimationComplete}
      />
    </LiveStoreProvider>
  );
};

// Set up authentication error handling
if (typeof Worker !== "undefined") {
  // Listen for messages from the LiveStore worker
  const handleWorkerMessage = (event: MessageEvent) => {
    if (event.data?.type === "AUTH_ERROR") {
      console.error("Authentication error from LiveStore:", event.data.message);

      // Show user-friendly message
      const message =
        "Your session has expired. The page will reload to sign you in again.";
      alert(message);
    }

    if (event.data?.type === "FORCE_RELOAD") {
      console.warn("Forcing page reload due to authentication failure");

      // Clear any cached auth state
      try {
        localStorage.removeItem("openid_tokens");
        localStorage.removeItem("openid_request_state");
      } catch (e) {
        console.warn("Failed to clear auth tokens:", e);
      }

      // Add reset parameter to clear LiveStore state
      const url = new URL(window.location.href);
      url.searchParams.set("reset", "auth-expired");

      // Force reload with reset parameter
      window.location.href = url.toString();
    }
  };

  // Add global listener for worker messages
  if (typeof window !== "undefined") {
    // This will catch messages from both regular and shared workers
    addEventListener("message", handleWorkerMessage);
  }
}

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/oidc" element={<AuthRedirect />} />
        <Route
          path="/*"
          element={
            <AuthGuard>
              <AnimatedLiveStoreApp />
            </AuthGuard>
          }
        />
      </Routes>
    </AuthProvider>
  );
};
