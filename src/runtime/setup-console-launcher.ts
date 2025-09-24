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
import {
  getAiSetupStatus,
  areAiClientsReady,
  resetAiSetup,
} from "../auth/index.js";

/**
 * Hook to automatically setup console launcher in notebook pages
 * Call this in NotebookPage component to enable console launcher
 */
export function useConsoleRuntimeLauncher() {
  const { store } = useStore();
  const { isAuthenticated, accessToken } = useAuth();
  const userId = useAuthenticatedUser();

  useEffect(() => {
    if (store && isAuthenticated && userId) {
      console.log("🔧 Setting up console runtime launcher...");
      consoleLauncher.setStore(store as any); // Type cast for React LiveStore API
      consoleLauncher.setAuth(userId, accessToken);

      // Create test function for raw Anaconda API calls
      const testAnacondaAPI = async (
        prompt: string = "Hello, how are you?"
      ) => {
        console.log("🧪 Testing raw Anaconda API call...");
        console.log(
          "🔑 Using access token:",
          accessToken ? `${accessToken.substring(0, 20)}...` : "null"
        );

        try {
          const response = await fetch(
            "https://anaconda.com/api/assistant/v3/groq/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
                "X-Client-Version": "0.2.0",
                "X-Client-Source": "anaconda-runt-dev",
              },
              body: JSON.stringify({
                model: "moonshotai/kimi-k2-instruct-0905",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 100,
                temperature: 0.7,
              }),
            }
          );

          console.log("📡 API Response status:", response.status);
          console.log(
            "📡 API Response headers:",
            Object.fromEntries(response.headers.entries())
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ API Error:", errorText);
            return { error: errorText, status: response.status };
          }

          const data = await response.json();
          console.log("✅ API Success:", data);
          return data;
        } catch (error) {
          console.error("❌ Network Error:", error);
          return {
            error: error instanceof Error ? error.message : String(error),
          };
        }
      };

      // Add AI debugging utilities to global scope
      if (typeof window !== "undefined") {
        (window as any).__RUNT_DEBUG__ = {
          ...(window as any).__RUNT_DEBUG__,
          getAiStatus: getAiSetupStatus,
          areAiClientsReady: areAiClientsReady,
          resetAiSetup: resetAiSetup,
          testAnacondaAPI: testAnacondaAPI,
        };
      }

      console.log("🎯 Console launcher ready! Try these commands in DevTools:");
      console.log("  window.__RUNT_LAUNCHER__.getStatus()");
      console.log("  await window.__RUNT_LAUNCHER__.launchHtmlAgent()");
      console.log("  await window.__RUNT_LAUNCHER__.shutdown()");
      console.log("");
      console.log("🤖 AI Debug Commands:");
      console.log(
        "  window.__RUNT_DEBUG__.getAiStatus() - Check AI setup status"
      );
      console.log(
        "  window.__RUNT_DEBUG__.resetAiSetup() - Reset AI setup state"
      );
      console.log(
        "  await window.__RUNT_DEBUG__.testAnacondaAPI('your prompt') - Test raw API call"
      );
    }
  }, [store, isAuthenticated, userId, accessToken]);

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
  console.log("  Full URL:", window.location.href);
  console.log("  Pathname:", window.location.pathname);
  console.log("  Path parts:", window.location.pathname.split("/"));

  // Test URL parsing logic
  const pathParts = window.location.pathname.split("/");
  const notebookIndex = pathParts.findIndex((part) => part === "nb");
  console.log("  Notebook index:", notebookIndex);
  console.log("  Next part:", pathParts[notebookIndex + 1]);

  console.log(
    "  Detected Notebook ID:",
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
