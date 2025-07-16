import { makePersistedAdapter } from "@livestore/adapter-web";
import LiveStoreSharedWorker from "@livestore/adapter-web/shared-worker?sharedworker";
import { LiveStoreProvider } from "@livestore/react";

import React, { useEffect, useState, Suspense } from "react";

// Dynamic import for FPSMeter - development tool only
const FPSMeter = React.lazy(() =>
  import("@overengineering/fps-meter").then((m) => ({
    default: m.FPSMeter,
  }))
);
import { unstable_batchedUpdates as batchUpdates } from "react-dom";

import { NotebookViewer } from "./components/notebook/NotebookViewer.js";
import { AuthGuard } from "./components/auth/AuthGuard.js";

import LiveStoreWorker from "./livestore.worker?worker";
import { schema } from "@runt/schema";
import { getCurrentNotebookId, getStoreId } from "./util/store-id.js";
import {
  getCurrentAuthToken,
  initializeAuth,
  googleAuthManager,
} from "./auth/google-auth.js";
import { ErrorBoundary } from "react-error-boundary";

const NotebookApp: React.FC = () => {
  // In the simplified architecture, we always show the current notebook
  // The notebook ID comes from the URL and is the same as the store ID
  const currentNotebookId = getCurrentNotebookId();
  const [debugMode, setDebugMode] = useState(false);
  // Note: Auth token updates are handled via error detection and page reload
  // rather than dynamic sync payload updates, as LiveStore doesn't support
  // runtime sync payload changes

  // Background token refresh for LiveStore sync continuity
  useEffect(() => {
    const maintainAuthForSync = async () => {
      if (!googleAuthManager.isEnabled()) {
        return; // Skip validation in local dev mode
      }

      try {
        // Proactively refresh token to maintain LiveStore sync
        const refreshedToken = await googleAuthManager.refreshToken();
        if (!refreshedToken) {
          console.warn("Token refresh failed - sync may be interrupted");
          // Don't force reload immediately - let LiveStore handle auth failure
          // User will see auth prompt when they next interact
        } else {
          console.log("Token refreshed successfully for sync continuity");
        }
      } catch (error) {
        console.error("Auth refresh failed:", error);
        // Don't force reload - let LiveStore handle the auth error gracefully
      }
    };

    // Refresh token every 5 minutes to maintain sync
    const interval = setInterval(maintainAuthForSync, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Listen for WebSocket connection errors that might indicate auth issues
  useEffect(() => {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 3;

    const validateAuth = async () => {
      if (!googleAuthManager.isEnabled()) {
        return; // Skip in local dev mode
      }

      try {
        // Try to refresh token for sync continuity
        const refreshedToken = await googleAuthManager.refreshToken();
        if (!refreshedToken) {
          console.warn("Token refresh failed on reconnection");
          // Don't force reload - let user continue with potential auth prompt
        }
      } catch (error) {
        console.error("Auth validation failed:", error);
      }
    };

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        googleAuthManager.isEnabled()
      ) {
        // When user returns to tab, proactively refresh token for sync
        googleAuthManager
          .refreshToken()
          .then((refreshedToken) => {
            if (refreshedToken) {
              console.log("Token refreshed on tab focus");
            } else {
              console.warn("Token refresh failed on tab focus");
            }
          })
          .catch((error) => {
            console.error("Auth refresh on focus failed:", error);
          });
      }
    };

    // Monitor for repeated WebSocket failures that might indicate auth issues
    const handleBeforeUnload = () => {
      reconnectAttempts++;
      if (reconnectAttempts >= maxReconnectAttempts) {
        console.warn("Multiple reconnection attempts, checking auth state");
        // Set a flag to check auth on next load
        sessionStorage.setItem("checkAuthOnLoad", "true");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Check if we should validate auth on load
    if (sessionStorage.getItem("checkAuthOnLoad") === "true") {
      sessionStorage.removeItem("checkAuthOnLoad");
      validateAuth();
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

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
  const [authInitialized, setAuthInitialized] = useState(false);
  const [currentAuthToken, setCurrentAuthToken] = useState<string>(() =>
    getCurrentAuthToken()
  );

  // Initialize auth system early
  useEffect(() => {
    const initAuth = async () => {
      try {
        await initializeAuth();
        setAuthInitialized(true);
      } catch (error) {
        console.error("Failed to initialize auth:", error);
        // Continue anyway for fallback mode
        setAuthInitialized(true);
      }
    };

    initAuth();
  }, []);

  // Listen for token changes to update LiveStore sync payload
  useEffect(() => {
    if (!googleAuthManager.isEnabled()) {
      return;
    }

    const unsubscribe = googleAuthManager.addTokenChangeListener((newToken) => {
      const token = newToken || getCurrentAuthToken();
      console.log("Auth token changed, updating sync payload");
      setCurrentAuthToken(token);
    });

    return unsubscribe;
  }, []);

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

  const adapter = makePersistedAdapter({
    storage: { type: "opfs" },
    worker: LiveStoreWorker,
    sharedWorker: LiveStoreSharedWorker,
    resetPersistence,
  });

  // Use the reactive auth token that updates when token changes

  // Show loading while auth is initializing
  if (!authInitialized) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-foreground mb-2 text-lg font-semibold">
            Initializing Authentication
          </div>
          <div className="text-muted-foreground text-sm">
            Setting up secure connection...
          </div>
        </div>
      </div>
    );
  }

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
      syncPayload={{ authToken: currentAuthToken }}
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
        localStorage.removeItem("google_auth_token");
        document.cookie =
          "google_auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
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
    <AuthGuard>
      <LiveStoreApp />
    </AuthGuard>
  );
};
