/**
 * Pyodide Runtime Agent
 */

import {
  RuntimeAgent,
  type ExecutionHandler,
  type ExecutionContext,
  type RuntimeCapabilities,
} from "@runtimed/agent-core";

// Extend global scope for debugging
declare global {
  var __PYODIDE_WORKER__: Worker | null;
  var __PYODIDE_RUNTIME_AGENT__: PyodideRuntimeAgent | null;
  var __PYODIDE_DEBUG__: {
    runPython(code: string): Promise<unknown>;
    checkStatus(): Promise<unknown>;
    loadPackage(packageName: string): Promise<unknown>;
    installPackage(packageName: string): Promise<unknown>;
    help(): void;
  };
}
import {
  LocalRuntimeAgent,
  type LocalRuntimeConfig,
} from "./LocalRuntimeAgent.ts";
import { logger } from "@runtimed/agent-core";

import {
  ensureTextPlainFallback,
  executeAI,
  gatherNotebookContext,
  type NotebookTool,
  type AIMediaBundle,
} from "@runtimed/ai-core";
import type { AiModel } from "@runtimed/agent-core";
import {
  cellReferences$,
  type FileData,
  isJsonMimeType,
  isTextBasedMimeType,
  KNOWN_MIME_TYPES,
  type KnownMimeType,
  maxAiIterations$,
  tables,
} from "@runtimed/schema";

// Type guard for objects with string indexing
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasDataProperty(value: unknown): value is { data: unknown } {
  return isRecord(value) && "data" in value;
}

export class PyodideRuntimeAgent extends LocalRuntimeAgent {
  private worker: Worker | null = null;
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
  private interruptBuffer?: SharedArrayBuffer;
  private discoveredAiModels: AiModel[] = [];

  constructor(config: LocalRuntimeConfig) {
    super(config);

    // Configure logger if logging config is provided
    if (config.logging) {
      logger.configure(config.logging);
    }
  }

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
    const { stderr, result, error, abortSignal } = context;

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

      if (abortSignal.aborted) {
        // TODO: Use a special display for this
        stderr("Execution was already cancelled\n");
        return { success: false, error: "Execution cancelled" };
      }

      abortSignal.addEventListener("abort", abortHandler);

      try {
        // Set current execution context for real-time streaming
        this.currentExecutionContext = context;

        const executionResult = (await this.sendWorkerMessage("execute", {
          code,
        })) as { result: unknown };

        if (isAborted) {
          stderr("Python execution was cancelled\n");
          return { success: false, error: "Execution cancelled" };
        }

        // Note: Most outputs are already streamed via handleWorkerMessage
        // Only handle final result if it wasn't already streamed
        if (
          executionResult.result !== null &&
          executionResult.result !== undefined
        ) {
          result(this.formatRichOutput(executionResult.result));
        }

        return { success: true };
      } finally {
        abortSignal.removeEventListener("abort", abortHandler);
        // Clear interrupt signal
        if (this.interruptBuffer) {
          const view = new Int32Array(this.interruptBuffer);
          view[0] = 0;
        }
        // Clear execution context
        this.currentExecutionContext = null;
      }
    } catch (err) {
      if (
        abortSignal.aborted ||
        (err instanceof Error &&
          (err.message.includes("cancelled") ||
            err.message.includes("KeyboardInterrupt") ||
            err.message.includes("Worker crashed")))
      ) {
        stderr("Python execution was cancelled\n");
        return { success: false, error: "Execution cancelled" };
      }

      // Handle Python errors
      if (err instanceof Error) {
        const errorLines = err.message.split("\n");
        const errorName = errorLines[0] || "PythonError";
        const errorValue = errorLines[1] || err.message;
        const traceback = errorLines.length > 2 ? errorLines : [err.message];

        error(errorName, errorValue, traceback);
        return { success: false, error: errorValue };
      }

      throw err;
    }
  }

  protected getRuntimeType(): string {
    return "python";
  }

  protected getLogIcon(): string {
    return "🐍";
  }

  /**
   * Define capabilities for Pyodide runtime
   */
  protected getCapabilities(): RuntimeCapabilities {
    return {
      canExecuteCode: true,
      canExecuteSql: false,
      canExecuteAi: true,
      availableAiModels: this.discoveredAiModels,
    };
  }

  /**
   * Start the Pyodide runtime agent with AI model discovery
   */
  async start(): Promise<RuntimeAgent> {
    console.log(
      `${this.getLogIcon()} Starting ${this.getRuntimeType()} runtime agent`
    );

    // Discover available AI models using shared browser AI provider
    try {
      console.log(
        "🔍 Discovering available AI models from shared browser provider..."
      );

      // Access the global browser AI provider
      const browserAiProvider =
        (globalThis as any).__RUNT_AI__ ||
        (globalThis as any).window?.__RUNT_AI__;

      if (browserAiProvider) {
        this.discoveredAiModels = await browserAiProvider.discoverModels();

        if (this.discoveredAiModels.length === 0) {
          console.warn(
            "⚠️  No AI models discovered - provider may not be configured"
          );
        } else {
          console.log(
            `✅ Discovered ${this.discoveredAiModels.length} AI model${this.discoveredAiModels.length === 1 ? "" : "s"} from providers: ${[...new Set(this.discoveredAiModels.map((m) => m.provider))].join(", ")}`
          );
        }
      } else {
        console.warn(
          "⚠️  No browser AI provider found - AI features may not be available"
        );
        this.discoveredAiModels = [];
      }
    } catch (error) {
      console.error("❌ Failed to discover AI models", {
        error: error instanceof Error ? error.message : String(error),
      });
      this.discoveredAiModels = [];
    }

    // Call parent to start the agent - capabilities now include discovered models
    const agent = await super.start();

    // Initialize Pyodide worker
    await this.initializePyodideWorker();

    // Send uploaded files to worker
    if (this.agent) {
      const agent = this.agent;

      const addUrls = (files: readonly FileData[]) => {
        return files.map((file) => ({
          ...file,
          url: agent.artifactClient.getArtifactUrl(file.artifactId),
        }));
      };

      const files = agent.store.query(tables.files.select());
      if (files.length > 0) {
        this.sendWorkerMessage("files", { files: addUrls(files) });
      }

      this.agent.onFilesUpload((files) => {
        this.sendWorkerMessage("files", { files: addUrls(files) });
      });
    }

    // Expose runtime agent globally for debugging
    globalThis.__PYODIDE_RUNTIME_AGENT__ = this;
    console.log(
      "🔧 Pyodide runtime agent exposed as globalThis.__PYODIDE_RUNTIME_AGENT__ for debugging"
    );

    return agent;
  }

  /**
   * Handle messages from worker
   */
  private handleWorkerMessage(event: MessageEvent): void {
    const { id, type, data, error } = event.data;

    if (type === "log") {
      logger.debug("Worker log", { message: data });
      return;
    }

    if (type === "startup_output") {
      // Startup messages are already logged by worker, noop to keep out of cells
      return;
    }

    if (type === "stream_output") {
      // Handle real-time streaming outputs with formatting
      if (this.currentExecutionContext) {
        switch (data.type) {
          case "stdout":
            this.currentExecutionContext.stdout(data.text);
            break;
          case "stderr":
            this.currentExecutionContext.stderr(data.text);
            break;
          case "result":
          case "execute_result":
            if (data.data !== null && data.data !== undefined) {
              this.currentExecutionContext.result(
                this.formatRichOutput(data.data, data.metadata)
              );
            }
            break;
          case "display_data":
            if (data.data !== null && data.data !== undefined) {
              // Extract display_id from transient data if present
              const displayId = data.transient?.display_id;
              this.currentExecutionContext.display(
                this.formatRichOutput(data.data, data.metadata),
                data.metadata || {},
                displayId
              );
            }
            break;
          case "update_display_data":
            if (data.data != null) {
              // Extract display_id from transient data
              const displayId = data.transient?.display_id;
              if (displayId) {
                this.currentExecutionContext.updateDisplay(
                  displayId,
                  this.formatRichOutput(data.data, data.metadata),
                  data.metadata || {}
                );
              } else {
                // Fallback to regular display if no display_id
                this.currentExecutionContext.display(
                  this.formatRichOutput(data.data, data.metadata),
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
      // Handle specific error types
      if (error.includes("KeyboardInterrupt")) {
        pending.reject(new Error("Execution cancelled"));
      } else {
        pending.reject(new Error(error));
      }
    } else {
      pending.resolve(data);
    }
  }

  private formatRichOutput(
    result: unknown,
    metadata?: Record<string, unknown>
  ): AIMediaBundle {
    if (result === null || result === undefined) {
      return { "text/plain": "" };
    }

    // If result is already a formatted output dict with MIME types
    if (isRecord(result)) {
      const rawBundle: AIMediaBundle = {};
      let hasMimeType = false;

      // Check all known MIME types and any +json types
      for (const mimeType of Object.keys(result)) {
        if (
          KNOWN_MIME_TYPES.includes(mimeType as KnownMimeType) ||
          isJsonMimeType(mimeType)
        ) {
          const value = result[mimeType];

          // Handle different value types appropriately
          if (typeof value === "string") {
            rawBundle[mimeType] = value;
            hasMimeType = true;
          } else if (typeof value === "number" || typeof value === "boolean") {
            rawBundle[mimeType] = isTextBasedMimeType(mimeType)
              ? String(value)
              : value;
            hasMimeType = true;
          } else if (isRecord(value)) {
            // Keep JSON objects as objects for JSON-based types
            if (isJsonMimeType(mimeType)) {
              rawBundle[mimeType] = value;
            } else {
              rawBundle[mimeType] = JSON.stringify(value);
            }
            hasMimeType = true;
          } else if (value !== null && value !== undefined) {
            rawBundle[mimeType] = String(value);
            hasMimeType = true;
          }
        }
      }

      if (hasMimeType) {
        // Ensure text/plain fallback for display
        return ensureTextPlainFallback(rawBundle);
      }

      // Check if it's a rich data structure with data and metadata
      if (hasDataProperty(result)) {
        return this.formatRichOutput(result.data, metadata);
      }

      // Format as JSON with pretty printing
      try {
        const jsonStr = JSON.stringify(result, null, 2);
        return {
          "text/plain": jsonStr,
          "application/json": result,
        };
      } catch {
        return { "text/plain": String(result) };
      }
    }

    // Handle primitive types
    if (typeof result === "string") {
      // Check if it's HTML content
      if (result.includes("<") && result.includes(">")) {
        return {
          "text/html": result,
          "text/plain": result.replace(/<[^>]*>/g, ""), // Strip HTML for plain text
        };
      }
      return { "text/plain": result };
    }

    if (typeof result === "number" || typeof result === "boolean") {
      return { "text/plain": String(result) };
    }

    return { "text/plain": String(result) };
  }

  protected createExecutionHandler(): ExecutionHandler {
    return this.executeCell.bind(this);
  }

  /**
   * Execute Python code or AI prompts using Pyodide worker or OpenAI
   */
  async executeCell(
    context: ExecutionContext
  ): Promise<{ success: boolean; error?: string }> {
    const { cell } = context;
    const code = cell.source?.trim() || "";

    if (!this.agent) {
      throw new Error("Agent not initialized");
    }

    // When an AI cell, hand it off to `@runt/ai` to handle, providing it notebook context
    if (cell.cellType === "ai") {
      // Find the current cell reference for context gathering
      const cellReferences = this.agent.store.query(cellReferences$);
      const currentCellRef = cellReferences.find((ref) => ref.id === cell.id);

      if (!currentCellRef) {
        throw new Error(`Could not find cell reference for cell ${cell.id}`);
      }

      const notebookContext = gatherNotebookContext(
        this.agent.store,
        currentCellRef
      );

      const maxAiIterations: number =
        parseInt(this.agent.store.query(maxAiIterations$)) || 10;

      // Track AI execution for cancellation
      const aiAbortController = new AbortController();

      // Connect the AI abort controller to the execution context's abort signal
      if (context.abortSignal.aborted) {
        aiAbortController.abort();
      } else {
        context.abortSignal.addEventListener("abort", () => {
          aiAbortController.abort();
        });
      }

      // Create a modified context with the AI-specific abort signal and bound sendWorkerMessage
      const aiContext = {
        ...context,
        abortSignal: aiAbortController.signal,
        sendWorkerMessage: this.sendWorkerMessage.bind(this),
      };

      const notebookTools = (await this.sendWorkerMessage(
        "get_registered_tools",
        {}
      )) as NotebookTool[];

      try {
        return await executeAI(
          aiContext,
          notebookContext,
          this.agent.store,
          this.agent.config.sessionId,
          notebookTools,
          maxAiIterations
        );
      } finally {
        // AI execution completed
      }
    }

    if (!this.worker) {
      // Try to reinitialize worker if it crashed
      await this.initializePyodideWorker();
    }

    if (!code) {
      return { success: true };
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

  async initializePyodideWorker() {
    try {
      logger.info("Initializing Pyodide worker");

      // Determine packages to load based on options
      // const packagesToLoad =
      // this.pyodideOptions.packages || getEssentialPackages();

      // Create SharedArrayBuffer for interrupt signaling (if available)
      try {
        if (typeof SharedArrayBuffer !== "undefined") {
          this.interruptBuffer = new SharedArrayBuffer(4);
          const interruptView = new Int32Array(this.interruptBuffer);
          interruptView[0] = 0; // Initialize to no interrupt
          console.log(
            "🔧 SharedArrayBuffer available - interrupt signaling enabled"
          );
        } else {
          console.warn(
            "⚠️ SharedArrayBuffer not available - interrupt signaling disabled"
          );
          this.interruptBuffer = undefined;
        }
      } catch (error) {
        console.warn(
          "⚠️ SharedArrayBuffer creation failed - interrupt signaling disabled:",
          error
        );
        this.interruptBuffer = undefined;
      }

      // Create worker with Pyodide
      this.worker = new Worker(
        new URL("./pyodide-worker.ts", import.meta.url),
        { type: "module" }
      );

      // Set up worker message handling
      this.worker.addEventListener(
        "message",
        this.handleWorkerMessage.bind(this)
      );
      this.worker.addEventListener("error", (error) => {
        logger.error(
          "Worker error",
          new Error(error.message || "Unknown worker error"),
          {
            filename: error.filename,
            lineno: error.lineno,
          }
        );
        this.handleWorkerCrash("Worker error event");
      });
      this.worker.addEventListener("messageerror", (error) => {
        logger.error("Worker message error", undefined, {
          type: error.type,
          data: error.data,
        });
        this.handleWorkerCrash("Worker message error");
      });

      // Expose worker globally for debugging
      globalThis.__PYODIDE_WORKER__ = this.worker;
      console.log(
        "🔧 Pyodide worker exposed as globalThis.__PYODIDE_WORKER__ for debugging"
      );

      const packagesToLoad: string[] = [];

      // Initialize Pyodide in worker
      await this.sendWorkerMessage("init", {
        interruptBuffer: this.interruptBuffer,
        packages: packagesToLoad,
      });

      logger.info("Pyodide worker initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize Pyodide worker", error);
      throw error;
    }
  }

  /**
   * Handle worker crash and cleanup
   */
  private handleWorkerCrash(reason: string): void {
    logger.error("Uncaught error", new Error(reason));

    // Reject all pending executions
    for (const [id, pending] of this.pendingExecutions) {
      logger.error(`Rejected execution ${id}: ${reason}`, new Error(reason));
      pending.reject(new Error(`Worker crashed: ${reason}`));
    }
    this.pendingExecutions.clear();

    // Reject all queued executions
    for (const { reject } of this.executionQueue) {
      reject(new Error(`Worker crashed: ${reason}`));
    }
    this.executionQueue.length = 0;

    this.currentExecutionContext = null;

    // Clean up worker (async but don't wait for it in crash handler)
    this.cleanupWorker().catch((error) => {
      logger.debug("Error during worker cleanup after crash", {
        error: error instanceof Error ? error.message : String(error),
      });
    });
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
   * Send message to worker for debugging
   */
  public async sendDebugMessage(type: string, data: unknown): Promise<unknown> {
    return this.sendWorkerMessage(type, data);
  }

  /**
   * Cleanup worker resources
   */
  private async cleanupWorker(): Promise<void> {
    if (this.worker) {
      try {
        // Send shutdown signal to worker before terminating
        await this.sendWorkerMessage("shutdown", {});

        // Give the worker a moment to clean up
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        // Ignore errors during shutdown - worker might already be terminated
        logger.debug(
          "Worker shutdown message failed (expected during cleanup)",
          {
            error: error instanceof Error ? error.message : String(error),
          }
        );
      }

      this.worker.terminate();
      this.worker = null;
    }

    logger.info("Pyodide worker cleanup completed");
  }
}

/**
 * Factory function to create and start a runtime agent with AI capabilities
 *
 * @example
 * // Create agent with default logging (INFO level, console enabled)
 * const agent = await createAgent({
 *   store,
 *   authToken,
 *   notebookId,
 *   userId,
 * });
 *
 * @example
 * // Create agent with debug logging enabled
 * const agent = await createAgent({
 *   store,
 *   authToken,
 *   notebookId,
 *   userId,
 *   logging: {
 *     level: 0, // DEBUG level
 *     console: true,
 *     service: "my-pyodide-runtime"
 *   }
 * });
 *
 * @example
 * // Create agent with logging completely disabled
 * const agent = await createAgent({
 *   store,
 *   authToken,
 *   notebookId,
 *   userId,
 *   logging: {
 *     level: 3, // ERROR level (quiet)
 *     console: false,
 *   }
 * });
 */
export async function createAgent(
  config: LocalRuntimeConfig
): Promise<PyodideRuntimeAgent> {
  const agent = new PyodideRuntimeAgent(config);
  await agent.start();
  return agent;
}

// Global debug helpers
if (typeof globalThis !== "undefined") {
  globalThis.__PYODIDE_DEBUG__ = {
    async runPython(code: string) {
      const agent = globalThis.__PYODIDE_RUNTIME_AGENT__;
      if (!agent) {
        throw new Error(
          "No Pyodide runtime agent available. Launch Python runtime first."
        );
      }
      return await agent.sendDebugMessage("debug", { code });
    },

    async checkStatus() {
      const agent = globalThis.__PYODIDE_RUNTIME_AGENT__;
      if (!agent) {
        return { agent: null, worker: null };
      }
      return {
        agent: !!agent,
        worker: !!globalThis.__PYODIDE_WORKER__,
        status: agent.getStatus?.() || "unknown",
      };
    },

    async loadPackage(packageName: string) {
      const agent = globalThis.__PYODIDE_RUNTIME_AGENT__;
      if (!agent) {
        throw new Error("No Pyodide runtime agent available");
      }
      return await agent.sendDebugMessage("debug", {
        code: `await pyodide.loadPackage("${packageName}")`,
      });
    },

    async installPackage(packageName: string) {
      const agent = globalThis.__PYODIDE_RUNTIME_AGENT__;
      if (!agent) {
        throw new Error("No Pyodide runtime agent available");
      }
      return await agent.sendDebugMessage("debug", {
        code: `import micropip; await micropip.install("${packageName}")`,
      });
    },

    help() {
      console.log("🔧 Pyodide Debug Helpers:");
      console.log("  __PYODIDE_DEBUG__.runPython(code) - Run Python code");
      console.log("  __PYODIDE_DEBUG__.checkStatus() - Check runtime status");
      console.log(
        "  __PYODIDE_DEBUG__.loadPackage(name) - Load Pyodide package"
      );
      console.log(
        "  __PYODIDE_DEBUG__.installPackage(name) - Install via micropip"
      );
      console.log("  __PYODIDE_RUNTIME_AGENT__ - Runtime agent instance");
      console.log("  __PYODIDE_WORKER__ - Worker instance");
    },
  };

  // Show help on first load
  console.log(
    "🔧 Pyodide debug helpers available at globalThis.__PYODIDE_DEBUG__"
  );
  console.log("   Try: __PYODIDE_DEBUG__.help()");
}
