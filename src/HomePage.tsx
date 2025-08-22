import { useAuth } from "@/components/auth/AuthProvider.js";
import { CustomLiveStoreProvider } from "@/components/livestore/CustomLiveStoreProvider.tsx";
import { NotebookApp } from "@/components/NotebookApp.tsx";
import {
  removeStaticLoadingScreen,
  updateLoadingStage,
} from "@/util/domUpdates.js";
import { getStoreId } from "@/util/store-id.ts";
import React, { Suspense, useEffect, useState } from "react";

const NotebookLoadingScreen = React.lazy(() =>
  import("@/components/notebook/NotebookLoadingScreen.js").then((m) => ({
    default: m.NotebookLoadingScreen,
  }))
);

const storeId = getStoreId();

// Animation wrapper with minimum loading time and animation completion
export const HomePage: React.FC = () => {
  const { authState } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShowAnimation, setShouldShowAnimation] = useState(false);

  const [liveStoreReady, setLiveStoreReady] = useState(false);
  const [portalAnimationComplete, setPortalAnimationComplete] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  // Show loading animation only after auth confirmation
  useEffect(() => {
    if (authState.valid) {
      setShouldShowAnimation(true);
    }
  }, [authState.valid]);

  // Update static loading screen stage when LiveStore is ready
  useEffect(() => {
    if (liveStoreReady) {
      updateLoadingStage("loading-notebook");
    }
  }, [liveStoreReady]);

  // Trigger animation when LiveStore is ready
  useEffect(() => {
    if (liveStoreReady && isLoading) {
      updateLoadingStage("ready");

      // Ensure React has painted before removing static screen
      requestAnimationFrame(() => {
        // Double RAF to ensure paint has completed
        requestAnimationFrame(() => {
          removeStaticLoadingScreen();
          setPortalReady(true);
        });
      });
    }
  }, [liveStoreReady, isLoading]);

  // Complete transition only after portal animation finishes
  useEffect(() => {
    if (portalAnimationComplete) {
      setIsLoading(false);
    }
  }, [portalAnimationComplete]);

  return (
    <>
      {/* Loading screen overlay */}
      {shouldShowAnimation && isLoading && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <Suspense fallback={<div className="min-h-screen bg-white" />}>
            <NotebookLoadingScreen
              ready={portalReady}
              onPortalAnimationComplete={() => setPortalAnimationComplete(true)}
            />
          </Suspense>
        </div>
      )}

      {/* Main app with LiveStore integration */}
      <CustomLiveStoreProvider
        storeId={storeId}
        onLiveStoreReady={() => setLiveStoreReady(true)}
      >
        <NotebookApp />
      </CustomLiveStoreProvider>
    </>
  );
};
