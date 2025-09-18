/**
 * Runtime Registry Implementation
 *
 * Central registry for managing all runtime instances in the application.
 * Handles registration, state tracking, and event emission for runtime lifecycle.
 */

import type {
  Runtime,
  RuntimeRegistry as RuntimeRegistryInterface,
  RuntimeType,
  RuntimeState,
  RuntimeEvent,
  RuntimeRegistryConfig,
} from "./types.js";

type EventCallback<T = RuntimeEvent> = (event: T) => void;
type StateChangeCallback = (runtime: Runtime, state: RuntimeState) => void;
type RuntimeRegisteredCallback = (runtime: Runtime) => void;
type RuntimeUnregisteredCallback = (runtimeId: string) => void;

export class RuntimeRegistry implements RuntimeRegistryInterface {
  private static instance: RuntimeRegistry | null = null;

  private runtimes = new Map<string, Runtime>();
  private eventCallbacks = new Set<EventCallback>();
  private stateChangeCallbacks = new Set<StateChangeCallback>();
  private registeredCallbacks = new Set<RuntimeRegisteredCallback>();
  private unregisteredCallbacks = new Set<RuntimeUnregisteredCallback>();

  private config: RuntimeRegistryConfig;

  constructor(config: RuntimeRegistryConfig = {}) {
    this.config = {
      maxConcurrentRuntimes: 1, // Follow "one runtime per notebook" from AGENTS.md
      allowMultipleRuntimesOfSameType: false,
      ...config,
    };
  }

  /**
   * Get or create singleton instance
   */
  static getInstance(config?: RuntimeRegistryConfig): RuntimeRegistry {
    if (!RuntimeRegistry.instance) {
      RuntimeRegistry.instance = new RuntimeRegistry(config);
    }
    return RuntimeRegistry.instance;
  }

  /**
   * Reset singleton (useful for testing)
   */
  static resetInstance(): void {
    RuntimeRegistry.instance = null;
  }

  // Registry management
  register(runtime: Runtime): void {
    const { id } = runtime.metadata;

    if (this.runtimes.has(id)) {
      console.log(
        `ℹ️ Runtime ${id} is already registered, skipping registration`
      );
      return;
    }

    // Check if we already have a runtime of this type (if not allowed)
    if (!this.config.allowMultipleRuntimesOfSameType) {
      const existingOfType = this.getRuntimesByType(runtime.metadata.type);
      if (existingOfType.length > 0) {
        throw new Error(
          `Runtime of type '${runtime.metadata.type}' is already registered. ` +
            `Multiple runtimes of the same type are not allowed.`
        );
      }
    }

    this.runtimes.set(id, runtime);

    // Set up state change monitoring
    this.monitorRuntimeState(runtime);

    this.emitEvent({ type: "registered", runtime });
    this.registeredCallbacks.forEach((callback) => callback(runtime));

    console.log(`📝 Runtime registered: ${id} (${runtime.metadata.type})`);
  }

  unregister(runtimeId: string): void {
    const runtime = this.runtimes.get(runtimeId);
    if (!runtime) {
      console.warn(`⚠️ Attempted to unregister unknown runtime: ${runtimeId}`);
      return;
    }

    // Stop runtime if it's active
    const state = runtime.getState();
    if (state.isActive) {
      console.log(`🛑 Stopping runtime before unregistration: ${runtimeId}`);
      runtime.stop().catch((error) => {
        console.error(`❌ Error stopping runtime ${runtimeId}:`, error);
      });
    }

    this.runtimes.delete(runtimeId);

    this.emitEvent({ type: "unregistered", runtimeId });
    this.unregisteredCallbacks.forEach((callback) => callback(runtimeId));

    console.log(`🗑️ Runtime unregistered: ${runtimeId}`);
  }

  // Runtime discovery
  getAvailableRuntimes(): Runtime[] {
    return Array.from(this.runtimes.values())
      .filter((runtime) => runtime.metadata.isAvailable)
      .sort((a, b) => b.metadata.priority - a.metadata.priority);
  }

  getRuntime(runtimeId: string): Runtime | undefined {
    return this.runtimes.get(runtimeId);
  }

  getRuntimesByType(type: RuntimeType): Runtime[] {
    return Array.from(this.runtimes.values()).filter(
      (runtime) => runtime.metadata.type === type
    );
  }

  // Active runtime tracking
  getActiveRuntimes(): Runtime[] {
    return Array.from(this.runtimes.values()).filter(
      (runtime) => runtime.getState().isActive
    );
  }

  getActiveRuntime(): Runtime | undefined {
    const activeRuntimes = this.getActiveRuntimes();

    // Return the highest priority active runtime
    if (activeRuntimes.length === 0) {
      return undefined;
    }

    return activeRuntimes.sort(
      (a, b) => b.metadata.priority - a.metadata.priority
    )[0];
  }

  /**
   * Get the active runtime of a specific type
   */
  getActiveRuntimeOfType(type: RuntimeType): Runtime | undefined {
    return this.getActiveRuntimes().find(
      (runtime) => runtime.metadata.type === type
    );
  }

  /**
   * Check if we can start a new runtime (respects max concurrent limit)
   */
  canStartRuntime(): boolean {
    const activeCount = this.getActiveRuntimes().length;
    const maxConcurrent = this.config.maxConcurrentRuntimes ?? 1;

    return activeCount < maxConcurrent;
  }

  /**
   * Start a runtime, ensuring constraints are met
   */
  async startRuntime(
    runtimeId: string,
    notebookId: string,
    config?: Parameters<Runtime["start"]>[1]
  ): Promise<void> {
    const runtime = this.getRuntime(runtimeId);
    if (!runtime) {
      throw new Error(`Runtime not found: ${runtimeId}`);
    }

    // Check if runtime is already active
    if (runtime.getState().isActive) {
      console.log(`ℹ️ Runtime ${runtimeId} is already active`);
      return;
    }

    // Check concurrent runtime limits
    if (!this.canStartRuntime()) {
      const activeRuntimes = this.getActiveRuntimes();
      console.log(
        `🚫 Cannot start runtime ${runtimeId}: would exceed max concurrent limit ` +
          `(${activeRuntimes.length}/${this.config.maxConcurrentRuntimes})`
      );

      // For single runtime mode, stop the active one first
      if (
        this.config.maxConcurrentRuntimes === 1 &&
        activeRuntimes.length > 0
      ) {
        console.log(`🔄 Stopping active runtime to make room for ${runtimeId}`);
        await activeRuntimes[0].stop();
      } else {
        throw new Error(
          `Cannot start runtime: would exceed maximum concurrent runtimes ` +
            `(${this.config.maxConcurrentRuntimes})`
        );
      }
    }

    console.log(`🚀 Starting runtime: ${runtimeId} for notebook ${notebookId}`);
    await runtime.start(notebookId, config);
  }

  /**
   * Stop all active runtimes
   */
  async stopAllRuntimes(): Promise<void> {
    const activeRuntimes = this.getActiveRuntimes();

    console.log(`🛑 Stopping ${activeRuntimes.length} active runtime(s)`);

    await Promise.allSettled(
      activeRuntimes.map(async (runtime) => {
        try {
          await runtime.stop();
        } catch (error) {
          console.error(
            `❌ Error stopping runtime ${runtime.metadata.id}:`,
            error
          );
        }
      })
    );
  }

  // Event system
  onRuntimeStateChanged(callback: StateChangeCallback): () => void {
    this.stateChangeCallbacks.add(callback);
    return () => this.stateChangeCallbacks.delete(callback);
  }

  onRuntimeRegistered(callback: RuntimeRegisteredCallback): () => void {
    this.registeredCallbacks.add(callback);
    return () => this.registeredCallbacks.delete(callback);
  }

  onRuntimeUnregistered(callback: RuntimeUnregisteredCallback): () => void {
    this.unregisteredCallbacks.add(callback);
    return () => this.unregisteredCallbacks.delete(callback);
  }

  onEvent(callback: EventCallback): () => void {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  // Private methods
  private monitorRuntimeState(runtime: Runtime): void {
    // For now, we'll rely on runtime implementations to call our state change handlers
    // In the future, we could set up polling for remote runtimes

    // Store previous state for comparison
    let previousState = runtime.getState();

    const checkState = () => {
      const currentState = runtime.getState();

      // Simple deep comparison for state changes
      if (JSON.stringify(previousState) !== JSON.stringify(currentState)) {
        this.handleRuntimeStateChange(runtime, currentState);
        previousState = currentState;
      }
    };

    // Check state periodically (this is a simple implementation)
    // Real implementation might use observers or callbacks from the runtime
    const interval = setInterval(checkState, 1000);

    // Clean up when runtime is unregistered
    const originalUnregister = this.unregister.bind(this);
    this.unregister = (runtimeId: string) => {
      if (runtimeId === runtime.metadata.id) {
        clearInterval(interval);
      }
      originalUnregister(runtimeId);
    };
  }

  private handleRuntimeStateChange(
    runtime: Runtime,
    state: RuntimeState
  ): void {
    this.emitEvent({
      type: "state-changed",
      runtimeId: runtime.metadata.id,
      state,
    });

    this.stateChangeCallbacks.forEach((callback) => {
      try {
        callback(runtime, state);
      } catch (error) {
        console.error("Error in runtime state change callback:", error);
      }
    });

    // Log significant state changes
    if (state.isActive && !state.isStarting) {
      console.log(`✅ Runtime ${runtime.metadata.id} is now active`);
    } else if (!state.isActive && state.error) {
      console.error(`❌ Runtime ${runtime.metadata.id} error: ${state.error}`);
      this.emitEvent({
        type: "error",
        runtimeId: runtime.metadata.id,
        error: state.error,
      });
    }
  }

  private emitEvent(event: RuntimeEvent): void {
    this.eventCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error("Error in runtime event callback:", error);
      }
    });
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const runtimes = Array.from(this.runtimes.values());
    const activeRuntimes = this.getActiveRuntimes();

    return {
      total: runtimes.length,
      active: activeRuntimes.length,
      available: runtimes.filter((r) => r.metadata.isAvailable).length,
      byType: runtimes.reduce(
        (acc, runtime) => {
          const type = runtime.metadata.type;
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        },
        {} as Record<RuntimeType, number>
      ),
      config: this.config,
    };
  }

  /**
   * Debug helper - log current registry state
   */
  debugLog(): void {
    const stats = this.getStats();
    console.log("🔍 Runtime Registry Debug:", {
      stats,
      runtimes: Array.from(this.runtimes.entries()).map(([id, runtime]) => ({
        id,
        type: runtime.metadata.type,
        name: runtime.metadata.name,
        state: runtime.getState(),
      })),
    });
  }
}

// Export singleton getter for convenience
export const getRuntimeRegistry = (config?: RuntimeRegistryConfig) =>
  RuntimeRegistry.getInstance(config);
