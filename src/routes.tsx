import React, { Suspense, useEffect } from "react";
import { AuthProvider } from "react-oidc-context";
import { Route, Routes } from "react-router-dom";
import { AuthGuard } from "@/auth/index.js";
import { createOidcConfig } from "@/auth/oidc-config.js";
import AuthorizePage from "@/pages/AuthorizePage.tsx";
import { LoadingState } from "@/components/loading/LoadingState.js";
import { Toaster } from "@/components/ui/sonner.js";
import { FPSMeter } from "@/components/debug/FPSMeter.tsx";
import {
  isLoadingScreenVisible,
  removeStaticLoadingScreen,
} from "@/util/domUpdates.js";

// Import page components
import { HomePage } from "@/pages/HomePage.tsx";
import { OidcCallbackPage } from "@/pages/OidcCallbackPage.tsx";
import { NotebooksDashboardPage } from "@/pages/NotebooksDashboardPage.tsx";
import { NotebookPage } from "@/pages/NotebookPage.tsx";

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
    <AuthProvider {...createOidcConfig()}>
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
        <Route
          path="/*"
          element={
            <AuthGuard>
              <HomePage />
            </AuthGuard>
          }
        />
      </Routes>
      <FPSMeter />
      <Toaster />
    </AuthProvider>
  );
};
