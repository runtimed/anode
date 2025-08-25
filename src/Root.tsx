import React, { Suspense, useEffect, useState } from "react";

import { Route, Routes } from "react-router-dom";
import { SimpleAuthGuard } from "./auth/SimpleAuthGuard.js";
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
import AuthorizePage from "./components/auth/AuthorizePage.js";

import { AuthProvider, useAuth } from "react-oidc-context";
import { createOidcConfig } from "./auth/oidc-config.js";
import { useSimpleAuth } from "./auth/use-simple-auth.js";

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
  const { authState } = useSimpleAuth();
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

// Simple OIDC callback page
const OidcCallbackPage: React.FC = () => {
  const auth = useAuth();

  useEffect(() => {
    if (auth.isAuthenticated) {
      console.log("🔍 OidcCallbackPage: Authenticated, redirecting to home");
      window.location.href = "/";
    }
  }, [auth.isAuthenticated]);

  if (auth.error) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold text-red-600">
            Authentication Error
          </div>
          <p className="mt-2 text-sm text-gray-600">{auth.error.message}</p>
          <button
            onClick={() => (window.location.href = "/")}
            className="mt-4 rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="space-y-6 text-center">
        <div>
          <div className="text-foreground mb-2 text-lg font-semibold">
            Following the White Rabbit...
          </div>
          <p className="text-muted-foreground text-sm">
            Processing authentication
          </p>
        </div>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const debug = useDebug();

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
    <AuthProvider {...createOidcConfig()}>
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
        <Route path="/oidc" element={<OidcCallbackPage />} />
        <Route path="/local_oidc/authorize" element={<AuthorizePage />} />
        <Route
          path="/r/:ulid/*"
          element={
            <SimpleAuthGuard>
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
            </SimpleAuthGuard>
          }
        />
        <Route
          path="/r"
          element={
            <SimpleAuthGuard>
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
            </SimpleAuthGuard>
          }
        />
        <Route
          path="/nb/:id/*"
          element={
            <SimpleAuthGuard>
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
            </SimpleAuthGuard>
          }
        />
        <Route
          path="/nb"
          element={
            <SimpleAuthGuard>
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
            </SimpleAuthGuard>
          }
        />
        <Route
          path="/*"
          element={
            <SimpleAuthGuard>
              <AnimatedLiveStoreApp />
            </SimpleAuthGuard>
          }
        />
      </Routes>
      <Toaster />
    </AuthProvider>
  );
};
