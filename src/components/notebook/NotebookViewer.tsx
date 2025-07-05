import React, { useCallback, Suspense } from "react";
import { useStore } from "@livestore/react";
import { CellData, events, KernelSessionData, tables } from "@runt/schema";
import { queryDb } from "@livestore/livestore";

import { VirtualizedCellList } from "./VirtualizedCellList.js";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Plus,
  Terminal,
  X,
} from "lucide-react";
import { getCurrentNotebookId } from "../../util/store-id.js";
import { getRuntimeCommand } from "../../util/runtime-command.js";
import { UserProfile } from "../auth/UserProfile.js";

// Lazy import DebugPanel only in development
const LazyDebugPanel = React.lazy(() =>
  import("./DebugPanel.js").then((module) => ({
    default: module.DebugPanel,
  }))
);

// Import prefetch utilities
import { prefetchOutputsAdaptive } from "../../util/prefetch.js";
import { MobileOmnibar } from "./MobileOmnibar.js";

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

  const cells = store.useQuery(
    queryDb(tables.cells.select().orderBy("position", "asc"))
  ) as CellData[];
  const notebooks = store.useQuery(
    queryDb(tables.notebook.select().limit(1))
  ) as any[];
  // TODO: Update schema to use runtime terminology (kernelSessions → runtimeSessions, KernelSessionData → RuntimeSessionData)
  const kernelSessions = store.useQuery(
    queryDb(tables.kernelSessions.select().where({ isActive: true }))
  ) as KernelSessionData[];
  // Get all kernel sessions for debug panel
  const allKernelSessions = store.useQuery(
    queryDb(tables.kernelSessions.select())
  ) as KernelSessionData[];
  // Get execution queue for debug panel
  const executionQueue = store.useQuery(
    queryDb(tables.executionQueue.select().orderBy("priority", "desc"))
  ) as any[];
  const notebook = notebooks[0];

  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [localTitle, setLocalTitle] = React.useState(notebook?.title || "");
  const [showRuntimeHelper, setShowRuntimeHelper] = React.useState(false);
  const [focusedCellId, setFocusedCellId] = React.useState<string | null>(null);
  const [contextSelectionMode, setContextSelectionMode] = React.useState(false);
  const hasEverFocusedRef = React.useRef(false);

  const currentNotebookId = getCurrentNotebookId();
  const runtimeCommand = getRuntimeCommand(currentNotebookId);

  // Check kernel status with heartbeat-based health assessment
  const getRuntimeHealth = (session: KernelSessionData) => {
    if (!session.lastHeartbeat) {
      // If session is active but no heartbeat yet, it's connecting (not disconnected)
      return session.isActive ? "connecting" : "unknown";
    }
    const now = new Date();
    const lastHeartbeat = new Date(session.lastHeartbeat);
    const diffMs = now.getTime() - lastHeartbeat.getTime();

    if (diffMs > 300000) return "stale"; // 5+ minutes
    if (diffMs > 60000) return "warning"; // 1+ minute
    return "healthy";
  };

  const activeRuntime = kernelSessions.find(
    (session: KernelSessionData) =>
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
    (kernelSessions.length > 0 ? kernelSessions[0].status : "disconnected");

  const copyRuntimeCommand = useCallback(() => {
    navigator.clipboard.writeText(runtimeCommand);
    // Could add a toast notification here
  }, [runtimeCommand]);

  // Helper function to format heartbeat time
  const formatHeartbeatTime = (heartbeatTime: Date | string | null) => {
    if (!heartbeatTime) return "Never";

    const heartbeat = new Date(heartbeatTime);
    const now = new Date();
    const diffMs = now.getTime() - heartbeat.getTime();

    // Show "Now" for very recent heartbeats (within 2 seconds)
    if (diffMs < 2000) return "Now";

    // Use date-fns for clean relative formatting
    return formatDistanceToNow(heartbeat, { addSuffix: true });
  };

  React.useEffect(() => {
    if (notebook?.title) {
      setLocalTitle(notebook.title);
    }
  }, [notebook?.title]);

  // Prefetch output components adaptively based on connection speed
  React.useEffect(() => {
    prefetchOutputsAdaptive();
  }, []);

  const updateTitle = useCallback(() => {
    if (notebook && localTitle !== notebook.title) {
      store.commit(
        events.notebookTitleChanged({
          title: localTitle,
        })
      );
    }
    setIsEditingTitle(false);
  }, [notebook, localTitle, store]);

  const addCell = useCallback(
    (
      afterCellId?: string,
      cellType: "code" | "markdown" | "sql" | "ai" = "code"
    ) => {
      const cellId = `cell-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

      let newPosition: number;
      if (afterCellId) {
        // Find the current cell and insert after it
        const currentCell = cells.find((c: CellData) => c.id === afterCellId);
        if (currentCell) {
          newPosition = currentCell.position + 1;
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
          id: cellId,
          position: newPosition,
          cellType,
          createdBy: "current-user",
        })
      );

      // Prefetch output components when user creates cells
      prefetchOutputsAdaptive();

      // Focus the new cell after creation
      setTimeout(() => setFocusedCellId(cellId), 0);
    },
    [cells, store]
  );

  const deleteCell = useCallback(
    (cellId: string) => {
      store.commit(
        events.cellDeleted({
          id: cellId,
        })
      );
    },
    [store]
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
            })
          );
          store.commit(
            events.cellMoved({
              id: targetCell.id,
              newPosition: currentCell.position,
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
            })
          );
          store.commit(
            events.cellMoved({
              id: targetCell.id,
              newPosition: currentCell.position,
            })
          );
        }
      }
    },
    [cells, store]
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

  if (!notebook) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading notebook...</div>
      </div>
    );
  }

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
            <UserProfile />
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
                  {isEditingTitle ? (
                    <Input
                      value={localTitle}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setLocalTitle(e.target.value)
                      }
                      onBlur={updateTitle}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter") updateTitle();
                        if (e.key === "Escape") {
                          setLocalTitle(notebook.title);
                          setIsEditingTitle(false);
                        }
                      }}
                      className="border-none bg-transparent p-0 text-lg font-semibold focus-visible:ring-0"
                      autoFocus
                    />
                  ) : (
                    <h1
                      className="hover:text-muted-foreground cursor-pointer truncate text-base font-semibold transition-colors sm:text-lg"
                      onClick={() => setIsEditingTitle(true)}
                    >
                      {notebook.title}
                    </h1>
                  )}
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
                      {
                        /* TODO: Update schema property kernelType → runtimeType */ notebook.kernelType
                      }
                    </span>
                    <Circle
                      className={`h-2 w-2 fill-current ${
                        activeRuntime && runtimeHealth === "healthy"
                          ? "text-green-500"
                          : activeRuntime && runtimeHealth === "warning"
                            ? "text-amber-500"
                            : activeRuntime && runtimeHealth === "connecting"
                              ? "text-blue-500"
                              : activeRuntime && runtimeHealth === "stale"
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
                                : activeRuntime && runtimeHealth === "stale"
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
                                : activeRuntime && runtimeHealth === "stale"
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
                              : activeRuntime && runtimeHealth === "stale"
                                ? "Connected (Stale)"
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
                        <span>
                          {
                            /* TODO: Update schema property kernelType → runtimeType */ activeRuntime.kernelType
                          }
                        </span>
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
                      {activeRuntime.lastHeartbeat && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Last Heartbeat:
                          </span>
                          <span className="flex items-center gap-1 text-xs">
                            {formatHeartbeatTime(activeRuntime.lastHeartbeat)}
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
                    </div>
                  )}

                  {/* Show all runtime sessions for debugging */}
                  {kernelSessions.length > 1 && (
                    <div className="mt-4 border-t pt-4">
                      <h5 className="text-muted-foreground mb-2 text-xs font-medium">
                        All Sessions:
                      </h5>
                      <div className="space-y-1">
                        {kernelSessions.map((session: KernelSessionData) => (
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
                              {session.lastHeartbeat && (
                                <span className="text-muted-foreground">
                                  {formatHeartbeatTime(session.lastHeartbeat)}
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
                <VirtualizedCellList
                  cells={cells}
                  focusedCellId={focusedCellId}
                  onAddCell={(afterCellId, cellType) =>
                    addCell(
                      afterCellId,
                      cellType as "code" | "markdown" | "sql" | "ai"
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
              )}
            </div>

            {/* Add Cell Buttons */}
            {cells.length > 0 && (
              <div className="border-border/30 mt-6 border-t px-4 pt-4 sm:mt-8 sm:px-0 sm:pt-6">
                <div className="space-y-3 text-center">
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCell()}
                      className="flex items-center gap-1.5"
                    >
                      <Plus className="h-3 w-3" />
                      <Code className="h-3 w-3" />
                      Code
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCell(undefined, "markdown")}
                      className="flex items-center gap-1.5"
                    >
                      <Plus className="h-3 w-3" />
                      <FileText className="h-3 w-3" />
                      Markdown
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCell(undefined, "sql")}
                      className="flex items-center gap-1.5"
                    >
                      <Plus className="h-3 w-3" />
                      <Database className="h-3 w-3" />
                      SQL
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addCell(undefined, "ai")}
                      className="flex items-center gap-1.5"
                    >
                      <Plus className="h-3 w-3" />
                      <Bot className="h-3 w-3" />
                      AI
                    </Button>
                  </div>
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
            <LazyDebugPanel
              notebook={notebook}
              cells={cells}
              allKernelSessions={allKernelSessions}
              executionQueue={executionQueue}
              currentNotebookId={currentNotebookId}
              runtimeHealth={runtimeHealth}
            />
          </Suspense>
        )}

        {/* Mobile Omnibar - sticky at bottom on mobile */}
        <MobileOmnibar />
      </div>
    </div>
  );
};
