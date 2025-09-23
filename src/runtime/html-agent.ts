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
  discoverAvailableAiModels,
  executeAI,
  gatherNotebookContext,
  aiRegistry,
  AnacondaAIClient,
  OpenAIClient,
  type NotebookTool,
} from "@runtimed/ai-core";
import type { AiModel } from "@runtimed/agent-core";
import { cellReferences$ } from "@runtimed/schema";
import { Scope, type ApiKey } from "../hooks/useApiKeys.js";

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
   * Check if we're using the Anaconda provider by querying backend config
   */
  private async isUsingAnacondaProvider(): Promise<boolean> {
    try {
      const response = await fetch("/api/config");
      if (!response.ok) {
        return false;
      }
      const config = await response.json();
      return config.service_provider === "anaconda";
    } catch (error) {
      console.error("Failed to check service provider:", error);
      return false;
    }
  }

  /**
   * Create or get an API key for AI usage from the backend
   */
  private async getApiKeyForAI(): Promise<string | null> {
    try {
      // First, check if there are existing API keys with execution scope
      const listResponse = await fetch("/api/api-keys", {
        headers: {
          Authorization: `Bearer ${this.config.authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!listResponse.ok) {
        console.warn("Failed to fetch API keys for AI usage");
        return null;
      }

      const apiKeys: ApiKey[] = await listResponse.json();

      // Check if we have an existing valid key for AI execution
      const existingKey = apiKeys.find(
        (key) =>
          !key.revoked &&
          key.scopes.includes(Scope.RuntExecute) &&
          key.name?.includes("AI Runtime")
      );

      if (existingKey) {
        console.log("Using existing API key for AI:", existingKey.id);
        // For now, we'll need to use the access token directly as we can't get the key value
        // This is a limitation - we may need backend changes to support this properly
        return this.config.authToken;
      }

      // If no existing key, we could create one, but that requires user permission
      // For now, fall back to using the access token directly
      console.log("Using access token for AI authentication");
      return this.config.authToken;
    } catch (error) {
      console.error("Error getting API key for AI:", error);
      return null;
    }
  }

  /**
   * Setup Anaconda AI client with user's authentication if using Anaconda provider
   */
  private async setupAnacondaAI(): Promise<void> {
    if (!(await this.isUsingAnacondaProvider())) {
      return;
    }

    try {
      console.log("🔑 Setting up Anaconda AI client for authenticated user...");
      const apiKey = await this.getApiKeyForAI();

      if (apiKey) {
        this.registerAIClient("anaconda", { apiKey });
        console.log(
          "✅ Anaconda AI client registered - refreshing available models..."
        );

        // Refresh models after registering the authenticated client
        await this.refreshAIModels();
      } else {
        console.warn(
          "⚠️  Authentication failed for Anaconda AI - only Ollama models will be available"
        );
      }
    } catch (error) {
      console.error("❌ Failed to setup Anaconda AI client:", error);
      console.warn("Continuing with Ollama-only AI support...");
    }
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

    // Setup Anaconda AI client with user's authentication if needed
    await this.setupAnacondaAI();

    // If Anaconda setup didn't refresh models, do initial discovery
    if (this.discoveredAiModels.length === 0) {
      await this.performInitialModelDiscovery();
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
    switch (provider) {
      case "anaconda":
        aiRegistry.register(provider, () => new AnacondaAIClient(config));
        break;
      case "openai":
        aiRegistry.register(provider, () => new OpenAIClient(config));
        break;
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }

    console.log(`🔗 Registered ${provider} AI client for HTML runtime`);
  }

  /**
   * Perform initial AI model discovery with user feedback
   */
  private async performInitialModelDiscovery(): Promise<void> {
    try {
      console.log("🔍 Discovering available AI models...");
      this.discoveredAiModels = await discoverAvailableAiModels();

      if (this.discoveredAiModels.length === 0) {
        console.warn(
          "⚠️  No AI models discovered - check if Ollama is running or API keys are configured"
        );
      } else {
        const providers = [
          ...new Set(this.discoveredAiModels.map((m) => m.provider)),
        ];
        console.log(
          `✅ Discovered ${this.discoveredAiModels.length} AI model${this.discoveredAiModels.length === 1 ? "" : "s"} from providers: ${providers.join(", ")}`
        );
      }
    } catch (error) {
      console.error("❌ Failed to discover AI models", {
        error: error instanceof Error ? error.message : String(error),
      });
      this.discoveredAiModels = [];
    }
  }

  /**
   * Refresh available AI models after registering new clients
   *
   * This updates the runtime capabilities with newly discovered models
   * and should be called after registering AI clients with API keys.
   */
  public async refreshAIModels(): Promise<void> {
    try {
      console.log("🔄 Refreshing AI models after authentication setup...");
      this.discoveredAiModels = await discoverAvailableAiModels();

      const providers = [
        ...new Set(this.discoveredAiModels.map((m) => m.provider)),
      ];
      console.log(
        `✅ Models refreshed: ${this.discoveredAiModels.length} available from ${providers.join(", ")}`
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
