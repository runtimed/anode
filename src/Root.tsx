import { makePersistedAdapter } from "@livestore/adapter-web";
import LiveStoreSharedWorker from "@livestore/adapter-web/shared-worker?sharedworker";
import { LiveStoreProvider } from "@livestore/react";

import React, { Suspense, useEffect, useRef, useState } from "react";

import { unstable_batchedUpdates as batchUpdates } from "react-dom";
import { Route, Routes } from "react-router-dom";
import { AuthGuard } from "./components/auth/AuthGuard.js";
import {
  LoadingState,
  MinimalLoading,
} from "./components/loading/LoadingState.js";
import { GraphQLClientProvider } from "./lib/graphql-client.js";
import {
  isLoadingScreenVisible,
  removeStaticLoadingScreen,
  updateLoadingStage,
} from "./util/domUpdates.js";

// Dynamic import for FPSMeter - development tool only
const FPSMeter = React.lazy(() =>
  import("@overengineering/fps-meter").then((m) => ({
    default: m.FPSMeter,
  }))
);

// Lazy load notebook components
const NotebookViewer = React.lazy(() =>
  import("./components/notebook/NotebookViewer.js").then((m) => ({
    default: m.NotebookViewer,
  }))
);
const NotebookLoadingScreen = React.lazy(() =>
  import("./components/notebook/NotebookLoadingScreen.js").then((m) => ({
    default: m.NotebookLoadingScreen,
  }))
);
// Lazy load route components
const AuthRedirect = React.lazy(
  () => import("./components/auth/AuthRedirect.js")
);
const AuthorizePage = React.lazy(
  () => import("./components/auth/AuthorizePage.js")
);

import {
  AuthProvider,
  useAuth,
  useAuthenticatedUser,
} from "./components/auth/AuthProvider.js";

import LiveStoreWorker from "./livestore.worker?worker";
import { schema } from "./schema.js";
import { getCurrentNotebookId, getStoreId } from "./util/store-id.js";

import { BootStatus } from "@livestore/livestore";
import { ErrorBoundary } from "react-error-boundary";
import { TrpcProvider } from "./components/TrpcProvider.tsx";
import { Toaster } from "./components/ui/sonner.js";

// Lazy load runbook components
const RunbookDashboard = React.lazy(() =>
  import("./components/runbooks/RunbookDashboard.js").then((m) => ({
    default: m.RunbookDashboard,
  }))
);
const RunbookViewer = React.lazy(() =>
  import("./components/runbooks/RunbookViewer.tsx").then((m) => ({
    default: m.RunbookViewer,
  }))
);

// Lazy load notebook components for the new /nb routes
const NotebooksDashboard = React.lazy(() =>
  import("./components/notebooks/NotebookDashboard.tsx").then((m) => ({
    default: m.NotebookDashboard,
  }))
);
const NotebookViewer2 = React.lazy(() =>
  import("./components/notebooks/NotebookViewer.tsx").then((m) => ({
    default: m.NotebookViewer,
  }))
);

interface NotebookAppProps {}

const NotebookApp: React.FC<NotebookAppProps> = () => {
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
          <Suspense
            fallback={<MinimalLoading message="Loading FPS meter..." />}
          >
            <FPSMeter height={40} />
          </Suspense>
        </div>
      )}
      {/* Main Content */}
      <ErrorBoundary fallback={<div>Error loading notebook</div>}>
        <TrpcProvider>
          <Suspense fallback={<div className="min-h-screen bg-white" />}>
            <NotebookViewer
              notebookId={currentNotebookId}
              debugMode={debugMode}
              onDebugToggle={setDebugMode}
            />
          </Suspense>
        </TrpcProvider>
      </ErrorBoundary>
    </div>
  );
};

// Animation wrapper with minimum loading time and animation completion
const AnimatedLiveStoreApp: React.FC = () => {
  const { authState } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShowAnimation, setShouldShowAnimation] = useState(false);

  const [liveStoreReady, setLiveStoreReady] = useState(false);
  const [portalAnimationComplete, setPortalAnimationComplete] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  // Show loading animation only after auth confirmation
  useEffect(() => {
    if (authState.valid) {
      setShouldShowAnimation(true);
    }
  }, [authState.valid]);

  // Update static loading screen stage when LiveStore is ready
  useEffect(() => {
    if (liveStoreReady) {
      updateLoadingStage("loading-notebook");
    }
  }, [liveStoreReady]);

  // Trigger animation when LiveStore is ready
  useEffect(() => {
    if (liveStoreReady && isLoading) {
      updateLoadingStage("ready");

      // Ensure React has painted before removing static screen
      requestAnimationFrame(() => {
        // Double RAF to ensure paint has completed
        requestAnimationFrame(() => {
          removeStaticLoadingScreen();
          setPortalReady(true);
        });
      });
    }
  }, [liveStoreReady, isLoading]);

  // Complete transition only after portal animation finishes
  useEffect(() => {
    if (portalAnimationComplete) {
      setIsLoading(false);
    }
  }, [portalAnimationComplete]);

  return (
    <>
      {/* Loading screen overlay */}
      {shouldShowAnimation && isLoading && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <Suspense fallback={<div className="min-h-screen bg-white" />}>
            <NotebookLoadingScreen
              ready={portalReady}
              onPortalAnimationComplete={() => setPortalAnimationComplete(true)}
            />
          </Suspense>
        </div>
      )}

      {/* Main app with LiveStore integration */}
      <LiveStoreApp onLiveStoreReady={() => setLiveStoreReady(true)} />
    </>
  );
};

function loading(_status: BootStatus) {
  // Let our overlay handle loading
  // console.debug(`LiveStore Loading status: ${JSON.stringify(_status)}`);
  return <></>;
}

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
  onLiveStoreReady?: () => void;
}> = ({ onLiveStoreReady }) => {
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
  } = useAuthenticatedUser();

  // Create completely static sync payload that never changes reference
  // Token access happens through getter, preventing LiveStore restarts
  const syncPayload = useRef({
    get authToken() {
      // Get current token directly from localStorage without any reactive dependencies
      try {
        const tokenString = localStorage.getItem("openid_tokens");
        const tokens = tokenString ? JSON.parse(tokenString) : null;
        return tokens?.accessToken || "";
      } catch (error) {
        console.warn("Failed to get auth token for sync:", error);
        return "";
      }
    },
    clientId,
  });

  // Update clientId if user changes, but keep same object reference
  useEffect(() => {
    syncPayload.current.clientId = clientId;
  }, [clientId]);

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
      renderLoading={loading}
      batchUpdates={batchUpdates}
      storeId={storeId}
      syncPayload={syncPayload.current}
    >
      <LiveStoreReadyDetector onReady={onLiveStoreReady} />
      <NotebookApp />
    </LiveStoreProvider>
  );
};

export const App: React.FC = () => {
  // Safety net: Auto-remove loading screen if no component has handled it
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (isLoadingScreenVisible()) {
        // Check if React has rendered content
        const rootElement = document.getElementById("react-app");
        const hasContent = rootElement && rootElement.children.length > 0;

        if (hasContent) {
          console.warn("Loading screen auto-removed by safety net");
          removeStaticLoadingScreen();
          clearInterval(checkInterval);
        }
      } else {
        clearInterval(checkInterval);
      }
    }, 100);

    // Absolute fallback after 5 seconds
    const fallbackTimeout = setTimeout(() => {
      if (isLoadingScreenVisible()) {
        console.warn("Loading screen force-removed after timeout");
        removeStaticLoadingScreen();
      }
      clearInterval(checkInterval);
    }, 5000);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(fallbackTimeout);
    };
  }, []);

  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/oidc"
          element={
            <Suspense
              fallback={
                <LoadingState variant="fullscreen" message="Redirecting..." />
              }
            >
              <AuthRedirect />
            </Suspense>
          }
        />
        <Route
          path="/local_oidc/authorize"
          element={
            <Suspense
              fallback={
                <LoadingState
                  variant="fullscreen"
                  message="Preparing the rabbit hole..."
                />
              }
            >
              <AuthorizePage />
            </Suspense>
          }
        />
        <Route
          path="/r/:ulid/*"
          element={
            <AuthGuard>
              <GraphQLClientProvider>
                <Suspense
                  fallback={
                    <LoadingState
                      variant="fullscreen"
                      message="Loading runbook..."
                    />
                  }
                >
                  <RunbookViewer />
                </Suspense>
              </GraphQLClientProvider>
            </AuthGuard>
          }
        />
        <Route
          path="/r"
          element={
            <AuthGuard>
              <GraphQLClientProvider>
                <Suspense
                  fallback={
                    <LoadingState
                      variant="fullscreen"
                      message="Loading runbooks..."
                    />
                  }
                >
                  <RunbookDashboard />
                </Suspense>
              </GraphQLClientProvider>
            </AuthGuard>
          }
        />
        <Route
          path="/nb/:ulid/*"
          element={
            <AuthGuard>
              <TrpcProvider>
                <Suspense
                  fallback={
                    <LoadingState
                      variant="fullscreen"
                      message="Loading notebook..."
                    />
                  }
                >
                  <NotebookViewer2 />
                </Suspense>
              </TrpcProvider>
            </AuthGuard>
          }
        />
        <Route
          path="/nb"
          element={
            <AuthGuard>
              <TrpcProvider>
                <Suspense
                  fallback={
                    <LoadingState
                      variant="fullscreen"
                      message="Loading notebooks..."
                    />
                  }
                >
                  <NotebooksDashboard />
                </Suspense>
              </TrpcProvider>
            </AuthGuard>
          }
        />
        <Route
          path="/*"
          element={
            <AuthGuard>
              <AnimatedLiveStoreApp />
            </AuthGuard>
          }
        />
      </Routes>
      <Toaster />
    </AuthProvider>
  );
};
