/**
 * Runtime Registry Types
 *
 * Core types and interfaces for the runtime registry system.
 * Provides abstractions for local and remote runtime management.
 */

export type RuntimeType = "html" | "pyodide" | "external";

export type RuntimeStatus =
  | "inactive" // Runtime is not running
  | "starting" // Runtime is in the process of starting
  | "ready" // Runtime is active and ready to execute
  | "busy" // Runtime is executing code
  | "stopping" // Runtime is in the process of stopping
  | "error"; // Runtime encountered an error

export interface RuntimeCapabilities {
  canExecuteCode: boolean;
  canExecuteSql: boolean;
  canExecuteAi: boolean;
  supportedLanguages?: string[];
  supportsInterruption?: boolean;
  supportsRestart?: boolean;
}

export interface RuntimeState {
  isActive: boolean;
  isStarting: boolean;
  isStopping: boolean;
  status: RuntimeStatus;
  error: string | null;
  runtimeId: string | null;
  sessionId: string | null;
  lastHeartbeat?: Date;
}

export interface RuntimeConfiguration {
  /** Environment variables or settings specific to this runtime */
  environment?: Record<string, string>;
  /** Maximum execution time in milliseconds */
  maxExecutionTime?: number;
  /** Custom startup options */
  options?: Record<string, unknown>;
}

export interface RuntimeMetadata {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: RuntimeType;
  version?: string;
  isLocal: boolean;
  isAvailable: boolean;
  priority: number; // Higher numbers = higher priority in UI
}

/**
 * Core runtime interface that all runtimes must implement
 */
export interface Runtime {
  readonly metadata: RuntimeMetadata;
  readonly capabilities: RuntimeCapabilities;

  getState(): RuntimeState;
  getConfiguration(): RuntimeConfiguration;

  start(notebookId: string, config?: RuntimeConfiguration): Promise<void>;
  stop(): Promise<void>;
  restart(config?: RuntimeConfiguration): Promise<void>;

  // Health check for remote runtimes
  ping?(): Promise<boolean>;

  // Runtime-specific setup (e.g., command for external runtime)
  getSetupInstructions?(): string | null;
}

/**
 * Local runtime interface for browser-based runtimes
 */
export interface LocalRuntime extends Runtime {
  readonly metadata: RuntimeMetadata & { isLocal: true };

  // Local runtimes can execute code directly
  executeCode?(cellId: string, code: string): Promise<void>;
}

/**
 * Remote runtime interface for external process runtimes
 */
export interface RemoteRuntime extends Runtime {
  readonly metadata: RuntimeMetadata & { isLocal: false };

  // Remote runtimes communicate via events
  ping(): Promise<boolean>;
  getSetupInstructions(): string;
  getConnectionInfo(): RemoteRuntimeConnection | null;
}

export interface RemoteRuntimeConnection {
  endpoint: string;
  sessionId: string;
  lastSeen: Date;
  version?: string;
}

/**
 * Runtime registry interface
 */
export interface RuntimeRegistry {
  // Registry management
  register(runtime: Runtime): void;
  unregister(runtimeId: string): void;

  // Runtime discovery
  getAvailableRuntimes(): Runtime[];
  getRuntime(runtimeId: string): Runtime | undefined;
  getRuntimesByType(type: RuntimeType): Runtime[];

  // Active runtime tracking
  getActiveRuntimes(): Runtime[];
  getActiveRuntime(): Runtime | undefined; // Primary active runtime

  // Event system
  onRuntimeStateChanged(
    callback: (runtime: Runtime, state: RuntimeState) => void
  ): () => void;
  onRuntimeRegistered(callback: (runtime: Runtime) => void): () => void;
  onRuntimeUnregistered(callback: (runtimeId: string) => void): () => void;
}

/**
 * Runtime factory interface for creating runtime instances
 */
export interface RuntimeFactory {
  createRuntime(type: RuntimeType, config?: RuntimeConfiguration): Runtime;
  getSupportedTypes(): RuntimeType[];
}

/**
 * Configuration for the runtime registry system
 */
export interface RuntimeRegistryConfig {
  /** Maximum number of concurrent active runtimes */
  maxConcurrentRuntimes?: number;

  /** Default runtime type to suggest */
  defaultRuntimeType?: RuntimeType;

  /** Whether to allow multiple runtimes of the same type */
  allowMultipleRuntimesOfSameType?: boolean;

  /** Runtime-specific configurations */
  runtimeConfigs?: Record<RuntimeType, RuntimeConfiguration>;
}

/**
 * Events emitted by runtimes and the registry
 */
export type RuntimeEvent =
  | { type: "state-changed"; runtimeId: string; state: RuntimeState }
  | { type: "registered"; runtime: Runtime }
  | { type: "unregistered"; runtimeId: string }
  | { type: "error"; runtimeId: string; error: string };

/**
 * LiveStore interface for runtime integration
 */
export interface LiveStore {
  commit(event: any): void;
  query(query: any): any[];
  subscribe(
    query: any,
    options: { onUpdate: (data: any[]) => void }
  ): () => void;
  shutdown?(): Promise<void>;
}
