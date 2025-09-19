// @runt/lib - Core library for building Anode runtime agents

export const VERSION = "0.2.1";

export { RuntimeAgent } from "./runtime-agent.ts";
export { DEFAULT_CONFIG, RuntimeConfig } from "./config.ts";
export { logger, LogLevel, withQuietLogging } from "./logging.ts";
export type {
  AiModel,
  CancellationHandler,
  ExecutionContext,
  ExecutionHandler,
  ExecutionResult,
  ModelCapability,
  RawOutputData,
  RuntimeAgentEventHandlers,
  RuntimeAgentOptions,
  RuntimeCapabilities,
} from "./types.ts";

export type { LoggerConfig } from "./logging.ts";

// Artifact service client for submitting artifacts to anode
export {
  ArtifactClient,
  createArtifactClient,
  PngProcessor,
} from "./artifact-client.ts";

export type {
  ArtifactSubmissionOptions,
  ArtifactSubmissionResult,
} from "./types.ts";

// Store factory for creating LiveStore instances
export { createStorePromise } from "./store-factory.ts";
export type { CreateStoreConfig } from "./store-factory.ts";

// Sync payload types for LiveStore connections
export type {
  SyncPayload,
  RuntimeSyncPayload,
  UserSyncPayload,
  BaseSyncPayload,
} from "./sync-types.ts";
export {
  isRuntimeSyncPayload,
  isUserSyncPayload,
  createRuntimeSyncPayload,
  createUserSyncPayload,
} from "./sync-types.ts";

// Media types and utilities for rich content handling
export type { MediaBundle } from "./media.ts";
export { validateMediaBundle } from "./media.ts";
