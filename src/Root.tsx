import { makePersistedAdapter } from "@livestore/adapter-web";
import LiveStoreSharedWorker from "@livestore/adapter-web/shared-worker?sharedworker";
import { LiveStoreProvider } from "@livestore/react";

import React, { useEffect, useState, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

// Dynamic import for FPSMeter - development tool only
const FPSMeter = React.lazy(() =>
  import("@overengineering/fps-meter").then((m) => ({
    default: m.FPSMeter,
  }))
);
import { unstable_batchedUpdates as batchUpdates } from "react-dom";

import { NotebookViewer } from "./components/notebook/NotebookViewer.js";
import { AuthGuard } from "./components/auth/AuthGuard.js";
import AuthRedirect from "./components/auth/AuthRedirect.js";
import { AuthProvider } from "./components/auth/AuthProvider.js";

import LiveStoreWorker from "./livestore.worker?worker";
import { schema } from "./schema.js";
import { getCurrentNotebookId, getStoreId } from "./util/store-id.js";
import { useAuth } from "./components/auth/AuthProvider.js";
import { ErrorBoundary } from "react-error-boundary";

const NotebookApp: React.FC = () => {
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
        />
      </ErrorBoundary>
    </div>
  );
};

// LiveStore setup - moved inside AuthGuard to ensure auth happens first
const LiveStoreApp: React.FC = () => {
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
  const { accessToken } = useAuth();
  const user = accessToken.valid ? accessToken.user : null;

  // Use the authenticated user's ID as clientId for proper attribution
  const clientId = user?.sub || "anonymous-user";

  const adapter = makePersistedAdapter({
    storage: { type: "opfs" },
    worker: LiveStoreWorker,
    sharedWorker: LiveStoreSharedWorker,
    resetPersistence,
    clientId, // This ties the LiveStore client to the authenticated user
  });

  // Get current auth token from AuthProvider
  const currentAuthToken = accessToken.valid
    ? accessToken.token
    : "insecure-token-change-me";

  return (
    <LiveStoreProvider
      schema={schema}
      adapter={adapter}
      renderLoading={(_) => (
        <div className="bg-background flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="text-foreground mb-2 text-lg font-semibold">
              Loading Anode
            </div>
            <div className="text-muted-foreground text-sm">
              Stage: {_.stage}
            </div>
          </div>
        </div>
      )}
      batchUpdates={batchUpdates}
      storeId={storeId}
      syncPayload={{ authToken: currentAuthToken, clientId }}
    >
      <NotebookApp />
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
              <LiveStoreApp />
            </AuthGuard>
          }
        />
      </Routes>
    </AuthProvider>
  );
};
