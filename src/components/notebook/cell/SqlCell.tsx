import { Button } from "@/components/ui/button";
import { useCellContent } from "@/hooks/useCellContent.js";
import { useCellKeyboardNavigation } from "@/hooks/useCellKeyboardNavigation.js";
import { useCellOutputs } from "@/hooks/useCellOutputs.js";
import { useAuth } from "@/components/auth/AuthProvider.js";
import { useUserRegistry } from "@/hooks/useUserRegistry.js";
import { useInterruptExecution } from "@/hooks/useInterruptExecution.js";

import { useStore } from "@livestore/react";
import { events, tables } from "@runt/schema";
import { ChevronDown, ChevronUp } from "lucide-react";
import React, { useCallback } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { CodeMirrorEditor } from "../codemirror/CodeMirrorEditor.js";
import { CellContainer } from "./shared/CellContainer.js";
import { CellControls } from "./shared/CellControls.js";
import { CellTypeSelector } from "./shared/CellTypeSelector.js";

import { OutputsErrorBoundary } from "./shared/OutputsErrorBoundary.js";
import { PlayButton } from "./shared/PlayButton.js";
import { PresenceBookmarks } from "./shared/PresenceBookmarks.js";
import { SqlToolbar } from "./toolbars/SqlToolbar.js";

interface SqlCellProps {
  cell: typeof tables.cells.Type;
  onDeleteCell: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onFocusNext?: () => void;
  onFocusPrevious?: () => void;
  autoFocus?: boolean;
  onFocus?: () => void;
  contextSelectionMode?: boolean;
}

export const SqlCell: React.FC<SqlCellProps> = ({
  cell,
  onDeleteCell,
  onMoveUp,
  onMoveDown,
  onFocusNext,
  onFocusPrevious,
  autoFocus = false,
  onFocus,
  contextSelectionMode = false,
}) => {
  const { store } = useStore();
  const {
    user: { sub: userId },
  } = useAuth();
  const { getUsersOnCell, getUserColor } = useUserRegistry();

  // Get users present on this cell (excluding current user)
  const usersOnCell = getUsersOnCell(cell.id).filter(
    (user) => user.id !== userId
  );

  // Use shared content management hook
  const {
    localSource: localQuery,
    updateSource: updateQuery,
    handleSourceChange,
  } = useCellContent({
    cellId: cell.id,
    initialSource: cell.source,
  });

  // Use shared outputs hook with SQL-specific configuration
  const { outputs, hasOutputs, MaybeOutputs } = useCellOutputs({
    cellId: cell.id,
    groupConsecutiveStreams: true,
    enableErrorOutput: true,
    enableTerminalOutput: true,
    mobileStyle: "default",
  });

  const executeQuery = useCallback(() => {
    if (!localQuery.trim()) {
      return;
    }

    // Generate unique queue ID
    const queueId = `exec-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const executionCount = (cell.executionCount || 0) + 1;

    // Submit execution request like other cell types
    store.commit(
      events.executionRequested({
        queueId,
        cellId: cell.id,
        executionCount,
        requestedBy: userId,
      })
    );
  }, [localQuery, cell.id, cell.executionCount, store, userId]);

  const clearCellOutputs = useCallback(async () => {
    if (hasOutputs) {
      store.commit(
        events.cellOutputsCleared({
          cellId: cell.id,
          wait: false,
          clearedBy: userId,
        })
      );
    }
  }, [cell.id, store, hasOutputs, userId]);

  const { interruptExecution: interruptQuery } = useInterruptExecution({
    cellId: cell.id,
    userId,
    reason: "User interrupted SQL execution",
  });

  // Use shared keyboard navigation hook
  const { keyMap } = useCellKeyboardNavigation({
    onFocusNext,
    onFocusPrevious,
    onDeleteCell,
    onExecute: executeQuery,
    onUpdateSource: updateQuery,
  });

  const handleFocus = useCallback(() => {
    if (onFocus) {
      onFocus();
    }
  }, [onFocus]);

  const changeCellType = useCallback(
    (newType: "code" | "markdown" | "sql" | "ai") => {
      store.commit(
        events.cellTypeChanged({
          id: cell.id,
          cellType: newType,
          actorId: userId,
        })
      );
    },
    [cell.id, store, userId]
  );

  const toggleSourceVisibility = useCallback(() => {
    store.commit(
      events.cellSourceVisibilityToggled({
        id: cell.id,
        sourceVisible: !cell.sourceVisible,
        actorId: userId,
      })
    );
  }, [cell.id, cell.sourceVisible, store, userId]);

  const toggleOutputVisibility = useCallback(() => {
    store.commit(
      events.cellOutputVisibilityToggled({
        id: cell.id,
        outputVisible: !cell.outputVisible,
        actorId: userId,
      })
    );
  }, [cell.id, cell.outputVisible, store, userId]);

  const toggleAiContextVisibility = useCallback(() => {
    store.commit(
      events.cellAiContextVisibilityToggled({
        id: cell.id,
        aiContextVisible: !cell.aiContextVisible,
      })
    );
  }, [cell.id, cell.aiContextVisible, store]);

  const changeDataConnection = useCallback(
    (connection: string) => {
      store.commit(
        events.sqlConnectionChanged({
          cellId: cell.id,
          connectionId: connection,
          changedBy: userId,
        })
      );
    },
    [cell.id, store, userId]
  );

  return (
    <CellContainer
      cell={cell}
      autoFocus={autoFocus}
      contextSelectionMode={contextSelectionMode}
      onFocus={handleFocus}
      focusColor="bg-blue-500/60"
      focusBgColor="bg-blue-50/30"
    >
      {/* Cell Header */}
      <div className="cell-header mb-2 flex items-center justify-between pr-1 pl-6 sm:pr-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <CellTypeSelector cell={cell} onCellTypeChange={changeCellType} />
          <SqlToolbar
            dataConnection={cell.sqlConnectionId || "default"}
            onDataConnectionChange={changeDataConnection}
          />
          <PresenceBookmarks
            usersOnCell={usersOnCell}
            getUserColor={getUserColor}
          />
        </div>

        <CellControls
          sourceVisible={cell.sourceVisible}
          aiContextVisible={cell.aiContextVisible}
          contextSelectionMode={contextSelectionMode}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onDeleteCell={onDeleteCell}
          onClearOutputs={clearCellOutputs}
          hasOutputs={hasOutputs}
          toggleSourceVisibility={toggleSourceVisibility}
          toggleAiContextVisibility={toggleAiContextVisibility}
          playButton={
            <PlayButton
              executionState={cell.executionState}
              cellType={cell.cellType}
              autoFocus={autoFocus}
              onExecute={executeQuery}
              onInterrupt={interruptQuery}
              className="mobile-play-btn block sm:hidden"
              primaryColor="text-foreground"
            />
          }
        />
      </div>

      {/* Cell Content with Desktop Play Button */}
      <div className="relative">
        {/* Desktop Play Button Breaking Through Left Border */}
        <div
          className="desktop-play-btn absolute -left-3 z-10 hidden sm:block"
          style={{
            top: cell.sourceVisible ? "0.35rem" : "-1.5rem",
          }}
        >
          <PlayButton
            executionState={cell.executionState}
            cellType={cell.cellType}
            autoFocus={autoFocus}
            onExecute={executeQuery}
            onInterrupt={interruptQuery}
            size="default"
            className="h-6 w-6 rounded-sm border-0 bg-white p-0 transition-colors hover:bg-white"
            primaryColor="text-blue-600"
          />
        </div>

        {/* Editor Content Area */}
        {cell.sourceVisible && (
          <div className="cell-content bg-white py-1 pl-4 transition-colors">
            <div className="relative min-h-[1.5rem]">
              <CodeMirrorEditor
                className="text-base sm:text-sm"
                language="sql"
                placeholder="Enter your SQL query here..."
                value={localQuery}
                onValueChange={handleSourceChange}
                autoFocus={autoFocus}
                onFocus={handleFocus}
                keyMap={keyMap}
                onBlur={updateQuery}
                enableLineWrapping={false}
              />
            </div>
          </div>
        )}
      </div>

      {/* Execution Summary - appears after input */}
      {(cell.executionCount ||
        cell.executionState === "running" ||
        cell.executionState === "queued") && (
        <div className="cell-content mt-1 pr-1 pl-6 sm:pr-4">
          <div className="text-muted-foreground flex items-center justify-between pb-1 text-xs">
            <span>
              {cell.executionState === "running"
                ? "Executing SQL query..."
                : cell.executionState === "queued"
                  ? "Queued for execution"
                  : cell.executionCount
                    ? cell.lastExecutionDurationMs
                      ? `Executed in ${
                          cell.lastExecutionDurationMs < 1000
                            ? `${cell.lastExecutionDurationMs}ms`
                            : `${(cell.lastExecutionDurationMs / 1000).toFixed(1)}s`
                        }`
                      : "Executed"
                    : null}
            </span>
            {(outputs.length > 0 || cell.executionState === "running") && (
              <div className="flex items-center gap-2">
                {!cell.outputVisible && hasOutputs && (
                  <span className="text-muted-foreground text-xs">
                    {outputs.length === 1
                      ? "1 result hidden"
                      : `${outputs.length} results hidden`}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleOutputVisibility}
                  className={`hover:bg-muted/80 h-6 w-6 p-0 transition-opacity sm:h-5 sm:w-5 ${
                    autoFocus
                      ? "opacity-100"
                      : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  } ${cell.outputVisible ? "" : "text-muted-foreground/60"}`}
                  title={cell.outputVisible ? "Hide results" : "Show results"}
                >
                  {cell.outputVisible ? (
                    <ChevronUp className="h-4 w-4 sm:h-3 sm:w-3" />
                  ) : (
                    <ChevronDown className="h-4 w-4 sm:h-3 sm:w-3" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Outputs Section */}
      <ErrorBoundary FallbackComponent={OutputsErrorBoundary}>
        {cell.outputVisible && <MaybeOutputs />}
      </ErrorBoundary>
    </CellContainer>
  );
};
