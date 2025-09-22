/**
 * HTML Runtime Agent
 *
 * A lightweight runtime agent that executes HTML code directly in the browser.
 * Provides immediate rendering of HTML content with no external dependencies.
 *
 * This serves as a reference implementation for building other runtime agents
 * and demonstrates the core patterns for local execution.
 */

import {
  RuntimeAgent,
  RuntimeConfig,
  type ExecutionHandler,
  type ExecutionContext,
  type RuntimeCapabilities,
} from "@runtimed/agent-core";
import type { Store } from "@runtimed/schema";

/**
 * Configuration options for HTML runtime agent
 */
export interface HtmlAgentConfig {
  /** LiveStore instance to use for synchronization */
  store: Store;
  /** Authentication token for API access */
  authToken: string;
  /** Notebook ID this agent will work with */
  notebookId: string;
  /** User ID for session identification */
  userId: string;
  /** Optional custom runtime ID (auto-generated if not provided) */
  runtimeId?: string;
  /** Optional sync URL (defaults to localhost:8787) */
  syncUrl?: string;
}

/**
 * HTML Runtime Agent
 *
 * Executes HTML code cells by rendering them directly through context.display().
 * Provides immediate visual feedback with no compilation or processing overhead.
 */
export class HtmlRuntimeAgent {
  private agent: RuntimeAgent | null = null;
  private config: HtmlAgentConfig;

  constructor(config: HtmlAgentConfig) {
    this.config = config;
  }

  /**
   * Start the HTML runtime agent
   */
  async start(): Promise<RuntimeAgent> {
    if (this.agent) {
      throw new Error("HTML agent is already running");
    }

    const runtimeConfig = new RuntimeConfig({
      runtimeId: this.config.runtimeId || this.generateRuntimeId(),
      runtimeType: "html",
      capabilities: this.getCapabilities(),
      syncUrl: this.config.syncUrl || "ws://localhost:8787",
      authToken: this.config.authToken,
      notebookId: this.config.notebookId,
      store: this.config.store,
      userId: this.config.userId,
    });

    this.agent = new RuntimeAgent(runtimeConfig, this.getCapabilities());

    // Register the HTML execution handler
    this.agent.onExecution(this.createExecutionHandler());

    // Start the agent
    await this.agent.start();

    console.log(`🌐 HTML runtime agent started successfully!`);
    console.log(`   Runtime ID: ${runtimeConfig.runtimeId}`);
    console.log(`   Session ID: ${this.agent.config.sessionId}`);

    return this.agent;
  }

  /**
   * Stop the HTML runtime agent
   */
  async stop(): Promise<void> {
    if (!this.agent) {
      throw new Error("HTML agent is not running");
    }

    await this.softShutdown(this.agent);
    this.agent = null;

    console.log("🛑 HTML runtime agent stopped (store preserved)");
  }

  /**
   * Get the current runtime agent instance
   */
  getAgent(): RuntimeAgent | null {
    return this.agent;
  }

  /**
   * Check if the agent is currently running
   */
  isRunning(): boolean {
    return this.agent !== null;
  }

  /**
   * Get status information about the agent
   */
  getStatus() {
    if (!this.agent) {
      return {
        running: false,
        runtimeId: null,
        sessionId: null,
        runtimeType: "html",
      };
    }

    return {
      running: true,
      runtimeId: this.agent.config.runtimeId,
      sessionId: this.agent.config.sessionId,
      runtimeType: this.agent.config.runtimeType,
    };
  }

  /**
   * Define capabilities for HTML runtime
   */
  private getCapabilities(): RuntimeCapabilities {
    return {
      canExecuteCode: true,
      canExecuteSql: false,
      canExecuteAi: false,
    };
  }

  /**
   * Generate a unique runtime ID
   */
  private generateRuntimeId(): string {
    return `html-local-${crypto.randomUUID()}`;
  }

  /**
   * Create the HTML execution handler
   */
  private createExecutionHandler(): ExecutionHandler {
    return async (context: ExecutionContext) => {
      const { cell } = context;

      console.log(`🔄 Executing HTML cell: ${cell.id}`);

      // Clear previous outputs
      context.clear();

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
          error: errorMsg
        };
      }
    };
  }

  /**
   * Soft shutdown that preserves the LiveStore instance
   * This is needed for local runtimes that share the store with the UI
   */
  private async softShutdown(agent: RuntimeAgent): Promise<void> {
    try {
      // Call onShutdown handler if present
      await agent.handlers?.onShutdown?.();

      // Unsubscribe from all reactive queries
      agent.subscriptions?.forEach((unsubscribe: () => void) => unsubscribe());
      agent.subscriptions = [];

      // Mark session as terminated
      try {
        const { events } = await import("@runtimed/schema");
        agent.store.commit(
          events.runtimeSessionTerminated({
            sessionId: agent.config.sessionId,
            reason: "shutdown",
          })
        );
      } catch (error) {
        console.warn("Failed to mark session as terminated:", error);
      }

      // Stop session renewal
      if (agent.renewalInterval) {
        clearInterval(agent.renewalInterval);
        agent.renewalInterval = undefined;
      }

      // Clean up shutdown handlers
      agent.cleanupShutdownHandlers?.();

      // Mark as shutting down
      agent.isShuttingDown = true;

      // NOTE: We deliberately do NOT call agent.store.shutdown()
      // because local runtimes share the store with the UI
    } catch (error) {
      console.error("Error during HTML agent soft shutdown:", error);
      throw error;
    }
  }
}

/**
 * Factory function to create and start an HTML runtime agent
 */
export async function createHtmlAgent(config: HtmlAgentConfig): Promise<HtmlRuntimeAgent> {
  const agent = new HtmlRuntimeAgent(config);
  await agent.start();
  return agent;
}

/**
 * Type guard to check if a runtime agent is an HTML agent
 */
export function isHtmlAgent(agent: any): agent is HtmlRuntimeAgent {
  return agent instanceof HtmlRuntimeAgent;
}
