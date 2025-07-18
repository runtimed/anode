import { queryDb } from "@livestore/livestore";
import { useStore } from "@livestore/react";
import { CellData, events, RuntimeSessionData, tables } from "@runt/schema";
import React, { Suspense, useCallback } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { NotebookTitle } from "./NotebookTitle.js";
import { VirtualizedCellList } from "./VirtualizedCellList.js";

import { Avatar } from "@/components/ui/Avatar.js";
import { Button } from "@/components/ui/button";

import { useCurrentUserId } from "@/hooks/useCurrentUser.js";
import { useUserRegistry } from "@/hooks/useUserRegistry.js";
import { getRuntimeCommand } from "@/util/runtime-command.js";
import { getCurrentNotebookId } from "@/util/store-id.js";
import { generateColor } from "@/util/avatar.js";
import {
  Bot,
  Bug,
  BugOff,
  Circle,
  Code,
  Copy,
  Database,
  FileText,
  Filter,
  Square,
  Terminal,
  X,
} from "lucide-react";
import { UserProfile } from "../auth/UserProfile.js";

// Lazy import DebugPanel only in development
const LazyDebugPanel = React.lazy(() =>
  import("./DebugPanel.js").then((module) => ({
    default: module.DebugPanel,
  }))
);

// Import prefetch utilities
import { prefetchOutputsAdaptive } from "@/util/prefetch.js";
import { MobileOmnibar } from "./MobileOmnibar.js";
import { CellAdder } from "./cell/CellAdder.js";

interface NotebookViewerProps {
  notebookId: string;
  debugMode?: boolean;
  onDebugToggle?: (enabled: boolean) => void;
}

export const NotebookViewer: React.FC<NotebookViewerProps> = ({
  debugMode = false,
  onDebugToggle,
}) => {
  const { store } = useStore();
  const currentUserId = useCurrentUserId();
  const { presentUsers, getUserInfo } = useUserRegistry();

  const cells = store.useQuery(
    queryDb(tables.cells.select().orderBy("position", "asc"))
  ) as CellData[];
  const metadata = store.useQuery(queryDb(tables.notebookMetadata.select()));
  const runtimeSessions = store.useQuery(
    queryDb(tables.runtimeSessions.select().where({ isActive: true }))
  ) as RuntimeSessionData[];
  // Get all runtime sessions for debug panel
  const allRuntimeSessions = store.useQuery(
    queryDb(tables.runtimeSessions.select())
  ) as RuntimeSessionData[];
  // Get execution queue for debug panel
  const executionQueue = store.useQuery(
    queryDb(tables.executionQueue.select().orderBy("id", "desc"))
  ) as any[];
  const [showRuntimeHelper, setShowRuntimeHelper] = React.useState(false);
  const [focusedCellId, setFocusedCellId] = React.useState<string | null>(null);
  const [contextSelectionMode, setContextSelectionMode] = React.useState(false);
  const hasEverFocusedRef = React.useRef(false);

  const currentNotebookId = getCurrentNotebookId();
  const runtimeCommand = getRuntimeCommand(currentNotebookId);

  // Check runtime status
  const getRuntimeHealth = (session: RuntimeSessionData) => {
    if (session.status === "starting") {
      // If session is starting, it's connecting
      return session.isActive ? "connecting" : "unknown";
    }
    if (!session.isActive) {
      return "disconnected";
    }
    // For active sessions, use status to determine health
    switch (session.status) {
      case "ready":
      case "busy":
        return "healthy";
      case "restarting":
        return "warning";
      case "terminated":
        return "disconnected";
      default:
        return "unknown";
    }
  };

  const activeRuntime = runtimeSessions.find(
    (session: RuntimeSessionData) =>
      session.status === "ready" || session.status === "busy"
  );
  const hasActiveRuntime = Boolean(
    activeRuntime &&
      ["healthy", "warning", "connecting"].includes(
        getRuntimeHealth(activeRuntime)
      )
  );
  const runtimeHealth = activeRuntime
    ? getRuntimeHealth(activeRuntime)
    : "disconnected";
  const runtimeStatus =
    activeRuntime?.status ||
    (runtimeSessions.length > 0 ? runtimeSessions[0].status : "disconnected");

  const copyRuntimeCommand = useCallback(() => {
    navigator.clipboard.writeText(runtimeCommand);
    // Could add a toast notification here
  }, [runtimeCommand]);

  const interruptAllExecutions = useCallback(async () => {
    // Find all running or queued executions
    const runningExecutions = executionQueue.filter(
      (exec: any) =>
        exec.status === "executing" ||
        exec.status === "pending" ||
        exec.status === "assigned"
    );

    // Cancel each execution
    for (const execution of runningExecutions) {
      store.commit(
        events.executionCancelled({
          queueId: execution.id,
          cellId: execution.cellId,
          cancelledBy: currentUserId,
          reason: "User interrupted all executions from runtime UI",
        })
      );
    }
  }, [executionQueue, store, currentUserId]);

  // Prefetch output components adaptively based on connection speed
  React.useEffect(() => {
    prefetchOutputsAdaptive();
  }, []);

  const addCell = useCallback(
    (
      cellId?: string,
      cellType: "code" | "markdown" | "sql" | "ai" = "code",
      position: "before" | "after" = "after"
    ) => {
      const newCellId = `cell-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

      let newPosition: number;
      if (cellId) {
        // Find the current cell and insert after it
        const currentCell = cells.find((c: CellData) => c.id === cellId);
        if (currentCell) {
          if (position === "before") {
            newPosition = currentCell.position;
          } else {
            newPosition = currentCell.position + 1;
          }
          // Shift all subsequent cells down by 1
          const cellsToShift = cells.filter(
            (c: CellData) => c.position >= newPosition
          );
          cellsToShift.forEach((cell: CellData) => {
            store.commit(
              events.cellMoved({
                id: cell.id,
                newPosition: cell.position + 1,
              })
            );
          });
        } else {
          // Fallback: add at end
          newPosition =
            Math.max(...cells.map((c: CellData) => c.position), -1) + 1;
        }
      } else {
        // Add at end
        newPosition =
          Math.max(...cells.map((c: CellData) => c.position), -1) + 1;
      }

      store.commit(
        events.cellCreated({
          id: newCellId,
          position: newPosition,
          cellType,
          createdBy: currentUserId,
          actorId: currentUserId,
        })
      );

      // Prefetch output components when user creates cells
      prefetchOutputsAdaptive();

      // Focus the new cell after creation
      setTimeout(() => setFocusedCellId(newCellId), 0);
    },
    [cells, store, currentUserId]
  );

  const deleteCell = useCallback(
    (cellId: string) => {
      store.commit(
        events.cellDeleted({
          id: cellId,
          actorId: currentUserId,
        })
      );
    },
    [store, currentUserId]
  );

  const moveCell = useCallback(
    (cellId: string, direction: "up" | "down") => {
      const currentCell = cells.find((c: CellData) => c.id === cellId);
      if (!currentCell) return;

      const currentIndex = cells.findIndex((c: CellData) => c.id === cellId);

      if (direction === "up" && currentIndex > 0) {
        const targetCell = cells[currentIndex - 1];
        if (targetCell) {
          // Swap positions
          store.commit(
            events.cellMoved({
              id: cellId,
              newPosition: targetCell.position,
              actorId: currentUserId,
            })
          );
          store.commit(
            events.cellMoved({
              id: targetCell.id,
              newPosition: currentCell.position,
              actorId: currentUserId,
            })
          );
        }
      } else if (direction === "down" && currentIndex < cells.length - 1) {
        const targetCell = cells[currentIndex + 1];
        if (targetCell) {
          // Swap positions
          store.commit(
            events.cellMoved({
              id: cellId,
              newPosition: targetCell.position,
              actorId: currentUserId,
            })
          );
          store.commit(
            events.cellMoved({
              id: targetCell.id,
              newPosition: currentCell.position,
              actorId: currentUserId,
            })
          );
        }
      }
    },
    [cells, store, currentUserId]
  );

  const focusCell = useCallback((cellId: string) => {
    setFocusedCellId(cellId);
    hasEverFocusedRef.current = true;
  }, []);

  const focusNextCell = useCallback(
    (currentCellId: string) => {
      const currentIndex = cells.findIndex(
        (c: CellData) => c.id === currentCellId
      );

      if (currentIndex < cells.length - 1) {
        const nextCell = cells[currentIndex + 1];
        setFocusedCellId(nextCell.id);
      } else {
        // At the last cell, create a new one with same cell type (but never raw)
        const currentCell = cells[currentIndex];
        const newCellType =
          currentCell.cellType === "raw" ? "code" : currentCell.cellType;
        addCell(currentCellId, newCellType);
      }
    },
    [cells, addCell]
  );

  const focusPreviousCell = useCallback(
    (currentCellId: string) => {
      const currentIndex = cells.findIndex(
        (c: CellData) => c.id === currentCellId
      );

      if (currentIndex > 0) {
        const previousCell = cells[currentIndex - 1];
        setFocusedCellId(previousCell.id);
      }
    },
    [cells]
  );

  // Reset focus when focused cell changes or is removed
  React.useEffect(() => {
    if (focusedCellId && !cells.find((c: CellData) => c.id === focusedCellId)) {
      setFocusedCellId(null);
    }
  }, [focusedCellId, cells]);

  // Focus first cell when notebook loads and has cells (but not after deletion)
  React.useEffect(() => {
    if (!focusedCellId && cells.length > 0 && !hasEverFocusedRef.current) {
      setFocusedCellId(cells[0].id);
      hasEverFocusedRef.current = true;
    }
  }, [focusedCellId, cells]);

  // cells are already sorted by position from the database query

  return (
    <div className="bg-background min-h-screen">
      {/* Top Navigation Bar */}
      <nav className="bg-card border-b px-3 py-1 sm:px-4 sm:py-2">
        <div
          className={`flex w-full items-center justify-between ${debugMode ? "sm:mx-auto sm:max-w-none" : "sm:mx-auto sm:max-w-6xl"}`}
        >
          <div className="flex items-center gap-2 sm:gap-4">
            <img src="/logo.svg" alt="Anode" className="h-6 w-auto sm:h-8" />
            <a
              href={window.location.origin}
              className="ring-offset-background focus-visible:ring-ring border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-8 items-center justify-center rounded-md border px-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 sm:h-9 sm:px-3"
            >
              <span className="text-xs sm:text-sm">+ Notebook</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {presentUsers
                .filter((user) => user.id !== currentUserId)
                .map((user) => {
                  const userInfo = getUserInfo(user.id);
                  const isRuntimeAgent =
                    user.id.includes("runtime") || user.id.includes("python");

                  return (
                    <div
                      key={user.id}
                      className="shrink-0 overflow-hidden rounded-full border-2 border-white"
                      title={
                        isRuntimeAgent
                          ? "Python Runtime"
                          : (userInfo?.name ?? "Unknown User")
                      }
                    >
                      {isRuntimeAgent ? (
                        <div className="flex size-8 items-center justify-center rounded-full bg-green-100">
                          <Bot className="size-4 text-green-700" />
                        </div>
                      ) : (
                        <Avatar
                          initials={
                            userInfo?.name?.charAt(0).toUpperCase() ?? "?"
                          }
                          backgroundColor={generateColor(user.id)}
                        />
                      )}
                    </div>
                  );
                })}
            </div>

            {import.meta.env.DEV && onDebugToggle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDebugToggle(!debugMode)}
                className={`h-6 w-6 p-0 transition-opacity ${
                  debugMode ? "opacity-100" : "opacity-30 hover:opacity-60"
                }`}
                title={debugMode ? "Hide debug info" : "Show debug info"}
              >
                {debugMode ? (
                  <Bug className="h-3 w-3" />
                ) : (
                  <BugOff className="h-3 w-3" />
                )}
              </Button>
            )}
            <ErrorBoundary fallback={<div>Error loading user profile</div>}>
              <UserProfile />
            </ErrorBoundary>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className={`flex ${debugMode ? "h-[calc(100vh-57px)]" : ""}`}>
        {/* Notebook Content */}
        <div className={`${debugMode ? "flex-1 overflow-y-auto" : "w-full"}`}>
          {/* Notebook Header Bar */}
          <div className="bg-muted/20 border-b">
            <div
              className={`w-full px-3 py-2 ${debugMode ? "px-4 py-3" : "sm:mx-auto sm:max-w-6xl sm:px-4 sm:py-3"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
                  <NotebookTitle />
                </div>

                <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRuntimeHelper(!showRuntimeHelper)}
                    className="flex items-center gap-1 sm:gap-2"
                  >
                    <Terminal className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden text-xs capitalize sm:block sm:text-sm">
                      {metadata.find((m) => m.key === "runtimeType")?.value ??
                        "python3"}
                    </span>
                    <Circle
                      className={`h-2 w-2 fill-current ${
                        activeRuntime && runtimeHealth === "healthy"
                          ? "text-green-500"
                          : activeRuntime && runtimeHealth === "warning"
                            ? "text-amber-500"
                            : activeRuntime && runtimeHealth === "connecting"
                              ? "text-blue-500"
                              : activeRuntime && runtimeHealth === "warning"
                                ? "text-amber-500"
                                : runtimeStatus === "starting"
                                  ? "text-blue-500"
                                  : "text-red-500"
                      }`}
                    />
                  </Button>
                  <Button
                    variant={contextSelectionMode ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setContextSelectionMode(!contextSelectionMode)
                    }
                    className="flex items-center gap-1 sm:gap-2"
                  >
                    {contextSelectionMode ? (
                      <X className="h-3 w-3 sm:h-4 sm:w-4" />
                    ) : (
                      <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                    <span className="text-xs sm:text-sm">
                      {contextSelectionMode ? "Done" : "Context"}
                    </span>
                  </Button>
                </div>
              </div>
            </div>

            {showRuntimeHelper && (
              <div className="bg-card border-t">
                <div className="w-full px-3 py-4 sm:mx-auto sm:max-w-6xl sm:px-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="flex items-center gap-2 text-sm font-medium">
                      Runtime Status
                      <Circle
                        className={`h-2 w-2 fill-current ${
                          activeRuntime && runtimeHealth === "healthy"
                            ? "text-green-500"
                            : activeRuntime && runtimeHealth === "warning"
                              ? "text-amber-500"
                              : activeRuntime && runtimeHealth === "connecting"
                                ? "text-blue-500"
                                : activeRuntime && runtimeHealth === "warning"
                                  ? "text-amber-500"
                                  : runtimeStatus === "starting"
                                    ? "text-blue-500"
                                    : "text-red-500"
                        }`}
                      />
                      <span
                        className={`text-xs ${
                          activeRuntime && runtimeHealth === "healthy"
                            ? "text-green-600"
                            : activeRuntime && runtimeHealth === "warning"
                              ? "text-amber-600"
                              : activeRuntime && runtimeHealth === "connecting"
                                ? "text-blue-600"
                                : activeRuntime && runtimeHealth === "warning"
                                  ? "text-amber-600"
                                  : runtimeStatus === "starting"
                                    ? "text-blue-600"
                                    : "text-red-600"
                        }`}
                      >
                        {activeRuntime && runtimeHealth === "healthy"
                          ? "Connected"
                          : activeRuntime && runtimeHealth === "warning"
                            ? "Connected (Slow)"
                            : activeRuntime && runtimeHealth === "connecting"
                              ? "Connecting..."
                              : activeRuntime && runtimeHealth === "warning"
                                ? "Connected (Warning)"
                                : runtimeStatus === "starting"
                                  ? "Starting"
                                  : "Disconnected"}
                      </span>
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRuntimeHelper(false)}
                      className="h-6 w-6 p-0"
                    >
                      ×
                    </Button>
                  </div>

                  {!hasActiveRuntime && (
                    <>
                      <p className="text-muted-foreground mb-3 text-sm">
                        Run this command in your terminal to start a runtime for
                        notebook{" "}
                        <code className="bg-muted rounded px-1">
                          {currentNotebookId}
                        </code>
                        :
                      </p>
                      <div className="flex items-center gap-2 rounded bg-slate-900 p-3 font-mono text-sm text-slate-100">
                        <span className="flex-1">{runtimeCommand}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={copyRuntimeCommand}
                          className="h-8 w-8 p-0 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-muted-foreground mt-2 text-xs">
                        Note: Each notebook requires its own runtime instance.
                        The runtime will connect automatically once started.
                      </p>
                    </>
                  )}

                  {hasActiveRuntime && activeRuntime && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Session ID:
                        </span>
                        <code className="bg-muted rounded px-1 text-xs">
                          {activeRuntime.sessionId}
                        </code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Runtime Type:
                        </span>
                        <span>{activeRuntime.runtimeType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span
                          className={`font-medium ${
                            activeRuntime.status === "ready"
                              ? "text-green-600"
                              : activeRuntime.status === "busy"
                                ? "text-amber-600"
                                : "text-red-600"
                          }`}
                        >
                          {activeRuntime.status === "ready"
                            ? "Ready"
                            : activeRuntime.status === "busy"
                              ? "Busy"
                              : activeRuntime.status.charAt(0).toUpperCase() +
                                activeRuntime.status.slice(1)}
                        </span>
                      </div>
                      {activeRuntime.status && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Last Heartbeat:
                          </span>
                          <span className="flex items-center gap-1 text-xs">
                            Status: {activeRuntime.status}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Capabilities:
                        </span>
                        <div className="flex gap-1">
                          {activeRuntime.canExecuteCode && (
                            <span className="rounded bg-blue-100 px-1 text-xs text-blue-800">
                              Code
                            </span>
                          )}
                          {activeRuntime.canExecuteSql && (
                            <span className="rounded bg-purple-100 px-1 text-xs text-purple-800">
                              SQL
                            </span>
                          )}
                          {activeRuntime.canExecuteAi && (
                            <span className="rounded bg-green-100 px-1 text-xs text-green-800">
                              AI
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Interrupt Button */}
                      {executionQueue.some(
                        (exec: any) =>
                          exec.status === "executing" ||
                          exec.status === "pending" ||
                          exec.status === "assigned"
                      ) && (
                        <div className="mt-4 border-t pt-4">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground text-sm">
                              Running Executions:{" "}
                              {
                                executionQueue.filter(
                                  (exec: any) =>
                                    exec.status === "executing" ||
                                    exec.status === "pending" ||
                                    exec.status === "assigned"
                                ).length
                              }
                            </span>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={interruptAllExecutions}
                              className="flex items-center gap-1"
                            >
                              <Square className="h-3 w-3" />
                              <span>Interrupt All</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show all runtime sessions for debugging */}
                  {runtimeSessions.length > 1 && (
                    <div className="mt-4 border-t pt-4">
                      <h5 className="text-muted-foreground mb-2 text-xs font-medium">
                        All Sessions:
                      </h5>
                      <div className="space-y-1">
                        {runtimeSessions.map((session: RuntimeSessionData) => (
                          <div
                            key={session.sessionId}
                            className="flex items-center justify-between text-xs"
                          >
                            <code className="bg-muted rounded px-1">
                              {session.sessionId.slice(-8)}
                            </code>
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded px-1 ${
                                  session.status === "ready"
                                    ? "bg-green-100 text-green-800"
                                    : session.status === "busy"
                                      ? "bg-amber-100 text-amber-800"
                                      : session.status === "terminated"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {session.status}
                              </span>
                              {session.status && (
                                <span className="text-muted-foreground">
                                  Status: {session.status}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div
            className={`w-full px-0 py-3 pb-24 ${debugMode ? "px-4" : "sm:mx-auto sm:max-w-4xl sm:p-4 sm:pb-4"}`}
          >
            {/* Keyboard Shortcuts Help - Desktop only */}
            {cells.length > 0 && (
              <div className="mb-6 hidden sm:block">
                <div className="bg-muted/30 rounded-md px-4 py-2">
                  <div className="text-muted-foreground flex items-center justify-center gap-6 text-xs">
                    <div className="flex items-center gap-1">
                      <kbd className="bg-background rounded border px-1.5 py-0.5 font-mono text-xs">
                        ↑↓
                      </kbd>
                      <span>Navigate</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <kbd className="bg-background rounded border px-1.5 py-0.5 font-mono text-xs">
                        ⇧↵
                      </kbd>
                      <span>Run & next</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <kbd className="bg-background rounded border px-1.5 py-0.5 font-mono text-xs">
                        ⌘↵
                      </kbd>
                      <span>Run</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cells */}
            <div className="space-y-3">
              {cells.length === 0 ? (
                <div className="px-4 pt-6 pb-6 text-center sm:px-0 sm:pt-12">
                  <div className="text-muted-foreground mb-6">
                    Welcome to your notebook! Choose a cell type to get started.
                  </div>
                  <div className="mb-4 flex flex-wrap justify-center gap-2">
                    <Button
                      autoFocus
                      onClick={() => addCell()}
                      className="flex items-center gap-2"
                    >
                      <Code className="h-4 w-4" />
                      Code Cell
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => addCell(undefined, "markdown")}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Markdown
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => addCell(undefined, "sql")}
                      className="flex items-center gap-2"
                    >
                      <Database className="h-4 w-4" />
                      SQL Query
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => addCell(undefined, "ai")}
                      className="flex items-center gap-2"
                    >
                      <Bot className="h-4 w-4" />
                      AI Assistant
                    </Button>
                  </div>
                  <div className="text-muted-foreground hidden text-xs sm:block">
                    💡 Use ↑↓ arrow keys to navigate • Shift+Enter to run and
                    move • Ctrl+Enter to run
                  </div>
                </div>
              ) : (
                <ErrorBoundary fallback={<div>Error rendering cell list</div>}>
                  <VirtualizedCellList
                    cells={cells}
                    focusedCellId={focusedCellId}
                    onAddCell={(afterCellId, cellType, position) =>
                      addCell(
                        afterCellId,
                        cellType as "code" | "markdown" | "sql" | "ai",
                        position
                      )
                    }
                    onDeleteCell={deleteCell}
                    onMoveUp={(cellId) => moveCell(cellId, "up")}
                    onMoveDown={(cellId) => moveCell(cellId, "down")}
                    onFocusNext={focusNextCell}
                    onFocusPrevious={focusPreviousCell}
                    onFocus={focusCell}
                    contextSelectionMode={contextSelectionMode}
                    threshold={50}
                  />
                </ErrorBoundary>
              )}
            </div>

            {/* Add Cell Buttons */}
            {cells.length > 0 && (
              <div className="border-border/30 mt-6 border-t px-4 pt-4 sm:mt-8 sm:px-0 sm:pt-6">
                <div className="space-y-3 text-center">
                  <CellAdder onAddCell={addCell} position="after" />
                  <div className="text-muted-foreground mt-2 hidden text-xs sm:block">
                    Add a new cell
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Debug Panel */}
        {import.meta.env.DEV && debugMode && (
          <Suspense
            fallback={
              <div className="bg-muted/5 text-muted-foreground w-96 border-l p-4 text-xs">
                Loading debug panel...
              </div>
            }
          >
            <ErrorBoundary fallback={<div>Error rendering debug panel</div>}>
              <LazyDebugPanel
                metadata={metadata}
                cells={cells}
                allRuntimeSessions={allRuntimeSessions}
                executionQueue={executionQueue}
                currentNotebookId={currentNotebookId}
                runtimeHealth={runtimeHealth}
              />
            </ErrorBoundary>
          </Suspense>
        )}

        {/* Mobile Omnibar - sticky at bottom on mobile */}
        <MobileOmnibar />
      </div>
    </div>
  );
};
