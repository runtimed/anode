import { schema } from "@runtimed/schema";
import { BootStatus } from "@runtimed/schema";
import { LiveStoreProvider } from "@livestore/react";
import React, { useEffect, useRef } from "react";
import { unstable_batchedUpdates as batchUpdates } from "react-dom";
import { useAuth } from "../auth/index.js";
import { useStore } from "@livestore/react";
import { events } from "@runtimed/schema";
import { sharedLiveStoreAdapter } from "./adapter.js";

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

  return (
    <LiveStoreProvider
      schema={schema}
      adapter={sharedLiveStoreAdapter}
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
