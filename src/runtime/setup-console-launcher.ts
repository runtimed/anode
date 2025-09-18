/**
 * Auto-setup for Console Runtime Launcher
 *
 * Automatically configures the console launcher with store and auth
 * when loaded in a notebook page. This makes the launcher immediately
 * usable without manual setup.
 */

import { useEffect } from "react";
import { useStore } from "@livestore/react";
import { useAuth, useAuthenticatedUser } from "../auth/index.js";
import { consoleLauncher } from "./console-launcher.js";

/**
 * Hook to automatically setup console launcher in notebook pages
 * Call this in NotebookPage component to enable console launcher
 */
export function useConsoleRuntimeLauncher() {
  const { store } = useStore();
  const { isAuthenticated } = useAuth();
  const userId = useAuthenticatedUser();

  useEffect(() => {
    if (store && isAuthenticated && userId) {
      // Get auth token from somewhere - this might need adjustment based on how auth works
      // For now, we'll use a placeholder that the user can override
      const authToken = "dev-token"; // TODO: Get real auth token

      console.log("🔧 Setting up console runtime launcher...");
      consoleLauncher.setStore(store as any); // Type cast for React LiveStore API
      consoleLauncher.setAuth(userId, authToken);

      console.log("🎯 Console launcher ready! Try these commands in DevTools:");
      console.log("  window.__RUNT_LAUNCHER__.getStatus()");
      console.log("  await window.__RUNT_LAUNCHER__.launchHtmlAgent()");
      console.log("  await window.__RUNT_LAUNCHER__.shutdown()");
    }
  }, [store, isAuthenticated, userId]);

  // Return current status for debugging
  return {
    isReady: !!(store && isAuthenticated && userId),
    store: !!store,
    isAuthenticated,
    userId,
  };
}

/**
 * Alternative setup function for manual initialization
 * Use this if you have store/auth available outside React context
 */
export function setupConsoleLauncher(
  store: any,
  userId: string,
  authToken: string
) {
  consoleLauncher.setStore(store as any);
  consoleLauncher.setAuth(userId, authToken);

  console.log("🎯 Console launcher configured manually!");
  console.log("  window.__RUNT_LAUNCHER__.getStatus()");
  console.log("  await window.__RUNT_LAUNCHER__.launchHtmlAgent()");
}

/**
 * Development helper - logs current auth state for debugging
 */
export function debugConsoleAuth() {
  console.log("🔍 Console launcher auth debug:");
  console.log("  Status:", window.__RUNT_LAUNCHER__?.getStatus());
  console.log("  Current URL:", window.location.pathname);
  console.log(
    "  Notebook ID:",
    window.__RUNT_LAUNCHER__?.getCurrentNotebookId()
  );
}

// Expose debug helper globally for convenience
if (typeof window !== "undefined") {
  (window as any).__RUNT_DEBUG__ = {
    debugAuth: debugConsoleAuth,
    launcher: consoleLauncher,
  };
}
