import { schema } from "@/schema";
import { makePersistedAdapter } from "@livestore/adapter-web";
import LiveStoreSharedWorker from "@livestore/adapter-web/shared-worker?sharedworker";
import { BootStatus } from "@livestore/livestore";
import { LiveStoreProvider } from "@livestore/react";
import React, { useEffect, useMemo, useRef } from "react";
import { unstable_batchedUpdates as batchUpdates } from "react-dom";
import { useAuth } from "../../auth/index.js";
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
    user: { sub: userId },
    accessToken,
  } = useAuth();

  // Generate clientId following LiveStore best practices
  // ClientId should identify device/app instances, not users
  // Store in localStorage to keep stable across component remounts and shared across tabs
  const clientId = useMemo(() => {
    const storageKey = `livestore-client-id-${userId}`;
    let storedClientId = localStorage.getItem(storageKey);

    if (!storedClientId) {
      storedClientId = `${userId}-${crypto.randomUUID()}`;
      localStorage.setItem(storageKey, storedClientId);
    }

    return storedClientId;
  }, [userId]);

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
        clientId, // This identifies the device/app instance following LiveStore best practices
      }),
    [clientId, resetPersistence]
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
      {children}
    </LiveStoreProvider>
  );
};
