/**
 * HTML Runtime Implementation
 *
 * Browser-based HTML runtime that renders HTML content directly.
 * Integrates with LiveStore for execution queue management and state sync.
 */

import { nanoid } from "nanoid";
import { events, tables, queryDb } from "@runtimed/schema";
import type { LiveStore } from "./types.js";
import { BaseRuntime } from "./BaseRuntime.js";
import type {
  LocalRuntime,
  RuntimeMetadata,
  RuntimeCapabilities,
  RuntimeConfiguration,
} from "./types.js";

export interface HtmlRuntimeConfig extends RuntimeConfiguration {
  /** LiveStore instance for event management */
  store: LiveStore;
  /** User ID for authentication */
  userId: string;
}

export class HtmlRuntime extends BaseRuntime implements LocalRuntime {
  public readonly metadata: RuntimeMetadata & { isLocal: true };
  private store: LiveStore | null = null;
  // userId is used for runtime session events and authentication
  // It's set in doStart() and used in displaceExistingRuntimes()
  private userId: string | null = null;
  private subscriptions: (() => void)[] = [];

  constructor(config: Partial<HtmlRuntimeConfig> = {}) {
    const metadata: RuntimeMetadata & { isLocal: true } = {
      id: "html-runtime",
      name: "HTML Agent",
      description: "Browser-based HTML rendering",
      icon: "🌐",
      type: "html",
      version: "1.0.0",
      isLocal: true,
      isAvailable: true,
      priority: 100, // High priority for local runtime
    };

    const capabilities: RuntimeCapabilities = {
      canExecuteCode: true,
      canExecuteSql: false,
      canExecuteAi: false,
      supportedLanguages: ["html"],
      supportsInterruption: false,
      supportsRestart: true,
    };

    super(metadata, capabilities, config);
    this.metadata = metadata;
  }

  protected async doStart(
    notebookId: string,
    config: RuntimeConfiguration
  ): Promise<void> {
    const htmlConfig = config as HtmlRuntimeConfig;

    if (!htmlConfig.store) {
      throw new Error("LiveStore instance is required for HTML runtime");
    }

    if (!htmlConfig.userId) {
      throw new Error("User ID is required for HTML runtime");
    }

    this.store = htmlConfig.store;
    this.userId = htmlConfig.userId;

    // Displace any existing active runtime sessions for this notebook
    await this.displaceExistingRuntimes();

    // Register runtime session with LiveStore
    const { sessionId } = this.getState();
    if (!sessionId) {
      throw new Error("Session ID not generated");
    }

    this.store.commit(
      events.runtimeSessionStarted({
        sessionId,
        runtimeId: this.getState().runtimeId!,
        runtimeType: "html",
        capabilities: this.capabilities,
      })
    );

    // Mark session as ready
    this.store.commit(
      events.runtimeSessionStatusChanged({
        sessionId,
        status: "ready",
      })
    );

    // Start execution polling loop
    this.startExecutionLoop();

    console.log(
      `🌐 HTML Runtime started for notebook ${notebookId} (user: ${this.userId})`
    );
  }

  protected async doStop(): Promise<void> {
    // Clean up polling interval
    this.subscriptions.forEach((cleanup) => cleanup());
    this.subscriptions = [];

    // Terminate runtime session
    const { sessionId } = this.getState();
    if (this.store && sessionId) {
      this.store.commit(
        events.runtimeSessionTerminated({
          sessionId,
          reason: "shutdown",
        })
      );
    }

    this.store = null;
    this.userId = null;

    console.log("🛑 HTML Runtime stopped");
  }

  async executeCode(cellId: string, code: string): Promise<void> {
    this.validateStarted();

    if (!this.store) {
      throw new Error("Store not available");
    }

    console.log(`🔄 Executing HTML code for cell ${cellId}`);

    try {
      this.setBusy();

      // Store HTML output directly in outputs table
      this.store.commit(
        events.multimediaResultOutputAdded({
          id: nanoid(),
          cellId,
          position: 0,
          representations: {
            "text/html": {
              type: "inline",
              data: code,
              metadata: {},
            },
          },
          executionCount: 1, // HTML doesn't have execution counts like Python
        })
      );

      this.setReady();
      console.log(`✅ HTML execution completed for cell ${cellId}`);
    } catch (error) {
      this.setError(error instanceof Error ? error.message : String(error));

      // Store error output
      this.store.commit(
        events.errorOutputAdded({
          id: nanoid(),
          cellId,
          position: 0,
          content: {
            type: "inline",
            data: `Error: ${error instanceof Error ? error.message : String(error)}`,
            metadata: {},
          },
        })
      );

      throw error;
    }
  }

  private async displaceExistingRuntimes(): Promise<void> {
    if (!this.store) return;

    const activeRuntimeSessions = this.store.query(
      queryDb(tables.runtimeSessions.select().where({ isActive: true }))
    );

    for (const session of activeRuntimeSessions) {
      console.log(`🔄 Displacing runtime session: ${session.sessionId}`);
      this.store.commit(
        events.runtimeSessionTerminated({
          sessionId: session.sessionId,
          reason: "displaced",
        })
      );
    }
  }

  private startExecutionLoop(): void {
    if (!this.store) return;

    // Simple polling approach that works correctly with React LiveStore
    const pollInterval = setInterval(() => {
      try {
        if (!this.isActiveAndReady()) return;

        this.processExecutionQueue();
      } catch (error) {
        console.error("Error in HTML runtime execution loop:", error);
        this.setError(error instanceof Error ? error.message : String(error));
      }
    }, 50); // Fast 50ms polling for responsive HTML execution

    // Store cleanup function
    this.subscriptions.push(() => clearInterval(pollInterval));
  }

  private processExecutionQueue(): void {
    if (!this.store || !this.isActiveAndReady()) return;

    const { sessionId } = this.getState();
    if (!sessionId) return;

    // Get pending work to claim
    const pendingWork = this.store.query(
      queryDb(
        tables.executionQueue
          .select()
          .where({ status: "pending" })
          .orderBy("id", "asc")
      )
    );

    // Claim first pending execution
    const firstPending = pendingWork[0];
    if (firstPending && firstPending.status === "pending") {
      this.store.commit(
        events.executionAssigned({
          queueId: firstPending.id,
          runtimeSessionId: sessionId,
        })
      );
    }

    // Process assigned work
    const assignedWork = this.store.query(
      queryDb(
        tables.executionQueue
          .select()
          .where({ status: "assigned", assignedRuntimeSession: sessionId })
          .orderBy("id", "asc")
      )
    );

    assignedWork.forEach(async (execution) => {
      try {
        await this.processExecution(execution);
      } catch (error) {
        console.error(`Error processing execution ${execution.id}:`, error);
      }
    });
  }

  private async processExecution(execution: {
    id: string;
    cellId: string;
    status: string;
    executionCount: number;
  }): Promise<void> {
    if (!this.store) return;

    const { sessionId } = this.getState();
    if (!sessionId) return;

    console.log(`🔄 Processing HTML execution: ${execution.id}`);

    const startTime = performance.now();
    try {
      this.setBusy();

      // Mark execution as started
      this.store.commit(
        events.executionStarted({
          queueId: execution.id,
          cellId: execution.cellId,
          runtimeSessionId: sessionId,
          startedAt: new Date(),
        })
      );

      // Get cell content
      const cells = this.store.query(queryDb(tables.cells.select()));
      const cell = cells.find((c: any) => c.id === execution.cellId);
      const cellContent = cell?.source || "";

      // Execute the HTML code
      await this.executeCode(execution.cellId, cellContent);

      // Mark execution as completed
      const executionDurationMs = Math.round(performance.now() - startTime);
      this.store.commit(
        events.executionCompleted({
          queueId: execution.id,
          cellId: execution.cellId,
          status: "success",
          completedAt: new Date(),
          executionDurationMs,
        })
      );

      this.setReady();
      console.log(`✅ HTML execution completed: ${execution.id}`);
    } catch (error) {
      console.error(`❌ HTML execution failed: ${execution.id}`, error);

      // Mark execution as failed
      const executionDurationMs = Math.round(performance.now() - startTime);
      this.store.commit(
        events.executionCompleted({
          queueId: execution.id,
          cellId: execution.cellId,
          status: "error",
          completedAt: new Date(),
          executionDurationMs,
        })
      );

      this.setError(error instanceof Error ? error.message : String(error));
    }
  }

  // Additional HTML-specific methods
  getSetupInstructions(): string | null {
    return null; // No setup required for browser-based runtime
  }

  // Override restart to handle HTML-specific cleanup
  async restart(config?: RuntimeConfiguration): Promise<void> {
    console.log("🔄 Restarting HTML Runtime");

    // Store current configuration to merge with new config
    const currentConfig = this.getConfiguration();
    const mergedConfig = { ...currentConfig, ...config };

    await super.restart(mergedConfig);
  }
}
