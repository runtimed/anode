/**
 * Store factory for creating LiveStore instances
 *
 * Provides a clean interface for creating LiveStore connections
 * with proper schema and sync configuration.
 */

import {
  createStorePromise as createLiveStorePromise,
  makeSchema,
  State,
  events,
  tables,
  materializers,
  type Store,
  type Adapter,
} from "@runtimed/schema";
import type { SyncPayload } from "./sync-types.ts";

// Create schema locally - this should match what's in runtime-agent.ts
const state = State.SQLite.makeState({ tables, materializers });
const schema = makeSchema({ events, state });

/**
 * Configuration for creating a LiveStore instance
 */
export interface CreateStoreConfig {
  /** LiveStore adapter for connectivity */
  adapter: Adapter;
  /** Notebook ID to use as store ID */
  notebookId: string;
  /** Sync payload for authentication and runtime identification */
  syncPayload: SyncPayload;
}

/**
 * Create a LiveStore instance with proper schema and sync configuration
 *
 * This function wraps the LiveStore createStorePromise with our
 * standardized schema and provides type safety for sync payloads.
 *
 * @param config Configuration object with adapter, notebook ID, and sync payload
 * @returns Promise resolving to configured LiveStore instance
 */
export async function createStorePromise(
  config: CreateStoreConfig
): Promise<Store> {
  const { adapter, notebookId, syncPayload } = config;

  console.log(`🏭 Store Factory: Creating store for notebook:`, {
    notebookId,
    hasSyncPayload: !!syncPayload,
    syncPayloadKeys: syncPayload ? Object.keys(syncPayload) : [],
    timestamp: new Date().toISOString(),
  });

  try {
    const store = await createLiveStorePromise({
      adapter,
      schema,
      storeId: notebookId,
      syncPayload: syncPayload as any,
    });

    console.log(`✅ Store Factory: Successfully created store for notebook:`, {
      notebookId,
      storeExists: !!store,
      timestamp: new Date().toISOString(),
    });

    // Add debugging helpers to the store instance
    (store as any)._debugInfo = {
      notebookId,
      createdAt: new Date().toISOString(),
      syncPayload: syncPayload
        ? { ...syncPayload, authToken: "[REDACTED]" }
        : null,
    };

    return store;
  } catch (error: any) {
    console.error(`❌ Store Factory: Failed to create store for notebook:`, {
      notebookId,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}
