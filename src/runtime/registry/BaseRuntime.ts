/**
 * Base Runtime Implementation
 *
 * Abstract base class providing common functionality for all runtime implementations.
 * Handles state management, event emission, and provides template methods for
 * runtime lifecycle operations.
 */

import { nanoid } from "nanoid";
import type {
  Runtime,
  RuntimeMetadata,
  RuntimeCapabilities,
  RuntimeState,
  RuntimeConfiguration,
} from "./types.js";

export abstract class BaseRuntime implements Runtime {
  protected state: RuntimeState;
  protected configuration: RuntimeConfiguration;
  protected notebookId: string | null = null;

  // Event callbacks
  private stateChangeCallbacks = new Set<(state: RuntimeState) => void>();

  constructor(
    public readonly metadata: RuntimeMetadata,
    public readonly capabilities: RuntimeCapabilities,
    initialConfig: RuntimeConfiguration = {}
  ) {
    this.state = {
      isActive: false,
      isStarting: false,
      isStopping: false,
      status: "inactive",
      error: null,
      runtimeId: null,
      sessionId: null,
    };

    this.configuration = {
      maxExecutionTime: 30000, // 30 seconds default
      environment: {},
      options: {},
      ...initialConfig,
    };
  }

  // Public interface
  getState(): RuntimeState {
    return { ...this.state };
  }

  getConfiguration(): RuntimeConfiguration {
    return { ...this.configuration };
  }

  async start(
    notebookId: string,
    config?: RuntimeConfiguration
  ): Promise<void> {
    if (this.state.isActive || this.state.isStarting) {
      console.log(
        `ℹ️ Runtime ${this.metadata.id} is already starting or active`
      );
      return;
    }

    // Merge configuration
    if (config) {
      this.configuration = { ...this.configuration, ...config };
    }

    this.notebookId = notebookId;

    this.updateState({
      isStarting: true,
      status: "starting",
      error: null,
    });

    try {
      console.log(
        `🚀 Starting ${this.metadata.name} for notebook ${notebookId}`
      );

      // Generate runtime and session IDs
      const runtimeId = this.generateRuntimeId();
      const sessionId = this.generateSessionId(runtimeId);

      this.updateState({
        runtimeId,
        sessionId,
      });

      // Call implementation-specific start logic
      await this.doStart(notebookId, this.configuration);

      this.updateState({
        isActive: true,
        isStarting: false,
        status: "ready",
      });

      console.log(
        `✅ ${this.metadata.name} started successfully (${sessionId.slice(-6)})`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to start ${this.metadata.name}:`, error);

      this.updateState({
        isStarting: false,
        isActive: false,
        status: "error",
        error: errorMessage,
      });

      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.state.isActive || this.state.isStopping) {
      console.log(
        `ℹ️ Runtime ${this.metadata.id} is already stopping or inactive`
      );
      return;
    }

    this.updateState({
      isStopping: true,
      status: "stopping",
    });

    try {
      console.log(`🛑 Stopping ${this.metadata.name}`);

      // Call implementation-specific stop logic
      await this.doStop();

      this.updateState({
        isActive: false,
        isStopping: false,
        status: "inactive",
        runtimeId: null,
        sessionId: null,
        error: null,
      });

      this.notebookId = null;

      console.log(`✅ ${this.metadata.name} stopped successfully`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to stop ${this.metadata.name}:`, error);

      this.updateState({
        isStopping: false,
        status: "error",
        error: errorMessage,
      });

      throw error;
    }
  }

  async restart(config?: RuntimeConfiguration): Promise<void> {
    console.log(`🔄 Restarting ${this.metadata.name}`);

    if (this.state.isActive) {
      await this.stop();
    }

    // Small delay to ensure cleanup
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (this.notebookId) {
      await this.start(this.notebookId, config);
    } else {
      throw new Error("Cannot restart runtime: no notebook ID available");
    }
  }

  // State management
  protected updateState(updates: Partial<RuntimeState>): void {
    const previousState = { ...this.state };
    this.state = { ...this.state, ...updates };

    // Update timestamp for active state changes
    if (updates.isActive !== undefined || updates.status !== undefined) {
      this.state.lastHeartbeat = new Date();
    }

    // Emit state change if anything actually changed
    if (JSON.stringify(previousState) !== JSON.stringify(this.state)) {
      this.emitStateChange();
    }
  }

  protected setError(error: string | Error): void {
    const errorMessage = error instanceof Error ? error.message : error;
    console.error(`❌ ${this.metadata.name} error:`, error);

    this.updateState({
      status: "error",
      error: errorMessage,
    });
  }

  protected setBusy(): void {
    if (this.state.isActive) {
      this.updateState({ status: "busy" });
    }
  }

  protected setReady(): void {
    if (this.state.isActive) {
      this.updateState({ status: "ready" });
    }
  }

  // Event system
  onStateChange(callback: (state: RuntimeState) => void): () => void {
    this.stateChangeCallbacks.add(callback);
    return () => this.stateChangeCallbacks.delete(callback);
  }

  private emitStateChange(): void {
    this.stateChangeCallbacks.forEach((callback) => {
      try {
        callback(this.getState());
      } catch (error) {
        console.error(
          `Error in state change callback for ${this.metadata.id}:`,
          error
        );
      }
    });
  }

  // ID generation
  protected generateRuntimeId(): string {
    return `${this.metadata.type}-runtime-${nanoid()}`;
  }

  protected generateSessionId(runtimeId: string): string {
    return `${runtimeId}-${Date.now()}`;
  }

  // Utility methods
  protected getCurrentNotebookId(): string {
    if (!this.notebookId) {
      throw new Error("No notebook ID available - runtime may not be started");
    }
    return this.notebookId;
  }

  protected isActiveAndReady(): boolean {
    return this.state.isActive && this.state.status === "ready";
  }

  protected validateStarted(): void {
    if (!this.state.isActive) {
      throw new Error(`Runtime ${this.metadata.id} is not active`);
    }
  }

  // Abstract methods that implementations must provide
  protected abstract doStart(
    notebookId: string,
    config: RuntimeConfiguration
  ): Promise<void>;
  protected abstract doStop(): Promise<void>;

  // Optional template methods
  protected async doRestart?(config?: RuntimeConfiguration): Promise<void>;

  // Cleanup on destruction
  destroy(): void {
    if (this.state.isActive) {
      console.warn(
        `⚠️ Destroying active runtime ${this.metadata.id} - should stop first`
      );
      this.stop().catch((error) => {
        console.error(`Error stopping runtime during destroy:`, error);
      });
    }

    this.stateChangeCallbacks.clear();
  }

  // Debug helpers
  toString(): string {
    return `${this.metadata.name} (${this.metadata.id}) - ${this.state.status}`;
  }

  getDebugInfo() {
    return {
      metadata: this.metadata,
      state: this.getState(),
      configuration: this.getConfiguration(),
      notebookId: this.notebookId,
      capabilities: this.capabilities,
    };
  }
}
