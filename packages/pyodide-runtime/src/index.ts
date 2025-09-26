/**
 * Pyodide Runtime Agent
 */

import {
  RuntimeAgent,
  type ExecutionHandler,
  type ExecutionContext,
  type RuntimeCapabilities,
} from "@runtimed/agent-core";
import {
  LocalRuntimeAgent,
  type LocalRuntimeConfig,
} from "./LocalRuntimeAgent.ts";

import {
  ensureTextPlainFallback,
  // discoverAvailableAiModels,
  executeAI,
  gatherNotebookContext,
  // aiRegistry,
  // AnacondaAIClient,
  // OpenAIClient,
  type NotebookTool,
} from "@runtimed/ai-core";
// import type { AiModel } from "@runtimed/agent-core";
import {
  cellReferences$,
  isJsonMimeType,
  isTextBasedMimeType,
  KNOWN_MIME_TYPES,
  type KnownMimeType,
  MediaBundle,
  validateMediaBundle,
} from "@runtimed/schema";

// Type guard for objects with string indexing
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasDataProperty(value: unknown): value is { data: unknown } {
  return isRecord(value) && "data" in value;
}

const logger = console;

export class PyodideRuntimeAgent extends LocalRuntimeAgent {
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
  private currentAIExecution: {
    cellId: string;
    abortController: AbortController;
  } | null = null;
  private signalHandlers = new Map<string, () => void>();

  constructor(config: LocalRuntimeConfig) {
    super(config);
  }

  protected getRuntimeType(): string {
    return "python";
  }

  protected getLogIcon(): string {
    return "🐍";
  }

  /**
   * Define capabilities for HTML runtime
   */
  protected getCapabilities(): RuntimeCapabilities {
    return {
      canExecuteCode: true,
      canExecuteSql: false,
      canExecuteAi: true,
      // For now, none
      availableAiModels: [],
    };
  }

  /**
   * Start the HTML runtime agent with AI model discovery
   */
  async start(): Promise<RuntimeAgent> {
    console.log(
      `${this.getLogIcon()} Starting ${this.getRuntimeType()} runtime agent`
    );

    // TODO: Discover available AI models BEFORE calling super.start()
    // This ensures capabilities are ready when runtime announces itself

    // Call parent to start the agent - capabilities now include discovered models
    return await super.start();
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
  ): MediaBundle {
    if (result === null || result === undefined) {
      return { "text/plain": "" };
    }

    // If result is already a formatted output dict with MIME types
    if (isRecord(result)) {
      const rawBundle: MediaBundle = {};
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
        // Validate and ensure text/plain fallback for display
        const validated = validateMediaBundle(rawBundle);
        return ensureTextPlainFallback(validated);
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
    return async (context: ExecutionContext) => {
      const { cell } = context;

      // Clear previous outputs
      context.clear();

      if (cell.cellType === "ai") {
        try {
          // Ensure agent is initialized
          if (!this.agent) {
            throw new Error("Runtime agent not initialized");
          }

          // TODO: Convert to a query for a specific cell by ID
          const cellReferences = this.agent.config.store.query(cellReferences$);
          const currentCellRef = cellReferences.find(
            (ref: any) => ref.id === cell.id
          );

          if (!currentCellRef) {
            throw new Error(
              `Could not find cell reference for cell ${cell.id}`
            );
          }

          const notebookContext = gatherNotebookContext(
            this.agent.config.store,
            currentCellRef
          );

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

          // Create a modified context with the AI-specific abort signal
          const aiContext = {
            ...context,
            abortSignal: aiAbortController.signal,
          };

          // For now, use empty notebook tools array - can be extended later
          const notebookTools: NotebookTool[] = [];

          // Use default max iterations - can be made configurable later
          const maxIterations = 10;

          return await executeAI(
            aiContext,
            notebookContext,
            this.agent.config.store,
            this.agent.config.sessionId,
            notebookTools,
            maxIterations
          );
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          console.error(`❌ AI execution failed for cell: ${cell.id}`, error);

          context.error("AIExecutionError", errorMsg, [
            `Error executing AI cell: ${cell.id}`,
            errorMsg,
          ]);

          return {
            success: false,
            error: errorMsg,
          };
        }
      }

      // Only handle code cells
      if (cell.cellType !== "code") {
        const errorMsg = `Unsupported cell type ${cell.cellType}`;
        context.error("UnsupportedCellType", errorMsg, []);
        return {
          success: false,
          error: errorMsg,
        };
      }

      // Check for empty source
      if (!cell.source || cell.source.trim() === "") {
        // Empty cell is considered successful with no output
        return { success: true };
      }

      try {
        await context.display({
          "text/plain": "Not yet implemented",
        });

        return { success: true };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);

        console.error(`❌ execution failed for cell: ${cell.id}`, error);

        // Emit error to the notebook
        context.error("ExecutionError", errorMsg, [
          `Error executing cell: ${cell.id}`,
          errorMsg,
        ]);

        return {
          success: false,
          error: errorMsg,
        };
      }
    };
  }
}

/**
 * Factory function to create and start a runtime agent with AI capabilities
 */
export async function createAgent(
  config: LocalRuntimeConfig
): Promise<PyodideRuntimeAgent> {
  const agent = new PyodideRuntimeAgent(config);
  await agent.start();
  return agent;
}
