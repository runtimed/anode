import { schema } from "@/schema";
import { makePersistedAdapter } from "@livestore/adapter-web";
import LiveStoreSharedWorker from "@livestore/adapter-web/shared-worker?sharedworker";
import { BootStatus } from "@livestore/livestore";
import { LiveStoreProvider } from "@livestore/react";
import React, { useEffect, useRef } from "react";
import { unstable_batchedUpdates as batchUpdates } from "react-dom";
import { useAuthenticatedUser } from "../auth/AuthProvider.js";
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

        if (
          !tokenString ||
          tokenString === "null" ||
          tokenString === "undefined"
        ) {
          return "";
        }

        const tokens = JSON.parse(tokenString);

        // Validate token structure
        if (!tokens || typeof tokens !== "object") {
          console.warn("Invalid token structure in localStorage");
          return "";
        }

        // Validate access token
        const { accessToken } = tokens;
        if (!accessToken || typeof accessToken !== "string") {
          return "";
        }

        // Basic JWT structure validation (should have 3 parts)
        const jwtParts = accessToken.split(".");
        if (jwtParts.length !== 3) {
          console.warn("Access token doesn't appear to be a valid JWT");
          return "";
        }

        // Basic token expiration check - conservative approach
        try {
          const payload = JSON.parse(atob(jwtParts[1]));
          const now = Math.floor(Date.now() / 1000);

          // Only reject tokens that are clearly expired (>1 minute ago)
          if (payload.exp && payload.exp < now - 60) {
            console.warn("Access token appears to be expired");
            return "";
          }
        } catch (jwtError) {
          // JWT parsing failed, but we'll still try to use the token
          console.debug(
            "Could not parse JWT payload, but token might still be valid"
          );
        }

        return accessToken;
      } catch (error) {
        console.warn("Failed to get auth token for sync:", error);

        // Try to clear corrupted data
        try {
          localStorage.removeItem("openid_tokens");
          console.debug("Cleared corrupted auth tokens from localStorage");
        } catch (clearError) {
          console.error("Failed to clear corrupted tokens:", clearError);
        }

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
      {children}
    </LiveStoreProvider>
  );
};
