/**
 * The LiveStore provider is annoying to use because it tries to wrap your entire application.
 * This is bad because it blocks rendering. The supported `renderLoading` is not a good solution because it's too top-down.
 *
 * This provider is a workaround of above issues.
 *
 * To use it we do:
 * - `LiveStoreProviderProvider` at the root of your application
 * - `LiveStoreReady` in any child component that needs LiveStore
 */

import { schema } from "@/schema";
import { makePersistedAdapter } from "@livestore/adapter-web";
import LiveStoreSharedWorker from "@livestore/adapter-web/shared-worker?sharedworker";
import { BootStatus } from "@livestore/livestore";
import { LiveStoreProvider } from "@livestore/react";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { unstable_batchedUpdates as batchUpdates } from "react-dom";
import { useAuth } from "../../auth/index.js";
import LiveStoreWorker from "./livestore.worker?worker";

interface BetterLiveStoreContextType {
  isReady: boolean;
}

const BetterLiveStoreContext = createContext<
  BetterLiveStoreContextType | undefined
>(undefined);

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

interface LivestoreProviderProviderProps {
  storeId: string;
  onLiveStoreReady?: () => void;
  children: React.ReactNode;
}

// LiveStore setup - moved inside AuthGuard to ensure auth happens first
export const LivestoreProviderProvider: React.FC<
  LivestoreProviderProviderProps
> = ({ storeId, onLiveStoreReady, children }) => {
  const [liveStoreReady, setLiveStoreReady] = useState(false);

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

  // Get authenticated user info and access token
  const {
    user: { sub: clientId },
    accessToken,
  } = useAuth();

  // Create completely static sync payload that never changes reference
  // Token and clientId are updated via useEffect to prevent LiveStore restarts
  const syncPayload = useRef({
    authToken: accessToken || "",
    clientId,
  });

  // Update clientId and authToken if they change, but keep same object reference
  useEffect(() => {
    syncPayload.current.clientId = clientId;
    syncPayload.current.authToken = accessToken || "";
  }, [clientId, accessToken]);

  const adapter = useMemo(
    () =>
      makePersistedAdapter({
        storage: { type: "opfs" },
        worker: LiveStoreWorker,
        sharedWorker: LiveStoreSharedWorker,
        resetPersistence,
        clientId, // This ties the LiveStore client to the authenticated user
      }),
    [clientId, resetPersistence]
  );

  // NOTE: Rendering children in the way below will not cause a flicker because DOM node positions are stable

  return (
    <BetterLiveStoreContext.Provider value={{ isReady: liveStoreReady }}>
      {/* Render children if LiveStore is not ready */}
      {!liveStoreReady && children}
      <LiveStoreProvider
        schema={schema}
        adapter={adapter}
        renderLoading={loading}
        batchUpdates={batchUpdates}
        storeId={storeId}
        syncPayload={syncPayload.current}
      >
        <LiveStoreReadyDetector
          onReady={() => {
            setLiveStoreReady(true);
            onLiveStoreReady?.();
          }}
        />
        {/* Render children if LiveStore is ready */}
        {liveStoreReady && children}
      </LiveStoreProvider>
    </BetterLiveStoreContext.Provider>
  );
};

export function LiveStoreReady({ children }: { children: React.ReactNode }) {
  const ctx = useContext(BetterLiveStoreContext);
  if (ctx === undefined) {
    throw new Error(
      "LiveStoreReady must be used within a LivestoreProviderProvider"
    );
  }
  const { isReady } = ctx;
  return isReady ? children : null;
}

export function useLiveStoreReady() {
  const ctx = useContext(BetterLiveStoreContext);
  if (ctx === undefined) {
    throw new Error(
      "useLiveStoreReady must be used within a LivestoreProviderProvider"
    );
  }
  const { isReady } = ctx;
  return isReady;
}
