/**
 * HTML Runtime Agent
 *
 * A lightweight runtime agent that executes HTML code directly in the browser.
 * Provides immediate rendering of HTML content with no external dependencies.
 *
 * Extends LocalRuntimeAgent to inherit common local runtime functionality
 * while focusing on HTML-specific execution logic.
 *
 * ## AI Integration
 *
 * The HTML agent automatically detects the service provider and sets up AI clients:
 * - **Anaconda Provider**: Detected via VITE_AUTH_URI starting with https://auth.anaconda.com/
 * - **Local Provider**: All other configurations rely on Ollama for local AI execution
 * - **Fallback**: Always includes Ollama client for offline capability
 *
 * AI model discovery happens during startup to ensure capabilities are available
 * when the runtime announces itself to the system.
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
} from "./LocalRuntimeAgent.js";

import {
  executeAI,
  gatherNotebookContext,
  type NotebookTool,
} from "@runtimed/ai-core";
import type { AiModel } from "@runtimed/agent-core";
import { cellReferences$ } from "@runtimed/schema";
import { AiClientManager } from "./AiClientManager.js";

/**
 * HTML Runtime Agent
 *
 * Executes HTML code cells by rendering them directly through context.display().
 * Provides immediate visual feedback with no compilation or processing overhead.
 */
export class HtmlRuntimeAgent extends LocalRuntimeAgent {
  private discoveredAiModels: AiModel[] = [];
  private aiManager: AiClientManager;

  constructor(config: LocalRuntimeConfig) {
    super(config);
    this.aiManager = new AiClientManager(config.authToken);
  }

  /**
   * Get the runtime type identifier
   */
  protected getRuntimeType(): string {
    return "html";
  }

  /**
   * Get the log icon for HTML runtime
   */
  protected getLogIcon(): string {
    return "🌐";
  }

  /**
   * Define capabilities for HTML runtime
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
   * Start the HTML runtime agent with AI model discovery
   */
  async start(): Promise<RuntimeAgent> {
    console.log(`🌐 Starting ${this.getRuntimeType()} runtime agent`);

    // Setup AI clients (including Anaconda if needed)
    await this.aiManager.setupAiClients();

    // Get discovered models from the manager
    this.discoveredAiModels = this.aiManager.getDiscoveredModels();

    // Call parent to start the agent - capabilities now include discovered models
    return await super.start();
  }

  /**
   * Create the HTML execution handler
   */
  protected createExecutionHandler(): ExecutionHandler {
    return async (context: ExecutionContext) => {
      const { cell } = context;

      console.log(`🔄 Executing HTML cell: ${cell.id}`);

      // Clear previous outputs
      context.clear();

      if (cell.cellType === "ai") {
        try {
          console.log(`🤖 Executing AI cell: ${cell.id}`);

          // Ensure agent is initialized
          if (!this.agent) {
            throw new Error("Runtime agent not initialized");
          }

          // Find the current cell reference for context gathering
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
        const errorMsg = "HTML handler only supports code cells";
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
        // Display HTML content using context.display()
        await context.display({
          "text/html": cell.source,
          "text/plain": cell.source, // Fallback for text-only clients
        });

        console.log(`✅ HTML execution completed for cell: ${cell.id}`);
        return { success: true };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);

        console.error(`❌ HTML execution failed for cell: ${cell.id}`, error);

        // Emit error to the notebook
        context.error("HTMLExecutionError", errorMsg, [
          `Error executing HTML cell: ${cell.id}`,
          errorMsg,
        ]);

        return {
          success: false,
          error: errorMsg,
        };
      }
    };
  }

  /**
   * Register AI clients with API keys for authenticated usage
   *
   * @example
   * ```typescript
   * // Register Anaconda client with API key
   * htmlAgent.registerAIClient("anaconda", { apiKey: "your-api-key" });
   *
   * // Register OpenAI client with API key
   * htmlAgent.registerAIClient("openai", { apiKey: "your-openai-key" });
   * ```
   */
  public registerAIClient(
    provider: "anaconda" | "openai",
    config: { apiKey: string; [key: string]: any }
  ): void {
    this.aiManager.registerAIClient(provider, config);
  }

  /**
   * Refresh available AI models after registering new clients
   *
   * This updates the runtime capabilities with newly discovered models
   * and should be called after registering AI clients with API keys.
   */
  public async refreshAIModels(): Promise<void> {
    await this.aiManager.refreshModels();
    this.discoveredAiModels = this.aiManager.getDiscoveredModels();
  }
}

/**
 * Factory function to create and start an HTML runtime agent with AI capabilities
 */
export async function createHtmlAgent(
  config: LocalRuntimeConfig
): Promise<HtmlRuntimeAgent> {
  const agent = new HtmlRuntimeAgent(config);
  await agent.start();
  return agent;
}
