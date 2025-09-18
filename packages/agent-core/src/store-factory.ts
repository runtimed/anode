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

  return await createLiveStorePromise({
    adapter,
    schema,
    storeId: notebookId,
    syncPayload: syncPayload as any,
  });
}
