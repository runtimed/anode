import React, { Suspense, useEffect, useState } from "react";

import { Route, Routes } from "react-router-dom";
import { AuthGuard } from "./components/auth/AuthGuard.js";
import {
  LoadingState,
  MinimalLoading,
} from "./components/loading/LoadingState.js";
import { GraphQLClientProvider } from "./lib/graphql-client.js";
import {
  isLoadingScreenVisible,
  removeStaticLoadingScreen,
  updateLoadingStage,
} from "./util/domUpdates.js";

// Dynamic import for FPSMeter - development tool only
const FPSMeter = React.lazy(() =>
  import("@overengineering/fps-meter").then((m) => ({
    default: m.FPSMeter,
  }))
);

const NotebookLoadingScreen = React.lazy(() =>
  import("./components/notebook/NotebookLoadingScreen.js").then((m) => ({
    default: m.NotebookLoadingScreen,
  }))
);
// Direct imports for critical auth components
import AuthRedirect from "./components/auth/AuthRedirect.js";
import AuthorizePage from "./components/auth/AuthorizePage.js";

import { AuthProvider, useAuth } from "./components/auth/AuthProvider.js";
import { getOpenIdService } from "./services/openid.js";

import { TrpcProvider } from "./components/TrpcProvider.tsx";
import { Toaster } from "./components/ui/sonner.js";
import { CustomLiveStoreProvider } from "./components/livestore/CustomLiveStoreProvider.tsx";
import { NotebookApp } from "./components/NotebookApp.tsx";
import { useDebug } from "./debug-mode.tsx";
import { getStoreId } from "./util/store-id.ts";

// Lazy load runbook components
const RunbookDashboard = React.lazy(() =>
  import("./components/runbooks/RunbookDashboard.js").then((m) => ({
    default: m.RunbookDashboard,
  }))
);
const RunbookViewer = React.lazy(() =>
  import("./components/runbooks/RunbookViewer.tsx").then((m) => ({
    default: m.RunbookViewer,
  }))
);

// Lazy load notebook components for the new /nb routes
const NotebooksDashboard = React.lazy(() =>
  import("./components/notebooks/NotebookDashboard.tsx").then((m) => ({
    default: m.NotebookDashboard,
  }))
);
const NotebookPage = React.lazy(() =>
  import("./components/notebooks/NotebookPage.tsx").then((m) => ({
    default: m.NotebookPage,
  }))
);

// Animation wrapper with minimum loading time and animation completion
const AnimatedLiveStoreApp: React.FC = () => {
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
        storeId={getStoreId()}
        onLiveStoreReady={() => setLiveStoreReady(true)}
      >
        <NotebookApp />
      </CustomLiveStoreProvider>
    </>
  );
};

export const App: React.FC = () => {
  const debug = useDebug();

  // Auth recovery: Check for reset auth parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has("reset_auth")) {
      console.log("🔄 Auth reset requested from URL parameter");
      try {
        const openIdService = getOpenIdService();
        openIdService.reset();
        console.log("✅ Auth state cleared successfully");
      } catch (error) {
        console.error("❌ Failed to reset auth:", error);
        // Fallback: clear localStorage directly
        try {
          localStorage.removeItem("openid_tokens");
          localStorage.removeItem("openid_request_state");
          console.log("✅ Fallback auth clear completed");
        } catch (storageError) {
          console.error("❌ Fallback auth clear failed:", storageError);
        }
      }

      // Clean up URL
      searchParams.delete("reset_auth");
      const newUrl = `${window.location.pathname}${searchParams.toString() ? "?" + searchParams.toString() : ""}`;
      window.history.replaceState(null, "", newUrl);
    }
  }, []);

  // Debug auth state changes
  useEffect(() => {
    if (debug.enabled) {
      console.log("🐛 Debug mode: Auth state monitoring enabled");

      // Monitor localStorage changes
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = function (key: string, value: string) {
        if (key.startsWith("openid_")) {
          console.log(
            "🔑 Auth storage change:",
            key,
            typeof value === "string" ? value.substring(0, 50) + "..." : value
          );
        }
        return originalSetItem.call(this, key, value);
      };

      // Monitor localStorage removals
      const originalRemoveItem = localStorage.removeItem;
      localStorage.removeItem = function (key: string) {
        if (key.startsWith("openid_")) {
          console.log("🗑️ Auth storage removal:", key);
        }
        return originalRemoveItem.call(this, key);
      };

      return () => {
        localStorage.setItem = originalSetItem;
        localStorage.removeItem = originalRemoveItem;
      };
    }
  }, [debug.enabled]);

  // Safety net: Auto-remove loading screen if no component has handled it
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (isLoadingScreenVisible()) {
        // Check if React has rendered content
        const rootElement = document.getElementById("react-app");
        const hasContent = rootElement && rootElement.children.length > 0;

        if (hasContent) {
          console.warn("Loading screen auto-removed by safety net");
          removeStaticLoadingScreen();
          clearInterval(checkInterval);
        }
      } else {
        clearInterval(checkInterval);
      }
    }, 100);

    // Absolute fallback after 5 seconds
    const fallbackTimeout = setTimeout(() => {
      if (isLoadingScreenVisible()) {
        console.warn("Loading screen force-removed after timeout");
        removeStaticLoadingScreen();
      }
      clearInterval(checkInterval);
    }, 5000);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(fallbackTimeout);
    };
  }, []);

  return (
    <AuthProvider>
      {/* Debug FPS Meter - fixed position in corner */}
      {debug.enabled && import.meta.env.DEV && (
        <div
          style={{
            bottom: 0,
            right: debug.enabled ? 400 : 0, // Leave space for debug panel
            position: "fixed",
            background: "#333",
            zIndex: 50,
          }}
        >
          <Suspense
            fallback={<MinimalLoading message="Loading FPS meter..." />}
          >
            <FPSMeter height={40} />
          </Suspense>
        </div>
      )}
      <Routes>
        <Route path="/oidc" element={<AuthRedirect />} />
        <Route path="/local_oidc/authorize" element={<AuthorizePage />} />
        <Route
          path="/auth/reset"
          element={
            <div className="bg-background flex min-h-screen items-center justify-center p-4">
              <div className="w-full max-w-md space-y-4 text-center">
                <h1 className="text-2xl font-semibold">Auth Reset Complete</h1>
                <p className="text-muted-foreground">
                  Authentication state has been cleared.
                </p>
                <button
                  onClick={() => (window.location.href = "/")}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-4 py-2"
                >
                  Return Home
                </button>
              </div>
            </div>
          }
        />
        <Route
          path="/r/:ulid/*"
          element={
            <AuthGuard>
              <GraphQLClientProvider>
                <Suspense
                  fallback={
                    <LoadingState
                      variant="fullscreen"
                      message="Loading runbook..."
                    />
                  }
                >
                  <RunbookViewer />
                </Suspense>
              </GraphQLClientProvider>
            </AuthGuard>
          }
        />
        <Route
          path="/r"
          element={
            <AuthGuard>
              <GraphQLClientProvider>
                <Suspense
                  fallback={
                    <LoadingState
                      variant="fullscreen"
                      message="Loading runbooks..."
                    />
                  }
                >
                  <RunbookDashboard />
                </Suspense>
              </GraphQLClientProvider>
            </AuthGuard>
          }
        />
        <Route
          path="/nb/:id/*"
          element={
            <AuthGuard>
              <TrpcProvider>
                <Suspense
                  fallback={
                    <LoadingState
                      variant="fullscreen"
                      message="Loading notebook..."
                    />
                  }
                >
                  <NotebookPage />
                </Suspense>
              </TrpcProvider>
            </AuthGuard>
          }
        />
        <Route
          path="/nb"
          element={
            <AuthGuard>
              <TrpcProvider>
                <Suspense
                  fallback={
                    <LoadingState
                      variant="fullscreen"
                      message="Loading notebooks..."
                    />
                  }
                >
                  <NotebooksDashboard />
                </Suspense>
              </TrpcProvider>
            </AuthGuard>
          }
        />
        <Route
          path="/*"
          element={
            <AuthGuard>
              <AnimatedLiveStoreApp />
            </AuthGuard>
          }
        />
      </Routes>
      <Toaster />
    </AuthProvider>
  );
};
