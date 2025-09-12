import { AuthGuard } from "@/auth/AuthGuard";
import { AuthProvider } from "@/auth/AuthProvider";
import { FPSMeter } from "@/components/debug/FPSMeter.tsx";
import { LoadingState } from "@/components/loading/LoadingState.js";
import { Toaster } from "@/components/ui/sonner.js";
import AuthorizePage from "@/pages/AuthorizePage.tsx";
import {
  isLoadingScreenVisible,
  removeStaticLoadingScreen,
} from "@/util/domUpdates.js";
import React, { Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

// Import page components
import { NotebookPage } from "@/pages/NotebookPage.tsx";
import { NotebooksDashboardPage } from "@/pages/NotebooksDashboardPage.tsx";
import OidcCallbackPage from "@/pages/OidcCallbackPage.tsx";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallbackPage } from "./components/ErrorFallbackPage";
import { GeoJsonDemoPage } from "./pages/GeoJsonDemoPage";

export const App: React.FC = () => {
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
      <ErrorBoundary
        // Note: this must a render prop for error fallback
        fallbackRender={({ error }) => <ErrorFallbackPage error={error} />}
      >
        <Routes>
          <Route path="/oidc" element={<OidcCallbackPage />} />
          <Route path="/local_oidc/authorize" element={<AuthorizePage />} />
          <Route
            path="/nb/:id/*"
            element={
              <AuthGuard>
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
              </AuthGuard>
            }
          />
          <Route
            path="/nb"
            element={
              <AuthGuard>
                <Suspense
                  fallback={
                    <LoadingState
                      variant="fullscreen"
                      message="Loading notebooks..."
                    />
                  }
                >
                  <NotebooksDashboardPage />
                </Suspense>
              </AuthGuard>
            }
          />
          <Route path="/" element={<Navigate to="/nb" replace />} />
          <Route
            path="/demo/geojson"
            element={<GeoJsonDemoPage to="/geojson" />}
          />
        </Routes>
        <FPSMeter />
        <Toaster />
      </ErrorBoundary>
    </AuthProvider>
  );
};
