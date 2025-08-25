import { schema } from "@/schema";
import { makePersistedAdapter } from "@livestore/adapter-web";
import LiveStoreSharedWorker from "@livestore/adapter-web/shared-worker?sharedworker";
import { BootStatus } from "@livestore/livestore";
import { LiveStoreProvider } from "@livestore/react";
import React, { useEffect, useRef } from "react";
import { unstable_batchedUpdates as batchUpdates } from "react-dom";
import { useAuthenticatedUser } from "../../auth/use-simple-auth.js";
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

  // Get authenticated user info and access token
  const {
    user: { sub: clientId },
    accessToken,
  } = useAuthenticatedUser();

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
      {children}
    </LiveStoreProvider>
  );
};
