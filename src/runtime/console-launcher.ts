/**
 * Console Runtime Launcher
 *
 * Simple utility for launching runtime agents via Chrome DevTools console.
 * No registry, no providers - just direct RuntimeAgent creation for experimentation.
 *
 * Usage in Chrome DevTools:
 *   window.__RUNT_LAUNCHER__.launchHtmlAgent()
 *   window.__RUNT_LAUNCHER__.getStatus()
 *   window.__RUNT_LAUNCHER__.shutdown()
 */

import { RuntimeAgent, RuntimeConfig } from "@runtimed/agent-core";
import type {
  ExecutionHandler,
  RuntimeCapabilities,
  ExecutionContext,
} from "@runtimed/agent-core";
import type { Store } from "@runtimed/schema";
import { sharedLiveStoreAdapter } from "../livestore/adapter.js";

// Global interface for console access
declare global {
  interface Window {
    __RUNT_LAUNCHER__?: {
      launchHtmlAgent: () => Promise<RuntimeAgent>;
      launchPythonAgent: () => Promise<RuntimeAgent>;
      getStatus: () => LauncherStatus;
      shutdown: () => Promise<void>;
      getCurrentNotebookId: () => string | null;
      setStore: (store: Store) => void;
      setAuth: (userId: string, authToken: string) => void;
      useExistingStore: (store: any) => void;
    };
  }
}

interface LauncherStatus {
  hasAgent: boolean;
  agentType: string | null;
  sessionId: string | null;
  notebookId: string | null;
  storeConnected: boolean;
  authConfigured: boolean;
  error: string | null;
}

class ConsoleLauncher {
  private currentAgent: RuntimeAgent | null = null;
  private store: Store | null = null;
  private existingStore: any = null;
  private userId: string | null = null;
  private authToken: string | null = null;
  private lastError: string | null = null;

  constructor() {
    console.log("🚀 Runt Console Launcher initialized");
    console.log("📖 Usage Guide:");
    console.log("  • Check status: window.__RUNT_LAUNCHER__.getStatus()");
    console.log(
      "  • Launch HTML agent: await window.__RUNT_LAUNCHER__.launchHtmlAgent()"
    );
    console.log(
      "  • Shutdown agent: await window.__RUNT_LAUNCHER__.shutdown()"
    );
    console.log("  • Debug auth: window.__RUNT_DEBUG__.debugAuth()");
    console.log(
      "💡 Navigate to a notebook page first, then try launching an agent!"
    );
  }

  setStore(store: Store): void {
    this.store = store;
    console.log("📦 LiveStore instance connected");
  }

  setAuth(userId: string, authToken: string): void {
    this.userId = userId;
    this.authToken = authToken;
    console.log("🔐 Authentication configured");
  }

  useExistingStore(store: any): void {
    this.existingStore = store;
    console.log("📦 Using existing LiveStore instance directly");
    console.log("🎯 Now try: await window.__RUNT_LAUNCHER__.launchHtmlAgent()");
  }

  getCurrentNotebookId(): string | null {
    // Extract notebook ID from current URL path like /nb/{id}
    const pathParts = window.location.pathname.split("/");
    const notebookIndex = pathParts.findIndex((part) => part === "nb");

    console.log("🔍 URL Debug:", {
      pathname: window.location.pathname,
      pathParts,
      notebookIndex,
      candidateId: pathParts[notebookIndex + 1],
    });

    if (notebookIndex !== -1 && pathParts[notebookIndex + 1]) {
      const notebookId = pathParts[notebookIndex + 1];
      console.log(`📝 Found notebook ID: ${notebookId}`);
      return notebookId;
    }

    console.log("❌ No notebook ID found in URL");
    return null;
  }

  private validatePrerequisites(): {
    notebookId: string;
    store: Store;
    userId: string;
    authToken: string;
  } {
    const notebookId = this.getCurrentNotebookId();
    if (!notebookId) {
      throw new Error(
        "No notebook ID found in URL. Navigate to a notebook first."
      );
    }

    if (!this.store) {
      throw new Error(
        "No LiveStore instance. Call setStore(store) first or ensure you are in a notebook page."
      );
    }

    if (!this.userId || !this.authToken) {
      throw new Error(
        "No authentication configured. Call setAuth(userId, authToken) first."
      );
    }

    return {
      notebookId,
      store: this.store,
      userId: this.userId,
      authToken: this.authToken,
    };
  }

  private createHtmlExecutionHandler(): ExecutionHandler {
    return async (context: ExecutionContext) => {
      const { cell } = context;

      console.log(`🔄 Executing HTML cell: ${cell.id}`);

      // Clear previous outputs
      context.clear();

      if (cell.cellType !== "code") {
        return {
          success: false,
          error: "HTML handler only supports code cells",
        };
      }

      try {
        // Display HTML content using context.display()
        await context.display({
          "text/html": cell.source,
          "text/plain": cell.source,
        });

        console.log(`✅ HTML execution completed for cell: ${cell.id}`);
        return { success: true };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`❌ HTML execution failed for cell: ${cell.id}`, error);

        context.error("HTMLError", errorMsg, []);
        return { success: false, error: errorMsg };
      }
    };
  }

  private createPythonExecutionHandler(): ExecutionHandler {
    return async (_context: ExecutionContext) => {
      // Placeholder - Python execution would delegate to external agent
      console.log(
        "🐍 Python execution handler called - this would delegate to external agent"
      );
      return { success: true };
    };
  }

  async launchHtmlAgent(): Promise<RuntimeAgent> {
    try {
      this.lastError = null;

      if (this.currentAgent) {
        console.log("🔄 Shutting down existing agent...");
        await this.currentAgent.shutdown();
      }

      const { notebookId, userId, authToken } = this.validatePrerequisites();

      console.log(
        `🚀 Launching HTML runtime agent for notebook: ${notebookId}`
      );

      const capabilities: RuntimeCapabilities = {
        canExecuteCode: true,
        canExecuteSql: false,
        canExecuteAi: false,
      };

      const config = new RuntimeConfig({
        runtimeId: `console-html-${crypto.randomUUID()}`,
        runtimeType: "html",
        capabilities,
        syncUrl: "ws://localhost:8787", // Dev sync server
        authToken,
        notebookId,
        store: this.existingStore, // Use existing store if available
        adapter: this.existingStore ? undefined : sharedLiveStoreAdapter,
        userId,
      });

      const agent = new RuntimeAgent(config, capabilities);

      // Register HTML execution handler
      agent.onExecution(this.createHtmlExecutionHandler());

      // Start the agent
      await agent.start();

      this.currentAgent = agent;

      console.log(`✅ HTML runtime agent started successfully!`);
      console.log(`   Runtime ID: ${config.runtimeId}`);
      console.log(`   Session ID: ${agent.config.sessionId}`);
      console.log(`   Notebook ID: ${notebookId}`);

      return agent;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      console.error("❌ Failed to launch HTML agent:", error);
      throw error;
    }
  }

  async launchPythonAgent(): Promise<RuntimeAgent> {
    try {
      this.lastError = null;

      if (this.currentAgent) {
        console.log("🔄 Shutting down existing agent...");
        await this.currentAgent.shutdown();
      }

      const { notebookId, userId, authToken } = this.validatePrerequisites();

      console.log(
        `🚀 Launching Python runtime agent for notebook: ${notebookId}`
      );

      const capabilities: RuntimeCapabilities = {
        canExecuteCode: true,
        canExecuteSql: true,
        canExecuteAi: true,
        availableAiModels: [
          {
            name: "gpt-4o-mini",
            displayName: "GPT-4o Mini",
            provider: "openai",
            capabilities: ["completion", "tools", "vision"],
          },
        ],
      };

      const config = new RuntimeConfig({
        runtimeId: `console-python-${crypto.randomUUID()}`,
        runtimeType: "python",
        capabilities,
        syncUrl: "ws://localhost:8787",
        authToken,
        notebookId,
        adapter: sharedLiveStoreAdapter,
        userId,
      });

      const agent = new RuntimeAgent(config, capabilities);

      // Register Python execution handler (placeholder)
      agent.onExecution(this.createPythonExecutionHandler());

      await agent.start();

      this.currentAgent = agent;

      console.log(`✅ Python runtime agent started successfully!`);
      console.log(`   Runtime ID: ${config.runtimeId}`);
      console.log(`   Session ID: ${agent.config.sessionId}`);
      console.log(`   Notebook ID: ${notebookId}`);

      return agent;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      console.error("❌ Failed to launch Python agent:", error);
      throw error;
    }
  }

  getStatus(): LauncherStatus {
    return {
      hasAgent: !!this.currentAgent,
      agentType: this.currentAgent?.config.runtimeType || null,
      sessionId: this.currentAgent?.config.sessionId || null,
      notebookId: this.getCurrentNotebookId(),
      storeConnected: !!this.store,
      authConfigured: !!(this.userId && this.authToken),
      error: this.lastError,
    };
  }

  async shutdown(): Promise<void> {
    if (this.currentAgent) {
      console.log("🛑 Shutting down runtime agent...");
      await this.currentAgent.shutdown();
      this.currentAgent = null;
      console.log("✅ Runtime agent shut down");
    } else {
      console.log("ℹ️ No active runtime agent to shutdown");
    }
  }
}

// Create singleton instance and expose on window
const launcher = new ConsoleLauncher();

if (typeof window !== "undefined") {
  window.__RUNT_LAUNCHER__ = {
    launchHtmlAgent: () => launcher.launchHtmlAgent(),
    launchPythonAgent: () => launcher.launchPythonAgent(),
    getStatus: () => launcher.getStatus(),
    shutdown: () => launcher.shutdown(),
    getCurrentNotebookId: () => launcher.getCurrentNotebookId(),
    setStore: (store: Store) => launcher.setStore(store),
    setAuth: (userId: string, authToken: string) =>
      launcher.setAuth(userId, authToken),
    useExistingStore: (store: any) => launcher.useExistingStore(store),
  };
}

export { launcher as consoleLauncher };
