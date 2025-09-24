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
  // discoverAvailableAiModels,
  executeAI,
  gatherNotebookContext,
  // aiRegistry,
  // AnacondaAIClient,
  // OpenAIClient,
  type NotebookTool,
} from "@runtimed/ai-core";
// import type { AiModel } from "@runtimed/agent-core";
import { cellReferences$ } from "@runtimed/schema";

export class PyodideRuntimeAgent extends LocalRuntimeAgent {
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
