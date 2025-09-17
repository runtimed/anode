/**
 * HTML Runtime Manager
 *
 * Store-based HTML runtime management that uses the existing LiveStore connection.
 * Sits below the LiveStore provider and manages HTML runtime for the current notebook.
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useStore, useQuery } from "@livestore/react";
import { events, tables, queryDb } from "@runtimed/schema";
import { nanoid } from "nanoid";
import { useAuth } from "../../auth/index.js";

export interface HtmlRuntimeState {
  isActive: boolean;
  isStarting: boolean;
  isStopping: boolean;
  error: string | null;
  runtimeId: string | null;
  sessionId: string | null;
}

export interface HtmlRuntimeContextType {
  runtimeState: HtmlRuntimeState;
  startRuntime: () => Promise<void>;
  stopRuntime: () => Promise<void>;
  restartRuntime: () => Promise<void>;
}

const HtmlRuntimeContext = createContext<HtmlRuntimeContextType | null>(null);

export const useHtmlRuntime = (): HtmlRuntimeContextType => {
  const context = useContext(HtmlRuntimeContext);
  if (!context) {
    throw new Error("useHtmlRuntime must be used within HtmlRuntimeManager");
  }
  return context;
};

const DEFAULT_RUNTIME_STATE: HtmlRuntimeState = {
  isActive: false,
  isStarting: false,
  isStopping: false,
  error: null,
  runtimeId: null,
  sessionId: null,
};

interface HtmlRuntimeManagerProps {
  notebookId: string;
  children: ReactNode;
}

export const HtmlRuntimeManager: React.FC<HtmlRuntimeManagerProps> = ({
  notebookId,
  children,
}) => {
  const { store } = useStore();
  const { isAuthenticated } = useAuth();
  const [runtimeState, setRuntimeState] = useState<HtmlRuntimeState>(
    DEFAULT_RUNTIME_STATE
  );

  // Query for pending work to claim
  const pendingWork = useQuery(
    queryDb(
      tables.executionQueue
        .select()
        .where({ status: "pending" })
        .orderBy("id", "asc")
    )
  );

  // Query for work assigned to this runtime
  const assignedWork = useQuery(
    queryDb(
      tables.executionQueue
        .select()
        .where({ status: "assigned" })
        .orderBy("id", "asc")
    )
  );

  // Query for cells to get source content
  const cells = useQuery(queryDb(tables.cells.select()));

  // Query for active runtime sessions (to track displacement)
  const activeRuntimeSessions = useQuery(
    queryDb(tables.runtimeSessions.select().where({ isActive: true }))
  );

  // Generate stable runtime and session IDs
  const runtimeId = React.useMemo(() => `html-runtime-${nanoid()}`, []);
  const sessionId = React.useMemo(
    () => `${runtimeId}-${Date.now()}`,
    [runtimeId]
  );

  // Claim pending work
  useEffect(() => {
    if (!runtimeState.isActive) return;

    // Try to claim first pending execution
    const firstPending = pendingWork[0];
    if (firstPending && firstPending.status === "pending") {
      store.commit(
        events.executionAssigned({
          queueId: firstPending.id,
          runtimeSessionId: sessionId,
        })
      );
    }
  }, [pendingWork, runtimeState.isActive, sessionId, store]);

  // Process assigned work
  useEffect(() => {
    if (!runtimeState.isActive) return;

    const ourAssignedWork = assignedWork.filter(
      (exec) => exec.assignedRuntimeSession === sessionId
    );

    ourAssignedWork.forEach(async (execution) => {
      console.log("🔄 Processing HTML execution:", execution.id);

      try {
        // Mark execution as started
        store.commit(
          events.executionStarted({
            queueId: execution.id,
            cellId: execution.cellId,
            runtimeSessionId: sessionId,
            startedAt: new Date(),
          })
        );

        // Get cell content
        const cell = cells.find((c) => c.id === execution.cellId);
        const cellContent = cell?.source || "";

        // Simple HTML rendering - just wrap content in HTML structure
        const htmlOutput = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>HTML Cell Output</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 20px;
      line-height: 1.6;
    }
    pre { background: #f5f5f5; padding: 10px; border-radius: 4px; }
    code { background: #f0f0f0; padding: 2px 4px; border-radius: 2px; }
  </style>
</head>
<body>
  ${cellContent}
</body>
</html>`;

        // Store HTML output directly in outputs table
        store.commit(
          events.multimediaResultOutputAdded({
            id: nanoid(),
            cellId: execution.cellId,
            position: 0,
            representations: {
              "text/html": {
                type: "inline",
                data: htmlOutput,
                metadata: {},
              },
            },
            executionCount: execution.executionCount,
          })
        );

        // Mark execution as completed
        store.commit(
          events.executionCompleted({
            queueId: execution.id,
            cellId: execution.cellId,
            status: "success",
            completedAt: new Date(),
            executionDurationMs: 100, // Simple fixed duration for HTML rendering
          })
        );

        console.log("✅ HTML execution completed:", execution.id);
      } catch (error) {
        console.error("❌ HTML execution failed:", error);

        // Store error output
        store.commit(
          events.errorOutputAdded({
            id: nanoid(),
            cellId: execution.cellId,
            position: 0,
            content: {
              type: "inline",
              data: `Error: ${error instanceof Error ? error.message : String(error)}`,
              metadata: {},
            },
          })
        );

        // Mark execution as failed
        store.commit(
          events.executionCompleted({
            queueId: execution.id,
            cellId: execution.cellId,
            status: "error",
            completedAt: new Date(),
            executionDurationMs: 0,
          })
        );
      }
    });
  }, [assignedWork, cells, runtimeState.isActive, sessionId, store]);

  const startRuntime = useCallback(async () => {
    if (!isAuthenticated) {
      setRuntimeState((prev) => ({ ...prev, error: "Not authenticated" }));
      return;
    }

    if (runtimeState.isActive || runtimeState.isStarting) {
      return;
    }

    setRuntimeState((prev) => ({
      ...prev,
      isStarting: true,
      error: null,
    }));

    try {
      console.log("🚀 Starting HTML Runtime Manager", {
        notebookId,
        runtimeId,
        sessionId,
      });

      // Displace any existing active runtime sessions for this notebook
      for (const session of activeRuntimeSessions) {
        store.commit(
          events.runtimeSessionTerminated({
            sessionId: session.sessionId,
            reason: "displaced",
          })
        );
      }

      // Register runtime session
      store.commit(
        events.runtimeSessionStarted({
          sessionId,
          runtimeId,
          runtimeType: "html",
          capabilities: {
            canExecuteCode: true,
            canExecuteSql: false,
            canExecuteAi: false,
          },
        })
      );

      // Mark session as ready
      store.commit(
        events.runtimeSessionStatusChanged({
          sessionId,
          status: "ready",
        })
      );

      setRuntimeState({
        isActive: true,
        isStarting: false,
        isStopping: false,
        error: null,
        runtimeId,
        sessionId,
      });

      console.log("✅ HTML Runtime Manager started successfully");
    } catch (error) {
      console.error("❌ Failed to start HTML Runtime Manager:", error);

      setRuntimeState((prev) => ({
        ...prev,
        isStarting: false,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, [
    isAuthenticated,
    runtimeState.isActive,
    runtimeState.isStarting,
    notebookId,
    runtimeId,
    sessionId,
    store,
    activeRuntimeSessions,
  ]);

  const stopRuntime = useCallback(async () => {
    if (!runtimeState.isActive || runtimeState.isStopping) {
      return;
    }

    setRuntimeState((prev) => ({
      ...prev,
      isStopping: true,
    }));

    try {
      console.log("🛑 Stopping HTML Runtime Manager", { sessionId });

      // Send termination event
      store.commit(
        events.runtimeSessionTerminated({
          sessionId,
          reason: "shutdown",
        })
      );

      setRuntimeState(DEFAULT_RUNTIME_STATE);
      console.log("✅ HTML Runtime Manager stopped");
    } catch (error) {
      console.error("❌ Failed to stop HTML Runtime Manager:", error);

      setRuntimeState((prev) => ({
        ...prev,
        isStopping: false,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, [runtimeState.isActive, runtimeState.isStopping, sessionId, store]);

  const restartRuntime = useCallback(async () => {
    console.log("🔄 Restarting HTML Runtime Manager");
    await stopRuntime();
    // Small delay to ensure cleanup
    setTimeout(() => {
      startRuntime().catch(console.error);
    }, 100);
  }, [stopRuntime, startRuntime]);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      if (runtimeState.isActive) {
        stopRuntime().catch(console.error);
      }
    };
  }, [runtimeState.isActive, stopRuntime]);

  // Auto-stop runtime if user logs out
  useEffect(() => {
    if (!isAuthenticated && runtimeState.isActive) {
      console.log("🔐 User logged out, stopping HTML runtime");
      stopRuntime().catch(console.error);
    }
  }, [isAuthenticated, runtimeState.isActive, stopRuntime]);

  const contextValue: HtmlRuntimeContextType = {
    runtimeState,
    startRuntime,
    stopRuntime,
    restartRuntime,
  };

  return (
    <HtmlRuntimeContext.Provider value={contextValue}>
      {children}
    </HtmlRuntimeContext.Provider>
  );
};
