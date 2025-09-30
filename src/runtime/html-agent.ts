/**
 * HTML Runtime Agent
 *
 * A lightweight runtime agent that executes HTML code directly in the browser.
 * Provides immediate rendering of HTML content with no external dependencies.
 *
 * Extends LocalRuntimeAgent to inherit common local runtime functionality
 * while focusing on HTML-specific execution logic.
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
import { aiProvider } from "./ai-provider.js";
import type { AiModel } from "@runtimed/agent-core";
import { cellReferences$ } from "@runtimed/schema";

/**
 * HTML Runtime Agent
 *
 * Executes HTML code cells by rendering them directly through context.display().
 * Provides immediate visual feedback with no compilation or processing overhead.
 */
export class HtmlRuntimeAgent extends LocalRuntimeAgent {
  private discoveredAiModels: AiModel[] = [];

  constructor(config: LocalRuntimeConfig) {
    super(config);
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

    // Discover available AI models using shared AI provider
    // This ensures capabilities are ready when runtime announces itself
    try {
      console.log("🔍 Discovering available AI models from shared provider...");
      const provider = aiProvider.getProvider();

      if (provider) {
        this.discoveredAiModels = await aiProvider.discoverModels();

        if (this.discoveredAiModels.length === 0) {
          console.warn(
            "⚠️  No AI models discovered - API keys may not be configured or provider may not be available"
          );
        } else {
          console.log(
            `✅ Discovered ${this.discoveredAiModels.length} AI model${this.discoveredAiModels.length === 1 ? "" : "s"} from providers: ${[...new Set(this.discoveredAiModels.map((m) => m.provider))].join(", ")}`
          );
        }
      } else {
        console.warn(
          "⚠️  No AI provider configured - set VITE_ANACONDA_API_KEY or similar"
        );
        this.discoveredAiModels = [];
      }
    } catch (error) {
      console.error("❌ Failed to discover AI models", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue with empty models array on error
      this.discoveredAiModels = [];
    }

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
   * Uses the shared browser AI provider system
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
    provider: "anaconda" | "openai" | "groq" | "ollama",
    config: { apiKey?: string; [key: string]: any }
  ): void {
    aiProvider.configure(provider, config);
    console.log(
      `🔗 Registered ${provider} AI client for HTML runtime via shared provider`
    );
  }

  /**
   * Refresh available AI models after registering new clients
   *
   * This updates the runtime capabilities with newly discovered models
   * and should be called after registering AI clients with API keys.
   */
  public async refreshAIModels(): Promise<void> {
    try {
      console.log("🔄 Refreshing AI models from shared provider...");
      this.discoveredAiModels = await aiProvider.discoverModels();

      console.log(
        `✅ Refreshed AI models: ${this.discoveredAiModels.length} model${this.discoveredAiModels.length === 1 ? "" : "s"} from providers: ${[...new Set(this.discoveredAiModels.map((m) => m.provider))].join(", ")}`
      );
    } catch (error) {
      console.error("❌ Failed to refresh AI models", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
