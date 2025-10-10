import { schema, events } from "@runtimed/schema";
import { BootStatus } from "@runtimed/schema";
import { LiveStoreProvider } from "@livestore/react";
import React, { useEffect, useRef } from "react";
import { unstable_batchedUpdates as batchUpdates } from "react-dom";
import { useAuth } from "../auth/index.js";
import { useStore } from "@livestore/react";
import { sharedLiveStoreAdapter } from "./adapter.js";
// Remove Effect/Stream import as they're not properly exported

// Error boundary for LiveStore-related errors
class LiveStoreErrorBoundary extends React.Component<
  { children: React.ReactNode; storeId: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; storeId: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `📚 LiveStore Error Boundary caught error for ${this.props.storeId}:`,
      {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      }
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", color: "red" }}>
          <h3>LiveStore Error for notebook {this.props.storeId}</h3>
          <pre>{this.state.error?.message}</pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function loading(status: BootStatus) {
  // Let our overlay handle loading
  console.log(`📚 LiveStore Loading status:`, status);
  return <></>;
}

// Component to detect when LiveStore is ready
const LiveStoreReadyDetector: React.FC<{
  onReady?: () => void;
  storeId: string;
}> = ({ onReady, storeId }) => {
  const readyRef = useRef(false);
  const { store } = useStore();

  useEffect(() => {
    // If this component renders, LiveStore is ready
    if (!readyRef.current) {
      readyRef.current = true;
      console.log(`📚 LiveStore ready for notebook:`, storeId);
      onReady?.();

      // Log store readiness instead of complex network monitoring
      console.log(`🌐 Store is ready and reactive for ${storeId}`);
    }
  }, [onReady, storeId, store]);

  // Track session lifecycle
  useEffect(() => {
    const sessionId = (store as any)._dev?.sessionId || "unknown";
    console.log(`📝 Notebook session started:`, {
      notebookId: storeId,
      sessionId,
    });

    return () => {
      console.log(`📝 Notebook session ending:`, {
        notebookId: storeId,
        sessionId,
      });
    };
  }, [store, storeId]);

  return null;
};

// Component to set up authenticated user as an actor
const UserSetup: React.FC = () => {
  const { store } = useStore();
  const { user, isAuthenticated } = useAuth();

  // Extract specific user fields we need
  const { sub: userId, name, given_name, family_name } = user;

  useEffect(() => {
    if (isAuthenticated) {
      // Create actor record for the authenticated user
      const displayName =
        name ||
        [given_name, family_name].filter(Boolean).join(" ") ||
        "Unknown User";

      store.commit(
        events.actorProfileSet({
          id: userId,
          displayName,
          type: "human",
        })
      );
    }
  }, [isAuthenticated, userId, name, given_name, family_name, store]);

  return null;
};

interface CustomLiveStoreProviderProps {
  storeId: string;
  onLiveStoreReady?: () => void;
  children: React.ReactNode;
}

// LiveStore setup - moved inside AuthGuard to ensure auth happens first
export const CustomLiveStoreProvider: React.FC<
  CustomLiveStoreProviderProps
> = ({ storeId, onLiveStoreReady, children }) => {
  // Get access token for authentication
  const { accessToken } = useAuth();

  // Create completely static sync payload that never changes reference
  // Token is updated via useEffect to prevent LiveStore restarts
  const syncPayload = useRef({
    authToken: accessToken || "",
  });

  // Update authToken if it changes, but keep same object reference
  useEffect(() => {
    syncPayload.current.authToken = accessToken || "";
  }, [accessToken]);

  // Boot function to debug old notebook issues
  const handleBoot = (store: any) => {
    console.log(`📚 Boot: Starting with notebook`, storeId);

    try {
      // Check if this is an old notebook by looking at existing data
      const cellCount = store.query({
        query: `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='cells'`,
        bindValues: [],
      });
      console.log(`📚 Boot: Cell table exists:`, cellCount);

      // Check LiveStore internal tables
      const schemaInfo = store.query({
        query: `SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '__livestore%'`,
        bindValues: [],
      });
      console.log(`📚 Boot: LiveStore internal tables:`, schemaInfo);

      // Try a simple schema compatibility check
      const cells = store.query({
        query: `SELECT COUNT(*) as count FROM cells LIMIT 1`,
        bindValues: [],
      });
      console.log(`📚 Boot: Schema compatibility check passed, cells:`, cells);

      // Check for any existing executions that might cause issues
      const executions = store.query({
        query: `SELECT COUNT(*) as count FROM executions WHERE status IN ('running', 'queued')`,
        bindValues: [],
      });
      console.log(`📚 Boot: Active executions found:`, executions);
    } catch (error: any) {
      console.error(`📚 Boot: Schema compatibility issue for ${storeId}:`, {
        message: error.message,
        stack: error.stack,
      });
      // This might be why the session is cycling
    }
  };

  return (
    <LiveStoreErrorBoundary storeId={storeId}>
      <LiveStoreProvider
        schema={schema}
        adapter={sharedLiveStoreAdapter}
        renderLoading={loading}
        batchUpdates={batchUpdates}
        storeId={storeId}
        syncPayload={syncPayload.current}
        boot={handleBoot}
      >
        <LiveStoreReadyDetector onReady={onLiveStoreReady} storeId={storeId} />
        <UserSetup />
        {children}
      </LiveStoreProvider>
    </LiveStoreErrorBoundary>
  );
};
