/**
 * Shared LiveStore adapter for consistent instance reuse across the application.
 *
 * This module creates a single LiveStore adapter that can be used by:
 * - Main notebook LiveStore provider
 * - HTML runtime agents
 * - Any other components that need LiveStore access
 *
 * Benefits:
 * - Eliminates duplicate adapter instances
 * - Enables agent-store integration
 * - Consistent storage and worker configuration
 */

import { makePersistedAdapter } from "@livestore/adapter-web";
import LiveStoreSharedWorker from "@livestore/adapter-web/shared-worker?sharedworker";
import LiveStoreWorker from "./livestore.worker?worker";

/**
 * Check if persistence reset is requested via URL parameter
 */
function shouldResetPersistence(): boolean {
  if (typeof window === "undefined") return false;
  const hasReset =
    new URLSearchParams(window.location.search).get("reset") !== null;
  console.log(`🔄 Persistence reset check:`, hasReset);
  return hasReset;
}

/**
 * Clean up reset parameter from URL after detection
 */
function cleanupResetParameter(): void {
  if (typeof window === "undefined") return;

  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.has("reset")) {
    console.log(`🔄 Cleaning up reset parameter from URL`);
    searchParams.delete("reset");
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }
}

/**
 * Shared LiveStore adapter instance
 *
 * Created once and reused across all LiveStore providers and agents.
 * Handles OPFS storage, shared workers, and persistence reset logic.
 */
export const sharedLiveStoreAdapter = (() => {
  console.log(`🚀 Creating shared LiveStore adapter`);

  const resetPersistence = shouldResetPersistence();

  // Clean up URL parameter after detection
  if (resetPersistence) {
    console.log(`🔄 Persistence reset requested, cleaning up URL`);
    cleanupResetParameter();
  }

  console.log(`🔧 Adapter configuration:`, {
    storage: "opfs",
    resetPersistence,
    hasWorker: !!LiveStoreWorker,
    hasSharedWorker: !!LiveStoreSharedWorker,
  });

  const adapter = makePersistedAdapter({
    storage: { type: "opfs" },
    worker: LiveStoreWorker,
    sharedWorker: LiveStoreSharedWorker,
    resetPersistence,
    // Let LiveStore generate and manage clientId automatically
  });

  console.log(`✅ Shared LiveStore adapter created successfully`);
  return adapter;
})();

/**
 * Utility function to check if persistence was reset on this session
 */
export function wasPersistedDataReset(): boolean {
  const wasReset = shouldResetPersistence();
  console.log(`🔄 Was persistence reset check:`, wasReset);
  return wasReset;
}

/**
 * Debug helper to log adapter state
 */
export function debugAdapterState(): void {
  console.log(`🔍 Adapter debug info:`, {
    adapterExists: !!sharedLiveStoreAdapter,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
  });
}

// Log adapter creation on module load
console.log(`📦 LiveStore adapter module loaded at:`, new Date().toISOString());
