import React, { Suspense, useEffect } from "react";

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
} from "./util/domUpdates.js";

// Dynamic import for FPSMeter - development tool only
const FPSMeter = React.lazy(() =>
  import("@overengineering/fps-meter").then((m) => ({
    default: m.FPSMeter,
  }))
);


// Direct imports for critical auth components
import AuthRedirect from "./components/auth/AuthRedirect.js";
import AuthorizePage from "./components/auth/AuthorizePage.js";

import { AuthProvider } from "./components/auth/AuthProvider.js";

import { TrpcProvider } from "./components/TrpcProvider.tsx";
import { Toaster } from "./components/ui/sonner.js";
import { useDebug } from "./debug-mode.tsx";
import { HomePage } from "./HomePage.tsx";

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
              <HomePage />
            </AuthGuard>
          }
        />
      </Routes>
      <Toaster />
    </AuthProvider>
  );
};
