/**
 * Simplified HTML Runtime Agent for Anode
 *
 * An in-browser runtime agent that takes code cell content and renders it as HTML output.
 * Uses the shared LiveStore adapter for real-time collaboration.
 */

import { makePersistedAdapter } from "@livestore/adapter-web";
import LiveStoreSharedWorker from "@livestore/adapter-web/shared-worker?sharedworker";
import LiveStoreWorker from "../livestore/livestore.worker?worker";
import {
  events,
  tables,
  queryDb,
  createStorePromise,
  schema,
  type Store,
} from "@runtimed/schema";
import { nanoid } from "nanoid";

export interface HtmlRuntimeOptions {
  /** The notebook ID to connect to */
  notebookId: string;
  /** Auth token for authentication */
  authToken: string;
  /** Runtime ID (defaults to generated ID) */
  runtimeId?: string;
  /** Whether to auto-start the runtime */
  autoStart?: boolean;
}

export class HtmlRuntimeAgent {
  private store: Store | null = null;
  private sessionId: string;
  private runtimeId: string;
  private notebookId: string;
  private authToken: string;
  private isActive = false;
  private processedExecutions = new Set<string>();
  private subscriptions: (() => void)[] = [];

  constructor(options: HtmlRuntimeOptions) {
    this.notebookId = options.notebookId;
    this.authToken = options.authToken;
    this.runtimeId = options.runtimeId || `html-runtime-${nanoid()}`;
    this.sessionId = `${this.runtimeId}-${Date.now()}`;

    if (options.autoStart) {
      this.start().catch(console.error);
    }
  }

  /**
   * Start the HTML runtime agent
   */
  async start(): Promise<void> {
    if (this.isActive) {
      return;
    }

    try {
      console.log("🔧 Creating runtime adapter...");
      // Create dedicated adapter for runtime agent to avoid conflicts
      const runtimeAdapter = makePersistedAdapter({
        storage: { type: "opfs" },
        worker: LiveStoreWorker,
        sharedWorker: LiveStoreSharedWorker,
        resetPersistence: false, // Runtime agents don't need persistence reset
      });

      console.log("🔌 Connecting to LiveStore...", {
        notebookId: this.notebookId,
        runtimeId: this.runtimeId,
        sessionId: this.sessionId,
      });

      // Create LiveStore connection using dedicated runtime adapter
      this.store = await createStorePromise({
        adapter: runtimeAdapter,
        schema,
        storeId: this.notebookId,
        syncPayload: {
          authToken: this.authToken,
          runtime: true, // Mark as runtime/service client
        },
      });

      console.log("✅ HTML Runtime Agent connected to LiveStore");

      console.log("📝 Registering runtime session...");
      // Register runtime session
      await this.registerRuntimeSession();

      console.log("👂 Setting up execution listener...");
      // Set up execution listener
      this.setupExecutionListener();

      this.isActive = true;
      console.log("🚀 HTML Runtime Agent started successfully");
    } catch (error) {
      console.error("❌ Failed to start HTML Runtime Agent:", error);
      console.error("❌ Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Stop the runtime agent
   */
  async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    // Clean up subscriptions
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions = [];

    // Send termination event
    if (this.store) {
      this.store.commit(
        events.runtimeSessionTerminated({
          sessionId: this.sessionId,
          reason: "shutdown",
        })
      );
    }

    console.log("🛑 HTML Runtime Agent stopped");
  }

  /**
   * Register this runtime session with the notebook
   */
  private async registerRuntimeSession(): Promise<void> {
    if (!this.store) {
      throw new Error("Store not initialized");
    }

    // Displace any existing active sessions
    const existingSessions = this.store.query(
      queryDb(tables.runtimeSessions.select().where({ isActive: true }))
    );

    for (const session of existingSessions) {
      this.store.commit(
        events.runtimeSessionTerminated({
          sessionId: session.sessionId,
          reason: "displaced",
        })
      );
    }

    // Register new session
    this.store.commit(
      events.runtimeSessionStarted({
        sessionId: this.sessionId,
        runtimeId: this.runtimeId,
        runtimeType: "html",
        capabilities: {
          canExecuteCode: true,
          canExecuteSql: false,
          canExecuteAi: false,
          availableAiModels: null,
        },
      })
    );

    // Update status to ready
    this.store.commit(
      events.runtimeSessionStatusChanged({
        sessionId: this.sessionId,
        status: "ready",
      })
    );
  }

  /**
   * Set up listener for execution requests
   */
  private setupExecutionListener(): void {
    if (!this.store) {
      throw new Error("Store not initialized");
    }

    // Watch for pending executions to claim
    const pendingExecutions$ = queryDb(
      tables.executionQueue
        .select()
        .where({ status: "pending" })
        .orderBy("id", "asc"),
      { label: "html.pendingExecutions" }
    );

    // Watch for executions assigned to this runtime
    const assignedExecutions$ = queryDb(
      tables.executionQueue
        .select()
        .where({
          status: "assigned",
          assignedRuntimeSession: this.sessionId,
        })
        .orderBy("id", "asc"),
      { label: "html.assignedExecutions" }
    );

    // Pick up pending executions and assign them to this runtime
    const pendingSub = this.store.subscribe(pendingExecutions$, {
      onUpdate: (executions) => {
        if (executions.length > 0 && this.isActive) {
          // Assign the first pending execution to this runtime
          const execution = executions[0];
          if (execution && !this.processedExecutions.has(execution.id)) {
            this.store!.commit(
              events.executionAssigned({
                queueId: execution.id,
                runtimeSessionId: this.sessionId,
              })
            );
          }
        }
      },
    });

    // Process assigned executions
    const assignedSub = this.store.subscribe(assignedExecutions$, {
      onUpdate: (executions) => {
        for (const execution of executions) {
          if (!this.processedExecutions.has(execution.id)) {
            this.processedExecutions.add(execution.id);
            this.handleExecution(execution).catch(console.error);
          }
        }
      },
    });

    // Store subscriptions for cleanup
    this.subscriptions.push(pendingSub, assignedSub);
  }

  /**
   * Handle a single execution request
   */
  private async handleExecution(execution: any): Promise<void> {
    if (!this.store || !this.isActive) {
      return;
    }

    try {
      console.log("🔄 Processing execution:", execution.id);

      // Get the cell to execute
      const cells = this.store.query(
        queryDb(tables.cells.select().where({ id: execution.cellId }))
      );

      const cell = cells[0];
      if (!cell) {
        throw new Error(`Cell ${execution.cellId} not found`);
      }

      const startTime = Date.now();

      // Start execution
      this.store.commit(
        events.executionStarted({
          queueId: execution.id,
          cellId: execution.cellId,
          runtimeSessionId: this.sessionId,
          startedAt: new Date(),
        })
      );

      // Update runtime status to busy
      this.store.commit(
        events.runtimeSessionStatusChanged({
          sessionId: this.sessionId,
          status: "busy",
        })
      );

      // Clear existing outputs
      this.store.commit(
        events.cellOutputsCleared({
          cellId: execution.cellId,
          wait: false,
          clearedBy: this.runtimeId,
        })
      );

      // Process the HTML content
      await this.executeHtmlCell(cell, execution.executionCount);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Mark execution as completed
      this.store.commit(
        events.executionCompleted({
          queueId: execution.id,
          cellId: execution.cellId,
          status: "success",
          completedAt: new Date(),
          executionDurationMs: duration,
        })
      );

      // Update runtime status back to ready
      this.store.commit(
        events.runtimeSessionStatusChanged({
          sessionId: this.sessionId,
          status: "ready",
        })
      );

      console.log("✅ Execution completed:", execution.id, `(${duration}ms)`);
    } catch (error) {
      console.error("❌ Execution failed:", error);

      // Mark execution as failed
      this.store.commit(
        events.executionCompleted({
          queueId: execution.id,
          cellId: execution.cellId,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
          executionDurationMs: 0,
        })
      );

      // Add error output
      this.store.commit(
        events.errorOutputAdded({
          id: nanoid(),
          cellId: execution.cellId,
          position: 0,
          content: {
            type: "inline",
            data: {
              ename: "HtmlRuntimeError",
              evalue: error instanceof Error ? error.message : String(error),
              traceback:
                error instanceof Error && error.stack ? [error.stack] : [],
            },
          },
        })
      );

      // Update runtime status back to ready
      this.store.commit(
        events.runtimeSessionStatusChanged({
          sessionId: this.sessionId,
          status: "ready",
        })
      );
    }
  }

  /**
   * Execute an HTML cell - render the HTML as output
   */
  private async executeHtmlCell(
    cell: any,
    executionCount: number
  ): Promise<void> {
    if (!this.store) {
      return;
    }

    const htmlSource = cell.source || "";

    // Validate HTML (basic check)
    if (htmlSource.trim() === "") {
      // Empty cell - add a simple text output
      this.store.commit(
        events.multimediaResultOutputAdded({
          id: nanoid(),
          cellId: cell.id,
          position: 0,
          executionCount,
          representations: {
            "text/plain": {
              type: "inline",
              data: "(empty)",
            },
          },
        })
      );
      return;
    }

    // Create multimedia result output with the HTML
    this.store.commit(
      events.multimediaResultOutputAdded({
        id: nanoid(),
        cellId: cell.id,
        position: 0,
        executionCount,
        representations: {
          "text/html": {
            type: "inline",
            data: htmlSource,
          },
          "text/plain": {
            type: "inline",
            data: `HTML content (${htmlSource.length} characters)`,
          },
        },
      })
    );

    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  /**
   * Get runtime status information
   */
  getStatus() {
    return {
      isActive: this.isActive,
      runtimeId: this.runtimeId,
      sessionId: this.sessionId,
      notebookId: this.notebookId,
    };
  }
}

/**
 * Create and start an HTML runtime agent
 */
export async function createHtmlRuntime(
  options: HtmlRuntimeOptions
): Promise<HtmlRuntimeAgent> {
  const agent = new HtmlRuntimeAgent(options);
  await agent.start();
  return agent;
}
