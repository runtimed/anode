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
import { events, schema, tables } from "@runt/schema";
import { getCurrentNotebookId, getStoreId } from "./util/store-id.js";
import { useStore } from "@livestore/react";
import { queryDb } from "@livestore/livestore";
import { getCurrentAuthToken, isAuthStateValid } from "./auth/google-auth.js";

const NotebookApp: React.FC = () => {
  // In the simplified architecture, we always show the current notebook
  // The notebook ID comes from the URL and is the same as the store ID
  const currentNotebookId = getCurrentNotebookId();
  const { store } = useStore();
  const [isInitializing, setIsInitializing] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  // Note: Auth token updates are handled via error detection and page reload
  // rather than dynamic sync payload updates, as LiveStore doesn't support
  // runtime sync payload changes

  // Periodic auth validation to detect token expiry
  useEffect(() => {
    const validateAuth = async () => {
      const isValid = await isAuthStateValid();
      if (!isValid) {
        console.warn("Auth state is invalid, forcing reload with reset");
        const url = new URL(window.location.href);
        url.searchParams.set("reset", "auth-invalid");
        window.location.href = url.toString();
      }
    };

    // Check auth state every 30 seconds for faster detection
    const interval = setInterval(validateAuth, 30 * 1000);

    // Also check immediately
    validateAuth();

    return () => clearInterval(interval);
  }, []);

  // Listen for WebSocket connection errors that might indicate auth issues
  useEffect(() => {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 3;

    const validateAuth = async () => {
      const isValid = await isAuthStateValid();
      if (!isValid) {
        console.warn("Auth state is invalid, forcing reload with reset");
        const url = new URL(window.location.href);
        url.searchParams.set("reset", "auth-invalid");
        window.location.href = url.toString();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // When user returns to tab, validate auth state
        isAuthStateValid().then((isValid) => {
          if (!isValid) {
            console.warn("Auth state invalid on tab focus, reloading");
            const url = new URL(window.location.href);
            url.searchParams.set("reset", "auth-focus-check");
            window.location.href = url.toString();
          }
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

  // Check if notebook exists
  const notebooks = store.useQuery(
    queryDb(tables.notebook.select().limit(1))
  ) as any[];
  const currentNotebook = notebooks[0];

  // Auto-initialize notebook if it doesn't exist
  useEffect(() => {
    if (!currentNotebook && !isInitializing) {
      setIsInitializing(true);
      const notebookId = store.storeId || `notebook-${Date.now()}`;
      const title = `Notebook ${new Date().toLocaleDateString()}`;

      store.commit(
        events.notebookInitialized({
          id: notebookId,
          title,
          ownerId: "current-user", // TODO: get from auth context
        })
      );

      setIsInitializing(false);
    }
  }, [currentNotebook, isInitializing, store]);

  // Show loading while initializing
  if (!currentNotebook && isInitializing) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-foreground mb-2 text-lg font-semibold">
            Initializing Notebook...
          </div>
          <div className="text-muted-foreground text-sm">
            Setting up your workspace...
          </div>
        </div>
      </div>
    );
  }

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
      <NotebookViewer
        notebookId={currentNotebookId}
        debugMode={debugMode}
        onDebugToggle={setDebugMode}
      />
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

  const adapter = makePersistedAdapter({
    storage: { type: "opfs" },
    worker: LiveStoreWorker,
    sharedWorker: LiveStoreSharedWorker,
    resetPersistence: true,
  });

  // Get current auth token (this is called after auth is validated)
  const currentAuthToken = getCurrentAuthToken();

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
