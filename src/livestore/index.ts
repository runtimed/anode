/**
 * LiveStore infrastructure exports
 *
 * Centralized exports for all LiveStore-related functionality:
 * - Shared adapter instance
 * - React provider component
 * - Utilities
 */

export { sharedLiveStoreAdapter, wasPersistedDataReset } from "./adapter.js";
export { CustomLiveStoreProvider } from "./CustomLiveStoreProvider.js";

// Re-export commonly used LiveStore types for convenience
export type { BootStatus } from "@runtimed/schema";
