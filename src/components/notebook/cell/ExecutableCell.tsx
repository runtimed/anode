import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCellContent } from "@/hooks/useCellContent.js";
import { useCellKeyboardNavigation } from "@/hooks/useCellKeyboardNavigation.js";
import { useCellOutputs } from "@/hooks/useCellOutputs.js";
import { useAuth } from "@/components/auth/AuthProvider.js";
import { useUserRegistry } from "@/hooks/useUserRegistry.js";
import { useInterruptExecution } from "@/hooks/useInterruptExecution.js";

import { useStore } from "@livestore/react";
import { events, tables } from "@/schema";
import { ChevronDown, ChevronUp } from "lucide-react";
import React, { useCallback, useRef } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { CellContainer } from "./shared/CellContainer.js";
import { CellControls } from "./shared/CellControls.js";
import { CellTypeSelector } from "./shared/CellTypeSelector.js";
import { Editor } from "./shared/Editor.js";
import {
  languageFromCellType,
  placeholderFromCellType,
  shouldEnableLineWrapping,
} from "./shared/editorUtils.js";
import { OutputsErrorBoundary } from "./shared/OutputsErrorBoundary.js";
import { PlayButton } from "./shared/PlayButton.js";
import { PresenceBookmarks } from "./shared/PresenceBookmarks.js";

// Import toolbars
import { CodeToolbar } from "./toolbars/CodeToolbar.js";
import { AiToolbar } from "./toolbars/AiToolbar.js";
import { SqlToolbar } from "./toolbars/SqlToolbar.js";

import { AiToolApprovalOutput } from "../../outputs/AiToolApprovalOutput.js";
import { useToolApprovals } from "@/hooks/useToolApprovals.js";

// Cell-specific styling configuration
const getCellStyling = (cellType: "code" | "sql" | "ai") => {
  switch (cellType) {
    case "sql":
      return {
        focusColor: "bg-blue-500/40",
        focusBgColor: "bg-blue-50/20",
      };
    case "ai":
      return {
        focusColor: "bg-purple-500/40",
        focusBgColor: "bg-purple-50/20",
      };
    default: // code
      return {
        focusColor: "bg-primary/60",
        focusBgColor: "bg-primary/5",
      };
  }
};

interface ExecutableCellProps {
  cell: typeof tables.cells.Type;
  onDeleteCell: () => void;
  onFocusNext?: () => void;
  onFocusPrevious?: () => void;
  autoFocus?: boolean;
  onFocus?: () => void;
  contextSelectionMode?: boolean;
}

export const ExecutableCell: React.FC<ExecutableCellProps> = ({
  cell,
  onDeleteCell,
  onFocusNext,
  onFocusPrevious,
  autoFocus = false,
  onFocus,
  contextSelectionMode = false,
}) => {
  const cellRef = useRef<HTMLDivElement>(null);

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
  const { localSource, updateSource, handleSourceChange } = useCellContent({
    cellId: cell.id,
    initialSource: cell.source,
  });

  // Use shared outputs hook with cell-type-specific configuration
  const { outputs, hasOutputs, MaybeOutputs } = useCellOutputs({
    cellId: cell.id,
    groupConsecutiveStreams: true,
    enableErrorOutput: true,
    enableTerminalOutput: true,
  });

  // Shared event handlers
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
        actorId: userId,
      })
    );
  }, [cell.id, cell.aiContextVisible, store, userId]);

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

  // Execution handler for all executable cell types
  const executeCell = useCallback(async (): Promise<void> => {
    // Use localSource instead of cell.source to get the current typed content
    const sourceToExecute = localSource || cell.source;
    if (!sourceToExecute?.trim()) {
      return;
    }

    try {
      // Clear previous outputs first
      store.commit(
        events.cellOutputsCleared({
          cellId: cell.id,
          wait: false,
          clearedBy: userId,
        })
      );

      // Generate unique queue ID
      const queueId = `exec-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
      const executionCount = (cell.executionCount || 0) + 1;

      // Add to execution queue - runtimes will pick this up
      store.commit(
        events.executionRequested({
          queueId,
          cellId: cell.id,
          executionCount,
          requestedBy: userId,
        })
      );
    } catch (error) {
      // Store error information directly
      store.commit(
        events.errorOutputAdded({
          id: `error-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          cellId: cell.id,
          position: 0,
          content: {
            type: "inline",
            data: {
              ename: "ExecutionError",
              evalue:
                error instanceof Error
                  ? error.message
                  : "Failed to queue execution request",
              traceback: ["Error occurred while emitting LiveStore event"],
            },
          },
        })
      );
    }
  }, [cell.id, localSource, cell.source, cell.executionCount, store, userId]);

  const { interruptExecution: interruptCell } = useInterruptExecution({
    cellId: cell.id,
    userId,
    reason: "User interrupted execution",
  });

  // Use shared keyboard navigation hook with cell-type-specific execution
  const { keyMap } = useCellKeyboardNavigation({
    onFocusNext,
    onFocusPrevious,
    onDeleteCell,
    onExecute: executeCell,
    onUpdateSource: updateSource,
  });

  const handleFocus = useCallback(() => {
    onFocus?.();
  }, [onFocus]);

  const { focusColor, focusBgColor } = getCellStyling(
    cell.cellType as "code" | "sql" | "ai"
  );

  return (
    <CellContainer
      ref={cellRef}
      cell={cell}
      autoFocus={autoFocus}
      contextSelectionMode={contextSelectionMode}
      onFocus={onFocus}
      focusColor={focusColor}
      focusBgColor={focusBgColor}
    >
      {/* Cell Header */}
      <div className="cell-header mb-2 flex items-center justify-between pr-1 pl-6 sm:pr-4">
        <div className="flex items-center gap-3">
          <CellTypeSelector cell={cell} onCellTypeChange={changeCellType} />

          {/* Cell-type-specific toolbars */}
          {cell.cellType === "code" && <CodeToolbar />}
          {cell.cellType === "ai" && (
            <AiToolbar
              provider={cell.aiProvider || "openai"}
              model={cell.aiModel || "gpt-4o-mini"}
              onProviderChange={(newProvider: string, newModel: string) => {
                store.commit(
                  events.aiSettingsChanged({
                    cellId: cell.id,
                    provider: newProvider,
                    model: newModel,
                    settings: {
                      temperature: 0.7,
                      maxTokens: 1000,
                    },
                  })
                );

                // Save the last used AI model to notebook metadata for future AI cells
                store.commit(
                  events.notebookMetadataSet({
                    key: "lastUsedAiProvider",
                    value: newProvider,
                  })
                );
                store.commit(
                  events.notebookMetadataSet({
                    key: "lastUsedAiModel",
                    value: newModel,
                  })
                );
              }}
            />
          )}
          {cell.cellType === "sql" && (
            <SqlToolbar
              dataConnection={cell.sqlConnectionId || "default"}
              onDataConnectionChange={(newConnectionId: string) => {
                store.commit(
                  events.sqlConnectionChanged({
                    cellId: cell.id,
                    connectionId: newConnectionId,
                    changedBy: userId,
                  })
                );

                // Save the last used SQL connection to notebook metadata for future SQL cells
                store.commit(
                  events.notebookMetadataSet({
                    key: "lastUsedSqlConnection",
                    value: newConnectionId,
                  })
                );
              }}
            />
          )}

          <ExecutionStatus executionState={cell.executionState} />
          <PresenceBookmarks
            usersOnCell={usersOnCell}
            getUserColor={getUserColor}
          />
        </div>

        <CellControls
          sourceVisible={cell.sourceVisible}
          aiContextVisible={cell.aiContextVisible}
          contextSelectionMode={contextSelectionMode}
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
              onExecute={executeCell}
              onInterrupt={interruptCell}
              className="mobile-play-btn block sm:hidden"
              primaryColor="text-foreground"
            />
          }
        />
      </div>

      {/* Cell Content with Left Gutter Play Button - Desktop Only */}
      <div className="relative">
        {/* Play Button Breaking Through Left Border - Desktop Only */}
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
            onExecute={executeCell}
            onInterrupt={interruptCell}
            size="default"
            className="h-6 w-6 rounded-sm border-0 bg-white p-0 transition-colors hover:bg-white"
            primaryColor={
              cell.cellType === "ai" ? "text-purple-600" : "text-foreground"
            }
          />
        </div>

        {/* AI Tool Approval (if any) */}
        {cell.cellType === "ai" && <MaybeInlineToolApproval cellId={cell.id} />}

        {/* Editor Content Area */}
        {cell.sourceVisible && (
          <div className="cell-content bg-white py-1 pl-4 transition-colors">
            <ErrorBoundary fallback={<div>Error rendering editor</div>}>
              <Editor
                localSource={localSource}
                handleSourceChange={handleSourceChange}
                onBlur={updateSource}
                handleFocus={handleFocus}
                language={languageFromCellType(cell.cellType)}
                placeholder={placeholderFromCellType(cell.cellType)}
                enableLineWrapping={shouldEnableLineWrapping(cell.cellType)}
                autoFocus={autoFocus}
                keyMap={keyMap}
              />
            </ErrorBoundary>
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
                ? "Executing..."
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

      {/* Output Area */}
      {cell.outputVisible &&
        (hasOutputs || cell.executionState === "running") && (
          <div className="cell-content bg-background mt-1 max-w-full overflow-hidden px-4 sm:px-4">
            {cell.executionState === "running" && !hasOutputs && (
              <div className="border-l-2 border-blue-200 py-3 pl-1">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                  <span className="text-sm text-blue-700">Executing...</span>
                </div>
              </div>
            )}
            <ErrorBoundary FallbackComponent={OutputsErrorBoundary}>
              {hasOutputs && <MaybeOutputs />}
            </ErrorBoundary>
          </div>
        )}
    </CellContainer>
  );
};

// Execution Status Component
interface ExecutionStatusProps {
  executionState: string;
}

const ExecutionStatus: React.FC<ExecutionStatusProps> = ({
  executionState,
}) => {
  switch (executionState) {
    case "idle":
      return null;
    case "queued":
      return (
        <Badge variant="secondary" className="h-5 text-xs">
          Queued
        </Badge>
      );
    case "running":
      return (
        <Badge
          variant="outline"
          className="h-5 border-blue-200 bg-blue-50 text-xs text-blue-700"
        >
          <div className="mr-1 h-2 w-2 animate-spin rounded-full border border-blue-600 border-t-transparent"></div>
          Running
        </Badge>
      );
    case "error":
      return (
        <Badge
          variant="outline"
          className="h-5 border-red-200 bg-red-50 text-xs text-red-700"
        >
          Error
        </Badge>
      );
    default:
      return null;
  }
};

// AI Tool Approval Component
const MaybeInlineToolApproval: React.FC<{
  cellId: string;
}> = ({ cellId }) => {
  const { currentApprovalRequest, respondToApproval } = useToolApprovals({
    cellId,
  });

  if (!currentApprovalRequest) {
    return null;
  }

  const handleApproval = (
    status: "approved_once" | "approved_always" | "denied"
  ) => {
    respondToApproval(currentApprovalRequest.toolCallId, status);
  };

  return (
    <div className="cell-content pr-1 pl-6 sm:pr-4">
      <AiToolApprovalOutput
        toolCallId={currentApprovalRequest.toolCallId}
        toolName={currentApprovalRequest.toolName}
        onApprove={handleApproval}
      />
    </div>
  );
};
