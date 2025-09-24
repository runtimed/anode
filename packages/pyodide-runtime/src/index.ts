/**
 * Pyodide Runtime Agent for Browser Environment
 *
 * Provides Python execution capabilities in the browser using Pyodide
 * in a Web Worker. Extends LocalRuntimeAgent to inherit shared local
 * runtime functionality while implementing Python-specific execution.
 */

import type {
  ExecutionHandler,
  ExecutionContext,
  RuntimeCapabilities,
} from "@runtimed/agent-core";
import {
  LocalRuntimeAgent,
  type LocalRuntimeConfig,
} from "./LocalRuntimeAgent.ts";
import { getEssentialPackages } from "./pypackages.ts";

/**
 * Configuration options for PyodideRuntimeAgent
 */
export interface PyodideRuntimeConfig extends LocalRuntimeConfig {
  /** Python packages to preload */
  packages?: string[];
  /** Host directories to mount into the Python filesystem */
  mountPaths?: string[];
  /** Directory mappings for mounts */
  mountMappings?: Array<{ hostPath: string; targetPath: string }>;
  /** Whether to mount directories as read-only */
  mountReadonly?: boolean;
  /** Directory to sync /outputs to after execution */
  outputDir?: string;
}

/**
 * Pyodide Runtime Agent
 *
 * Executes Python code using Pyodide in a Web Worker. Provides IPython-like
 * capabilities with rich display support, matplotlib integration, and
 * interrupt handling.
 */
export class PyodideRuntimeAgent extends LocalRuntimeAgent {
  private worker: Worker | null = null;
  private interruptBuffer: SharedArrayBuffer | null = null;
  private isInitialized = false;
  private currentExecutionContext: ExecutionContext | null = null;
  private executionQueue: Array<{
    context: ExecutionContext;
    code: string;
    resolve: (result: { success: boolean; error?: string }) => void;
    reject: (error: unknown) => void;
  }> = [];
  private isExecuting = false;
  private pendingExecutions = new Map<
    string,
    {
      resolve: (data: unknown) => void;
      reject: (error: unknown) => void;
    }
  >();
  private pyodideConfig: PyodideRuntimeConfig;

  constructor(config: PyodideRuntimeConfig) {
    super(config);
    this.pyodideConfig = config;
  }

  /**
   * Get the runtime type identifier
   */
  protected override getRuntimeType(): string {
    return "python";
  }

  /**
   * Get the log icon for Python runtime
   */
  protected override getLogIcon(): string {
    return "🐍";
  }

  /**
   * Define capabilities for Python runtime
   */
  protected override getCapabilities(): RuntimeCapabilities {
    return {
      canExecuteCode: true,
      canExecuteSql: false,
      canExecuteAi: true,
      availableAiModels: [], // Will be populated during startup if AI is enabled
    };
  }

  /**
   * Additional setup before agent starts
   */
  protected override async onBeforeStart?(): Promise<void> {
    await this.initializePyodideWorker();
  }

  /**
   * Additional cleanup after agent stops
   */
  protected override async onAfterStop?(): Promise<void> {
    await this.cleanupWorker();
  }

  /**
   * Create the Python execution handler
   */
  protected override createExecutionHandler(): ExecutionHandler {
    return async (context: ExecutionContext) => {
      const { cell } = context;

      console.log(`🔄 Executing Python cell: ${cell.id}`);

      // Clear previous outputs
      context.clear();

      // Handle AI cells - for now just return not implemented
      if (cell.cellType === "ai") {
        await context.display({
          "text/plain": "AI execution not yet implemented in browser runtime",
        });
        return { success: true };
      }

      // Only handle code cells
      if (cell.cellType !== "code") {
        const errorMsg = "Python handler only supports code cells";
        context.error("UnsupportedCellType", errorMsg, []);
        return {
          success: false,
          error: errorMsg,
        };
      }

      // Check for empty source
      if (!cell.source || cell.source.trim() === "") {
        return { success: true };
      }

      // Execute Python code through worker
      return await this.executeCode(context, cell.source);
    };
  }

  /**
   * Initialize Pyodide worker with rich display support
   */
  private async initializePyodideWorker(): Promise<void> {
    try {
      console.log("🔧 Initializing Pyodide worker");

      // Determine packages to load
      const packagesToLoad =
        this.pyodideConfig.packages || getEssentialPackages();

      console.log(`📦 Loading ${packagesToLoad.length} Python packages`);

      // Create SharedArrayBuffer for interrupt signaling
      this.interruptBuffer = new SharedArrayBuffer(4);
      const interruptView = new Int32Array(this.interruptBuffer);
      interruptView[0] = 0; // Initialize to no interrupt

      // Create worker
      this.worker = new Worker(
        new URL("./pyodide-worker.ts", import.meta.url),
        { type: "module" }
      );

      // Set up worker message handling
      this.worker.addEventListener(
        "message",
        this.handleWorkerMessage.bind(this)
      );
      this.worker.addEventListener("error", (event) =>
        this.handleWorkerError(event)
      );
      this.worker.addEventListener("messageerror", (event) =>
        this.handleWorkerMessageError(event)
      );

      // Prepare mount data if configured
      let mountData: Array<{
        hostPath: string;
        targetPath?: string;
        files: Array<{ path: string; content: Uint8Array }>;
        readonly?: boolean;
      }> = [];

      if (
        this.pyodideConfig.mountPaths &&
        this.pyodideConfig.mountPaths.length > 0
      ) {
        // For browser environment, we can't actually mount host directories
        // This would need to be implemented differently, perhaps by file uploads
        console.warn("⚠️ Mount paths not supported in browser environment");
      }

      // Initialize Pyodide in worker
      await this.sendWorkerMessage("init", {
        interruptBuffer: this.interruptBuffer,
        packages: packagesToLoad,
        mountData,
      });

      this.isInitialized = true;
      console.log("✅ Pyodide worker initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Pyodide worker:", error);
      throw error;
    }
  }

  /**
   * Send message to worker and wait for response
   */
  private sendWorkerMessage(type: string, data: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error("Worker not initialized"));
        return;
      }

      const messageId = crypto.randomUUID();
      this.pendingExecutions.set(messageId, { resolve, reject });

      this.worker.postMessage({
        id: messageId,
        type,
        data,
      });
    });
  }

  /**
   * Handle messages from worker
   */
  private handleWorkerMessage(event: MessageEvent): void {
    const { id, type, data, error } = event.data;

    if (type === "log") {
      console.log(`🐍 Worker: ${data}`);
      return;
    }

    if (type === "startup_output") {
      // Ignore startup messages
      return;
    }

    if (type === "stream_output") {
      // Handle real-time streaming outputs
      if (this.currentExecutionContext) {
        switch (data.type) {
          case "stdout":
            this.currentExecutionContext.stdout(data.text);
            break;
          case "stderr":
            this.currentExecutionContext.stderr(data.text);
            break;
          case "execute_result":
            if (data.data !== null && data.data !== undefined) {
              this.currentExecutionContext.result(this.formatOutput(data.data));
            }
            break;
          case "display_data":
            if (data.data !== null && data.data !== undefined) {
              const displayId = data.transient?.display_id;
              this.currentExecutionContext.display(
                this.formatOutput(data.data),
                data.metadata || {},
                displayId
              );
            }
            break;
          case "update_display_data":
            if (data.data != null) {
              const displayId = data.transient?.display_id;
              if (displayId) {
                this.currentExecutionContext.updateDisplay(
                  displayId,
                  this.formatOutput(data.data),
                  data.metadata || {}
                );
              }
            }
            break;
          case "error":
            this.currentExecutionContext.error(
              data.data.ename || "PythonError",
              data.data.evalue || "Unknown error",
              data.data.traceback || [String(data.data)]
            );
            break;
          case "clear_output":
            this.currentExecutionContext.clear(data.wait || false);
            break;
        }
      }
      return;
    }

    const pending = this.pendingExecutions.get(id);
    if (!pending) return;

    this.pendingExecutions.delete(id);

    if (error) {
      pending.reject(new Error(error));
    } else {
      pending.resolve(data);
    }
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(event: ErrorEvent): void {
    console.error("🐍 Worker error:", event.message);
    this.handleWorkerFailure(`Worker error: ${event.message}`);
  }

  /**
   * Handle worker message errors
   */
  private handleWorkerMessageError(event: MessageEvent): void {
    console.error("🐍 Worker message error:", event.type);
    this.handleWorkerFailure(`Worker message error: ${event.type}`);
  }

  /**
   * Common worker failure handling
   */
  private handleWorkerFailure(errorMessage: string): void {
    // Reject all pending executions
    for (const [, pending] of this.pendingExecutions) {
      pending.reject(new Error(errorMessage));
    }
    this.pendingExecutions.clear();

    // Clear execution queue
    for (const { reject } of this.executionQueue) {
      reject(new Error(errorMessage));
    }
    this.executionQueue.length = 0;

    // Mark as uninitialized
    this.isInitialized = false;
    this.currentExecutionContext = null;
  }

  /**
   * Execute Python code through the worker
   */
  private async executeCode(
    context: ExecutionContext,
    code: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isInitialized || !this.worker) {
      try {
        await this.initializePyodideWorker();
      } catch (error) {
        return {
          success: false,
          error: `Failed to initialize Pyodide: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }

    // Queue the execution to ensure serialization
    return new Promise((resolve, reject) => {
      this.executionQueue.push({
        context,
        code,
        resolve,
        reject,
      });
      this.processExecutionQueue();
    });
  }

  /**
   * Process execution queue to ensure only one execution at a time
   */
  private async processExecutionQueue(): Promise<void> {
    if (this.isExecuting || this.executionQueue.length === 0) {
      return;
    }

    this.isExecuting = true;
    const { context, code, resolve, reject } = this.executionQueue.shift()!;

    try {
      const result = await this.executeCodeSerialized(context, code);
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.isExecuting = false;
      // Process next item in queue
      this.processExecutionQueue();
    }
  }

  /**
   * Execute code with proper context isolation
   */
  private async executeCodeSerialized(
    context: ExecutionContext,
    code: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Set up abort handling
      let isAborted = false;
      const abortHandler = () => {
        isAborted = true;
        if (this.interruptBuffer) {
          const view = new Int32Array(this.interruptBuffer);
          view[0] = 2; // SIGINT
        }
      };

      if (context.abortSignal.aborted) {
        return { success: false, error: "Execution cancelled" };
      }

      context.abortSignal.addEventListener("abort", abortHandler);

      try {
        // Set current execution context for real-time streaming
        this.currentExecutionContext = context;

        const executionResult = (await this.sendWorkerMessage("execute", {
          code,
        })) as { result: unknown };

        if (isAborted) {
          return { success: false, error: "Execution cancelled" };
        }

        // Most outputs are already streamed, just handle final result if needed
        if (
          executionResult.result !== null &&
          executionResult.result !== undefined
        ) {
          context.result(this.formatOutput(executionResult.result));
        }

        return { success: true };
      } finally {
        context.abortSignal.removeEventListener("abort", abortHandler);
        // Clear interrupt signal
        if (this.interruptBuffer) {
          const view = new Int32Array(this.interruptBuffer);
          view[0] = 0;
        }
        this.currentExecutionContext = null;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (context.abortSignal.aborted || errorMsg.includes("cancelled")) {
        return { success: false, error: "Execution cancelled" };
      }

      context.error("PythonError", errorMsg, [errorMsg]);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Format output data for display
   */
  private formatOutput(data: unknown): Record<string, unknown> {
    if (data === null || data === undefined) {
      return { "text/plain": "" };
    }

    if (typeof data === "object" && data !== null) {
      // If it's already formatted with MIME types
      const obj = data as Record<string, unknown>;
      if (obj["text/plain"] || obj["text/html"] || obj["image/png"]) {
        return obj;
      }
    }

    // Default to plain text
    return { "text/plain": String(data) };
  }

  /**
   * Cleanup worker resources
   */
  private async cleanupWorker(): Promise<void> {
    if (this.worker) {
      try {
        await this.sendWorkerMessage("shutdown", {});
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch {
        // Ignore errors during shutdown
      }

      this.worker.terminate();
      this.worker = null;
    }

    this.isInitialized = false;
    console.log("🧹 Pyodide worker cleanup completed");
  }
}

/**
 * Factory function to create and start a Pyodide runtime agent
 */
export async function createAgent(
  config: PyodideRuntimeConfig
): Promise<PyodideRuntimeAgent> {
  const agent = new PyodideRuntimeAgent(config);
  await agent.start();
  return agent;
}

/**
 * Export types for external use
 */
export type { LocalRuntimeConfig };
export { LocalRuntimeAgent };
