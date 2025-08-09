// import { toast } from "sonner";
import { queryDb } from "@livestore/livestore";
import { useQuery, useStore } from "@livestore/react";
import {
  events,
  tables,
  createCellBetween,
  moveCellBetweenWithRebalancing,
  queries,
  CellReference,
} from "@/schema";
import { lastUsedAiModel$, lastUsedAiProvider$ } from "@/queries";
import React, { Suspense, useCallback, useRef } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { NotebookTitle } from "./NotebookTitle.js";
import { CellList } from "./CellList.js";

import { Avatar } from "@/components/ui/Avatar.js";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/components/auth/AuthProvider.js";
import { useUserRegistry } from "@/hooks/useUserRegistry.js";

import { getClientColor, getClientTypeInfo } from "@/services/userTypes.js";
import { getDefaultAiModel, useAvailableAiModels } from "@/util/ai-models.js";
import { Bug, BugOff, Filter, X } from "lucide-react";
import { UserProfile } from "../auth/UserProfile.js";
import { RuntimeHealthIndicatorButton } from "./RuntimeHealthIndicatorButton.js";
import { RuntimeHelper } from "./RuntimeHelper.js";
import { focusedCellSignal$, hasManuallyFocused$ } from "./signals/focus.js";

// Lazy import DebugPanel only in development
const LazyDebugPanel = React.lazy(() =>
  import("./DebugPanel.js").then((module) => ({
    default: module.DebugPanel,
  }))
);

// Import prefetch utilities
import { prefetchOutputsAdaptive } from "@/util/prefetch.js";
import { CellAdder } from "./cell/CellAdder.js";
import { EmptyStateCellAdder } from "./EmptyStateCellAdder.js";
import { GitCommitHash } from "./GitCommitHash.js";

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
  const {
    user: { sub: userId },
  } = useAuth();
  const { presentUsers, getUserInfo, getUserColor } = useUserRegistry();
  const { models } = useAvailableAiModels();

  const cellReferences = useQuery(queries.cellsWithIndices$);

  const lastUsedAiModel = useQuery(lastUsedAiModel$);
  const lastUsedAiProvider = useQuery(lastUsedAiProvider$);
  const runtimeSessions = useQuery(
    queryDb(tables.runtimeSessions.select().where({ isActive: true }))
  );

  const [showRuntimeHelper, setShowRuntimeHelper] = React.useState(false);
  const [contextSelectionMode, setContextSelectionMode] = React.useState(false);

  const focusedCellId = useQuery(focusedCellSignal$);
  const hasManuallyFocused = useQuery(hasManuallyFocused$);

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

      let cellBefore = null;
      let cellAfter = null;

      if (cellId) {
        const targetIndex = cellReferences.findIndex((c) => c.id === cellId);
        if (targetIndex >= 0) {
          if (position === "before") {
            // Insert before the target cell
            cellAfter = cellReferences[targetIndex];
            cellBefore =
              targetIndex > 0 ? cellReferences[targetIndex - 1] : null;
          } else {
            // Insert after the target cell
            cellBefore = cellReferences[targetIndex];
            cellAfter =
              targetIndex < cellReferences.length - 1
                ? cellReferences[targetIndex + 1]
                : null;
          }
        }
      } else if (position === "after") {
        // No cellId specified, insert at the end
        cellBefore =
          cellReferences.length > 0
            ? cellReferences[cellReferences.length - 1]
            : null;
      }

      // Create cell using the new API
      const cellCreationResult = createCellBetween(
        {
          id: newCellId,
          cellType,
          createdBy: userId,
        },
        cellBefore,
        cellAfter,
        cellReferences // Pass current cell state for rebalancing context
      );

      // toast.success("Cell created successfully!");

      // Commit all events (may include automatic rebalancing)
      cellCreationResult.events.forEach((event) => store.commit(event));

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
      setTimeout(() => store.setSignal(focusedCellSignal$, newCellId), 0);
    },
    [cellReferences, store, userId, models, lastUsedAiModel, lastUsedAiProvider]
  );

  const deleteCell = useCallback(
    (cellId: string) => {
      store.commit(
        events.cellDeleted({
          id: cellId,
          actorId: userId,
        })
      );
    },
    [store, userId]
  );

  // Track if a move operation is in progress to prevent race conditions
  const movingRef = useRef(false);

  const moveCell = useCallback(
    (cellId: string, direction: "up" | "down") => {
      // Prevent concurrent moves
      if (movingRef.current) {
        return;
      }
      movingRef.current = true;

      // Cells are already sorted by fractionalIndex from the database query
      const currentIndex = cellReferences.findIndex((c) => c.id === cellId);
      if (currentIndex === -1) {
        return;
      }

      const currentCell = cellReferences[currentIndex];
      if (!currentCell.fractionalIndex) {
        return;
      }

      // Check boundaries
      if (direction === "up" && currentIndex === 0) {
        return;
      }
      if (direction === "down" && currentIndex === cellReferences.length - 1) {
        return;
      }

      // Check for duplicate fractional indices
      const duplicates = cellReferences.filter(
        (c) =>
          c.fractionalIndex === currentCell.fractionalIndex &&
          c.id !== currentCell.id
      );
      if (duplicates.length > 0) {
        // Skip move if duplicate indices exist to prevent ordering issues
        // TODO: Figure out what to do here
        return;
      }

      // Determine the before and after cells based on direction
      // With fractional indexing, we place the cell between its new neighbors
      let cellBefore: CellReference | null = null;
      let cellAfter: CellReference | null = null;

      if (direction === "up") {
        // Moving up: place between the cell 2 positions up and 1 position up
        cellBefore =
          currentIndex >= 2 ? cellReferences[currentIndex - 2] : null;
        cellAfter = cellReferences[currentIndex - 1];
      } else {
        // Moving down: place between the cell 1 position down and 2 positions down
        cellBefore = cellReferences[currentIndex + 1];
        cellAfter =
          currentIndex < cellReferences.length - 2
            ? cellReferences[currentIndex + 2]
            : null;
      }

      // Use moveCellBetween to calculate the new position

      // Verify the ordering makes sense
      if (
        cellBefore &&
        cellAfter &&
        cellBefore.fractionalIndex &&
        cellAfter.fractionalIndex
      ) {
        const correctOrder =
          cellBefore.fractionalIndex < cellAfter.fractionalIndex;
        if (!correctOrder) {
          // Invalid order detected - skip the move
          return;
        }
      }

      const moveResult = moveCellBetweenWithRebalancing(
        currentCell,
        cellBefore,
        cellAfter,
        cellReferences, // Pass current cell state for rebalancing context
        userId
      );

      if (moveResult.moved) {
        // Commit all events (may include automatic rebalancing)
        moveResult.events.forEach((event) => store.commit(event));
      } else {
        // Cell already in target position or invalid move
      }

      // Reset the moving flag after a short delay to allow for database updates
      setTimeout(() => {
        movingRef.current = false;
      }, 100);
    },
    [cellReferences, store, userId]
  );

  const focusCell = useCallback(
    (cellId: string) => {
      store.setSignal(focusedCellSignal$, cellId);
      store.setSignal(hasManuallyFocused$, true);
    },
    [store]
  );

  const focusNextCell = useCallback(
    (currentCellId: string) => {
      const currentIndex = cellReferences.findIndex(
        (c) => c.id === currentCellId
      );

      if (currentIndex < cellReferences.length - 1) {
        const nextCell = cellReferences[currentIndex + 1];
        store.setSignal(focusedCellSignal$, nextCell.id);
      } else {
        // At the last cell, create a new one with same cell type (but never raw)
        const currentCell = cellReferences[currentIndex];
        const newCellType =
          currentCell.cellType === "raw" ? "code" : currentCell.cellType;
        addCell(currentCellId, newCellType);
      }
    },
    [cellReferences, addCell, store]
  );

  const focusPreviousCell = useCallback(
    (currentCellId: string) => {
      const currentIndex = cellReferences.findIndex(
        (c) => c.id === currentCellId
      );

      if (currentIndex > 0) {
        const previousCell = cellReferences[currentIndex - 1];
        store.setSignal(focusedCellSignal$, previousCell.id);
      }
    },
    [cellReferences, store]
  );

  // Reset focus when focused cell changes or is removed
  React.useEffect(() => {
    if (focusedCellId && !cellReferences.find((c) => c.id === focusedCellId)) {
      store.setSignal(focusedCellSignal$, null);
    }
  }, [focusedCellId, cellReferences, store]);

  // Focus first cell when notebook loads and has cells (but not after deletion)
  React.useEffect(() => {
    if (!focusedCellId && cellReferences.length > 0 && !hasManuallyFocused) {
      store.setSignal(focusedCellSignal$, cellReferences[0].id);
      store.setSignal(hasManuallyFocused$, true);
    }
  }, [focusedCellId, cellReferences, store, hasManuallyFocused]);

  // cells are already sorted by position from the database query

  return (
    <div className="bg-background min-h-screen">
      {/* Top Navigation Bar */}
      <nav className="bg-card border-b px-3 py-1 sm:px-4 sm:py-2">
        <div
          className={`flex w-full items-center justify-between ${debugMode ? "sm:mx-auto sm:max-w-none" : "sm:mx-auto sm:max-w-6xl"}`}
        >
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative h-8 w-8 overflow-hidden sm:h-10 sm:w-10">
              <img
                src="/hole.png"
                alt=""
                className="pixel-logo absolute inset-0 h-full w-full"
              />

              <img
                src="/runes.png"
                alt=""
                className="pixel-logo absolute inset-0 h-full w-full"
              />

              <img
                src="/bunny-sit.png"
                alt=""
                className="pixel-logo absolute inset-0 h-full w-full"
              />
              <img
                src="/bracket.png"
                alt="Runt"
                className="pixel-logo absolute inset-0 h-full w-full"
              />
            </div>
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
                .filter((user) => user.id !== userId)
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
                  <RuntimeHealthIndicatorButton
                    onToggleClick={() =>
                      setShowRuntimeHelper(!showRuntimeHelper)
                    }
                  />
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
            {cellReferences.length > 0 && (
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
            {cellReferences.length === 0 ? (
              <EmptyStateCellAdder onAddCell={addCell} />
            ) : (
              <>
                <ErrorBoundary fallback={<div>Error rendering cell list</div>}>
                  <CellList
                    cellReferences={cellReferences}
                    onAddCell={addCell}
                    onDeleteCell={deleteCell}
                    onMoveUp={(cellId) => moveCell(cellId, "up")}
                    onMoveDown={(cellId) => moveCell(cellId, "down")}
                    onFocusNext={focusNextCell}
                    onFocusPrevious={focusPreviousCell}
                    onFocus={focusCell}
                    contextSelectionMode={contextSelectionMode}
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
              <LazyDebugPanel />
            </ErrorBoundary>
          </Suspense>
        )}
      </div>
      {/* Build info footer */}
      <div className="mt-8 flex justify-center border-t px-4 py-2 text-center">
        <GitCommitHash />
      </div>
    </div>
  );
};
