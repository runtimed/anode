import { queryDb } from "@livestore/livestore";
import { useStore } from "@livestore/react";
import { CellData, events, tables } from "@runt/schema";
import React, { Suspense, useCallback } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { NotebookTitle } from "./NotebookTitle.js";
import { VirtualizedCellList } from "./VirtualizedCellList.js";

import { Avatar } from "@/components/ui/Avatar.js";
import { Button } from "@/components/ui/button";

import { useCurrentUserId } from "@/hooks/useCurrentUser.js";
import { useUserRegistry } from "@/hooks/useUserRegistry.js";
import { useRuntimeHealth } from "@/hooks/useRuntimeHealth.js";

import { getCurrentNotebookId } from "@/util/store-id.js";
import { getClientTypeInfo, getClientColor } from "@/services/userTypes.js";
import {
  Bot,
  Bug,
  BugOff,
  Code,
  Database,
  FileText,
  Filter,
  Terminal,
  X,
} from "lucide-react";
import { UserProfile } from "../auth/UserProfile.js";
import { useAvailableAiModels, getDefaultAiModel } from "@/util/ai-models.js";
import { RuntimeHealthIndicator } from "./RuntimeHealthIndicator.js";
import { RuntimeHelper } from "./RuntimeHelper.js";

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
import { EmptyStateCellAdder } from "./EmptyStateCellAdder.js";

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
  const { presentUsers, getUserInfo, getUserColor } = useUserRegistry();
  const { models } = useAvailableAiModels();
  const { runtimeHealth } = useRuntimeHealth();

  const cells = store.useQuery(
    queryDb(tables.cells.select().orderBy("position", "asc"))
  );
  const lastUsedAiModel =
    store.useQuery(
      queryDb(
        tables.notebookMetadata
          .select()
          .where({ key: "lastUsedAiModel" })
          .limit(1)
      )
    )[0] || null;
  const lastUsedAiProvider =
    store.useQuery(
      queryDb(
        tables.notebookMetadata
          .select()
          .where({ key: "lastUsedAiProvider" })
          .limit(1)
      )
    )[0] || null;
  const metadata = store.useQuery(queryDb(tables.notebookMetadata.select()));
  const runtimeSessions = store.useQuery(
    queryDb(tables.runtimeSessions.select().where({ isActive: true }))
  );
  // Get all runtime sessions for debug panel
  const allRuntimeSessions = store.useQuery(
    queryDb(tables.runtimeSessions.select())
  );
  // Get execution queue for debug panel
  const executionQueue = store.useQuery(
    queryDb(tables.executionQueue.select().orderBy("id", "desc"))
  ) as any[];

  const [showRuntimeHelper, setShowRuntimeHelper] = React.useState(false);
  const [focusedCellId, setFocusedCellId] = React.useState<string | null>(null);
  const [contextSelectionMode, setContextSelectionMode] = React.useState(false);
  const hasEverFocusedRef = React.useRef(false);

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

      // Get default AI model if creating an AI cell
      let aiProvider, aiModel;
      if (cellType === "ai") {
        const defaultModel = getDefaultAiModel(
          models,
          lastUsedAiProvider?.value,
          lastUsedAiModel?.value
        );
        if (defaultModel) {
          aiProvider = defaultModel.provider;
          aiModel = defaultModel.model;
        }
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

      // Set default AI model for AI cells based on last used model
      if (cellType === "ai" && aiProvider && aiModel) {
        store.commit(
          events.aiSettingsChanged({
            cellId: newCellId,
            provider: aiProvider,
            model: aiModel,
            settings: {
              temperature: 0.7,
              maxTokens: 1000,
            },
          })
        );
      }

      // Prefetch output components when user creates cells
      prefetchOutputsAdaptive();

      // Focus the new cell after creation
      setTimeout(() => setFocusedCellId(newCellId), 0);
    },
    [cells, store, currentUserId, models, lastUsedAiModel, lastUsedAiProvider]
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
                  const clientInfo = getClientTypeInfo(user.id);
                  const IconComponent = clientInfo.icon;

                  return (
                    <div
                      key={user.id}
                      className="shrink-0 overflow-hidden rounded-full border-2"
                      style={{
                        borderColor: getClientColor(user.id, getUserColor),
                      }}
                      title={
                        clientInfo.type === "user"
                          ? (userInfo?.name ?? "Unknown User")
                          : clientInfo.name
                      }
                    >
                      {IconComponent ? (
                        <div
                          className={`flex size-8 items-center justify-center rounded-full ${clientInfo.backgroundColor}`}
                        >
                          <IconComponent
                            className={`size-4 ${clientInfo.textColor}`}
                          />
                        </div>
                      ) : userInfo?.picture ? (
                        <img
                          src={userInfo.picture}
                          alt={userInfo.name ?? "User"}
                          className="h-8 w-8 rounded-full bg-gray-300"
                        />
                      ) : (
                        <Avatar
                          initials={
                            userInfo?.name?.charAt(0).toUpperCase() ?? "?"
                          }
                          backgroundColor={getUserColor(user.id)}
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
                    <RuntimeHealthIndicator />
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

            <RuntimeHelper
              showRuntimeHelper={showRuntimeHelper}
              onClose={() => setShowRuntimeHelper(false)}
              runtimeSessions={runtimeSessions as any[]}
            />
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
            {cells.length === 0 ? (
              <EmptyStateCellAdder onAddCell={addCell} />
            ) : (
              <>
                <ErrorBoundary fallback={<div>Error rendering cell list</div>}>
                  <VirtualizedCellList
                    cells={cells}
                    focusedCellId={focusedCellId}
                    onAddCell={addCell}
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
                {/* Add Cell Buttons */}
                <div className="border-border/30 mt-6 border-t px-4 pt-4 sm:mt-8 sm:px-0 sm:pt-6">
                  <div className="space-y-3 text-center">
                    <CellAdder onAddCell={addCell} position="after" />
                    <div className="text-muted-foreground mt-2 hidden text-xs sm:block">
                      Add a new cell
                    </div>
                  </div>
                </div>
              </>
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
                currentNotebookId={getCurrentNotebookId()}
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
