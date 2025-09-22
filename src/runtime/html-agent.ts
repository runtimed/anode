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
  type ExecutionHandler,
  type ExecutionContext,
  type RuntimeCapabilities,
  type AiModel,
} from "@runtimed/agent-core";
import {
  LocalRuntimeAgent,
  type LocalRuntimeConfig,
} from "./LocalRuntimeAgent.js";

import { discoverAvailableAiModels } from "@runtimed/ai-core";

/**
 * HTML Runtime Agent
 *
 * Executes HTML code cells by rendering them directly through context.display().
 * Provides immediate visual feedback with no compilation or processing overhead.
 */
export class HtmlRuntimeAgent extends LocalRuntimeAgent {
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
    };
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
          console.log(`🤖 Discovering AI models for cell: ${cell.id}`);

          // Discover available AI models
          const models = await discoverAvailableAiModels();

          // Format models for display
          const modelsList = models
            .map(
              (model: AiModel) =>
                `<li><strong>${model.displayName}</strong> - ${model.provider} ${model.metadata?.description ? `(${model.metadata.description})` : ""}</li>`
            )
            .join("\n");

          const htmlOutput = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 16px; border: 1px solid #e1e5e9; border-radius: 8px; background: #f6f8fa;">
              <h3 style="margin-top: 0; color: #24292f;">Available AI Models</h3>
              <p style="color: #656d76; margin-bottom: 16px;">Found ${models.length} available model${models.length === 1 ? "" : "s"}:</p>
              <ul style="margin: 0; padding-left: 20px;">
                ${modelsList}
              </ul>
            </div>
          `;

          await context.display({
            "text/html": htmlOutput,
            "text/plain": `Available AI Models (${models.length}):\n${models.map((m: AiModel) => `- ${m.displayName} (${m.provider})`).join("\n")}`,
          });

          console.log(`✅ AI model discovery completed for cell: ${cell.id}`);
          return { success: true };
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          console.error(
            `❌ AI model discovery failed for cell: ${cell.id}`,
            error
          );

          context.error("AIModelDiscoveryError", errorMsg, [
            `Error discovering AI models for cell: ${cell.id}`,
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
}

/**
 * Factory function to create and start an HTML runtime agent
 */
export async function createHtmlAgent(
  config: LocalRuntimeConfig
): Promise<HtmlRuntimeAgent> {
  const agent = new HtmlRuntimeAgent(config);
  await agent.start();
  return agent;
}
