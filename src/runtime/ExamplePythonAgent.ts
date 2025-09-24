/**
 * Example Python Runtime Agent
 *
 * Demonstrates how to use the reusable AiClientManager in a different runtime agent.
 * This shows the patterns for integrating AI capabilities across different runtime types
 * while sharing the same authentication and model discovery logic.
 *
 * ## Key Features
 *
 * - Reuses AiClientManager for consistent AI setup across runtime types
 * - Automatic Anaconda provider detection and authentication
 * - Python code execution placeholder (would delegate to external Python runtime)
 * - Full AI execution support with notebook context awareness
 * - Shared model discovery and capability reporting
 */

import {
  RuntimeAgent,
  type ExecutionHandler,
  type ExecutionContext,
  type RuntimeCapabilities,
  type AiModel,
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
import { cellReferences$ } from "@runtimed/schema";
import { AiClientManager } from "./AiClientManager.js";

/**
 * Example Python Runtime Agent
 *
 * Demonstrates integration with AiClientManager for consistent AI capabilities
 * across different runtime agent implementations.
 */
export class ExamplePythonAgent extends LocalRuntimeAgent {
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
    return "python-example";
  }

  /**
   * Get the log icon for Python runtime
   */
  protected getLogIcon(): string {
    return "🐍";
  }

  /**
   * Define capabilities for Python runtime
   */
  protected getCapabilities(): RuntimeCapabilities {
    return {
      canExecuteCode: true,
      canExecuteSql: true,
      canExecuteAi: true,
      availableAiModels: this.discoveredAiModels,
    };
  }

  /**
   * Start the Python runtime agent with AI model discovery
   */
  async start(): Promise<RuntimeAgent> {
    console.log(`🐍 Starting ${this.getRuntimeType()} runtime agent`);

    // Setup AI clients using the reusable manager
    await this.aiManager.setupAiClients();

    // Get discovered models from the manager
    this.discoveredAiModels = this.aiManager.getDiscoveredModels();

    // Call parent to start the agent - capabilities now include discovered models
    return await super.start();
  }

  /**
   * Create the Python execution handler
   */
  protected createExecutionHandler(): ExecutionHandler {
    return async (context: ExecutionContext) => {
      const { cell } = context;

      console.log(`🔄 Executing ${cell.cellType} cell: ${cell.id}`);

      // Clear previous outputs
      context.clear();

      if (cell.cellType === "ai") {
        return await this.executeAICell(context);
      }

      // Handle code and SQL cells
      if (cell.cellType === "code" || cell.cellType === "sql") {
        return await this.executePythonCode(context);
      }

      // Unsupported cell type
      const errorMsg = `Python handler only supports code, sql, and ai cells, got: ${cell.cellType}`;
      context.error("UnsupportedCellType", errorMsg, []);
      return {
        success: false,
        error: errorMsg,
      };
    };
  }

  /**
   * Execute AI cells using the shared AI infrastructure
   */
  private async executeAICell(context: ExecutionContext): Promise<{
    success: boolean;
    error?: string;
  }> {
    const { cell } = context;

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
        throw new Error(`Could not find cell reference for cell ${cell.id}`);
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

      // For this example, use empty notebook tools array
      // In a real Python agent, this would include Python-specific tools
      const notebookTools: NotebookTool[] = [];

      // Use default max iterations
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
      const errorMsg = error instanceof Error ? error.message : String(error);
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

  /**
   * Execute Python code (placeholder implementation)
   *
   * In a real implementation, this would:
   * - Communicate with an external Python runtime (Pyodide, remote server, etc.)
   * - Handle rich outputs (matplotlib plots, pandas tables, etc.)
   * - Support package management and imports
   * - Provide proper error handling and tracebacks
   */
  private async executePythonCode(context: ExecutionContext): Promise<{
    success: boolean;
    error?: string;
  }> {
    const { cell } = context;

    // Check for empty source
    if (!cell.source || cell.source.trim() === "") {
      return { success: true };
    }

    try {
      // Placeholder: In a real implementation, this would execute Python code
      const isSQL = cell.cellType === "sql";
      const language = isSQL ? "SQL" : "Python";

      // Simulate execution delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Display placeholder output
      await context.display({
        "text/html": `
          <div style="font-family: monospace; padding: 8px; border: 1px solid #ccc; border-radius: 4px; background: #f9f9f9;">
            <strong>🐍 ${language} Execution Placeholder</strong><br>
            <em>This would execute the following ${language.toLowerCase()} code:</em><br><br>
            <code style="white-space: pre-wrap;">${cell.source}</code><br><br>
            <small>In a real implementation, this would delegate to an external ${language} runtime.</small>
          </div>
        `,
        "text/plain": `${language} execution placeholder for: ${cell.source}`,
      });

      console.log(`✅ ${language} execution completed for cell: ${cell.id}`);
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      console.error(
        `❌ ${cell.cellType} execution failed for cell: ${cell.id}`,
        error
      );

      // Emit error to the notebook
      context.error("PythonExecutionError", errorMsg, [
        `Error executing ${cell.cellType} cell: ${cell.id}`,
        errorMsg,
      ]);

      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Register AI clients with API keys for authenticated usage
   *
   * This delegates to the shared AiClientManager, demonstrating
   * how the same AI setup can be reused across different runtime types.
   */

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

  /**
   * Get AI-related information for debugging
   */
  public getAIStatus(): {
    modelsCount: number;
    providers: string[];
    hasAnaconda: boolean;
    hasOpenAI: boolean;
  } {
    const providers = this.aiManager.getAvailableProviders();
    return {
      modelsCount: this.discoveredAiModels.length,
      providers,
      hasAnaconda: this.aiManager.hasProvider("anaconda"),
      hasOpenAI: this.aiManager.hasProvider("openai"),
    };
  }
}

/**
 * Factory function to create and start a Python runtime agent
 *
 * Example usage:
 * ```typescript
 * const pythonAgent = await createExamplePythonAgent({
 *   store: liveStore,
 *   authToken: "user-token",
 *   notebookId: "notebook-123",
 *   userId: "user-456"
 * });
 *
 * // Check AI status
 * console.log(pythonAgent.getAIStatus());
 *
 * // Register additional AI providers if needed
 * pythonAgent.registerAIClient("openai", { apiKey: "sk-..." });
 * await pythonAgent.refreshAIModels();
 * ```
 */
export async function createExamplePythonAgent(
  config: LocalRuntimeConfig
): Promise<ExamplePythonAgent> {
  const agent = new ExamplePythonAgent(config);
  await agent.start();
  return agent;
}
