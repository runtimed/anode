import { schema } from "@/schema";
import { makePersistedAdapter } from "@livestore/adapter-web";
import LiveStoreSharedWorker from "@livestore/adapter-web/shared-worker?sharedworker";
import { BootStatus } from "@livestore/livestore";
import { LiveStoreProvider } from "@livestore/react";
import React, { useEffect, useMemo, useRef } from "react";
import { unstable_batchedUpdates as batchUpdates } from "react-dom";
import { useAuth } from "../../auth/index.js";
import { useStore } from "@livestore/react";
import { events } from "@/schema";
import LiveStoreWorker from "./livestore.worker?worker";

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

// Component to set up authenticated user as an actor
const UserSetup: React.FC = () => {
  const { store } = useStore();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      // Extract specific user fields we need
      const { sub: userId, name, given_name, family_name } = user;

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
  }, [
    isAuthenticated,
    user.sub,
    user.name,
    user.given_name,
    user.family_name,
    store,
  ]);

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

  const adapter = useMemo(
    () =>
      makePersistedAdapter({
        storage: { type: "opfs" },
        worker: LiveStoreWorker,
        sharedWorker: LiveStoreSharedWorker,
        resetPersistence,
        // Let LiveStore generate and manage clientId
      }),
    [resetPersistence]
  );

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
      <UserSetup />
      {children}
    </LiveStoreProvider>
  );
};
