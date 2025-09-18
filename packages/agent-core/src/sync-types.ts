/**
 * Shared sync payload types for LiveStore connections
 *
 * These types ensure consistency between agent-core and backend
 * sync payload validation.
 */

/**
 * Base sync payload for all LiveStore connections
 */
export interface BaseSyncPayload {
  /** Authentication token (OIDC JWT or API key) */
  authToken: string;
}

/**
 * Sync payload for runtime agents
 * Extends base payload with runtime-specific identification
 */
export interface RuntimeSyncPayload extends BaseSyncPayload {
  /** Indicates this is a runtime agent connection */
  runtime: true;
  /** Unique runtime identifier */
  runtimeId: string;
  /** Runtime session identifier */
  sessionId: string;
  /** User ID that owns/started this runtime */
  userId: string;
}

/**
 * Sync payload for regular user connections
 */
export interface UserSyncPayload extends BaseSyncPayload {
  /** Indicates this is a regular user connection */
  runtime?: false;
}

/**
 * Union type for all sync payload variants
 */
export type SyncPayload = RuntimeSyncPayload | UserSyncPayload;

/**
 * Type guard to check if payload is from a runtime agent
 */
export function isRuntimeSyncPayload(payload: SyncPayload): payload is RuntimeSyncPayload {
  return payload.runtime === true;
}

/**
 * Type guard to check if payload is from a regular user
 */
export function isUserSyncPayload(payload: SyncPayload): payload is UserSyncPayload {
  return payload.runtime !== true;
}

/**
 * Helper to create runtime sync payload
 */
export function createRuntimeSyncPayload(params: {
  authToken: string;
  runtimeId: string;
  sessionId: string;
  userId: string;
}): RuntimeSyncPayload {
  return {
    ...params,
    runtime: true,
  };
}

/**
 * Helper to create user sync payload
 */
export function createUserSyncPayload(authToken: string): UserSyncPayload {
  return {
    authToken,
    runtime: false,
  };
}
