import { useAuth } from "@/auth/index.js";
import {
  removeStaticLoadingScreen,
  updateLoadingStage,
} from "@/util/domUpdates.js";
import React, { Suspense, useEffect, useState } from "react";

const NotebookLoadingScreen = React.lazy(() =>
  import("@/components/notebook/NotebookLoadingScreen.js").then((m) => ({
    default: m.NotebookLoadingScreen,
  }))
);

export function LoadingScreen({ liveStoreReady }: { liveStoreReady: boolean }) {
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShowAnimation, setShouldShowAnimation] = useState(false);

  const [portalAnimationComplete, setPortalAnimationComplete] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  // Show loading animation only after auth confirmation
  useEffect(() => {
    if (isAuthenticated) {
      setShouldShowAnimation(true);
    }
  }, [isAuthenticated]);

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

  // Loading screen overlay
  return (
    shouldShowAnimation &&
    isLoading && (
      <div className="fixed inset-0 z-50 overflow-hidden">
        <Suspense fallback={<div className="min-h-screen bg-white" />}>
          <NotebookLoadingScreen
            ready={portalReady}
            onPortalAnimationComplete={() => setPortalAnimationComplete(true)}
          />
        </Suspense>
      </div>
    )
  );
}
