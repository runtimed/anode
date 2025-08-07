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
import { ChevronDown, ChevronUp, Edit3, Eye } from "lucide-react";
import React, { useCallback, useRef, useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { CellContainer } from "./shared/CellContainer.js";
import { CellControls } from "./shared/CellControls.js";
import { CellTypeSelector } from "./shared/CellTypeSelector.js";
import { OutputsErrorBoundary } from "./shared/OutputsErrorBoundary.js";
import { PlayButton } from "./shared/PlayButton.js";
import { PresenceBookmarks } from "./shared/PresenceBookmarks.js";

// Import toolbars
import { CodeToolbar } from "./toolbars/CodeToolbar.js";
import { AiToolbar } from "./toolbars/AiToolbar.js";
import { SqlToolbar } from "./toolbars/SqlToolbar.js";
import { AiCellTypeSelector } from "./shared/AiCellTypeSelector.js";

// Import cell-type-specific content components
import { CodeCellContent } from "./content/CodeCellContent.js";
import { MarkdownCellContent } from "./content/MarkdownCellContent.js";
import { AiCellContent } from "./content/AiCellContent.js";
import { SqlCellContent } from "./content/SqlCellContent.js";

interface UniversalCellProps {
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

export interface CellContentProps {
  cell: typeof tables.cells.Type;
  localSource: string;
  handleSourceChange: (value: string) => void;
  updateSource: () => void;
  autoFocus: boolean;
  onFocus: () => void;
  keyMap: any[];
  executeCell?: () => Promise<void>;
  interruptCell?: () => Promise<void>;
  outputs: any[];
  hasOutputs: boolean;
  MaybeOutputs: React.ComponentType;
  // Markdown-specific props
  isEditing?: boolean;
  setIsEditing?: (editing: boolean) => void;
}

export const UniversalCell: React.FC<UniversalCellProps> = ({
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
  const cellRef = useRef<HTMLDivElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const { store } = useStore();
  const {
    user: { sub: userId },
  } = useAuth();
  const { getUsersOnCell, getUserColor } = useUserRegistry();

  // Markdown-specific state - only start in editing mode for new markdown cells
  const [isEditing, setIsEditing] = useState(() => {
    return cell.cellType === "markdown" && autoFocus && !cell.source;
  });

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
    groupConsecutiveStreams: cell.cellType === "ai" ? false : true,
    enableErrorOutput: true,
    enableTerminalOutput: true,
    mobileStyle: cell.cellType === "ai" ? "chat-bubble" : "default",
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

  // Default execution handler (for code/sql cells)
  const executeCell = useCallback(async (): Promise<void> => {
    console.log(
      "🔧 executeCell called for cell:",
      cell.id,
      "cellType:",
      cell.cellType
    );
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
      console.error("❌ LiveStore execution error:", error);

      // Store error information directly
      store.commit(
        events.errorOutputAdded({
          id: `error-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          cellId: cell.id,
          position: 0,
          content: {
            type: "inline",
            data: {
              ename: "LiveStoreError",
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

  // AI-specific execution handler
  const executeAiPrompt = useCallback(async (): Promise<void> => {
    console.log("🤖 AI executeAiPrompt called for cell:", cell.id);
    const sourceToExecute = localSource || cell.source;
    console.log("🤖 Source to execute:", sourceToExecute);
    if (!sourceToExecute?.trim()) {
      console.log("🤖 No source to execute, returning");
      return;
    }

    console.log("🤖 Starting AI execution...");
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
      console.log("🤖 Committing executionRequested event:", {
        queueId,
        cellId: cell.id,
        executionCount,
        requestedBy: userId,
      });
      store.commit(
        events.executionRequested({
          queueId,
          cellId: cell.id,
          executionCount,
          requestedBy: userId,
        })
      );
      console.log("🤖 AI execution request committed successfully");
    } catch (error) {
      console.error("❌ LiveStore AI execution error:", error);

      // Store error information directly
      store.commit(
        events.errorOutputAdded({
          id: `error-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          cellId: cell.id,
          position: 0,
          content: {
            type: "inline",
            data: {
              ename: "AIExecutionError",
              evalue:
                error instanceof Error
                  ? error.message
                  : "Failed to queue AI execution request",
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
    onExecute: () => {
      console.log("⌨️ Keyboard execute triggered for cellType:", cell.cellType);
      const handler = cell.cellType === "ai" ? executeAiPrompt : executeCell;
      handler();
    },
    onUpdateSource: updateSource,
  });

  const handleFocus = useCallback(() => {
    onFocus?.();
  }, [onFocus]);

  // Determine cell-specific styling
  const getCellStyling = () => {
    switch (cell.cellType) {
      case "markdown":
        return {
          focusColor: "bg-amber-500/40",
          focusBgColor: "bg-amber-50/20",
        };
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

  const { focusColor, focusBgColor } = getCellStyling();

  // Prepare props for cell-type-specific content
  const contentProps: CellContentProps = {
    cell,
    localSource,
    handleSourceChange,
    updateSource,
    autoFocus,
    onFocus: handleFocus,
    keyMap,
    executeCell: cell.cellType === "ai" ? executeAiPrompt : executeCell,
    interruptCell,
    outputs,
    hasOutputs,
    MaybeOutputs,
    // Markdown-specific props
    isEditing,
    setIsEditing,
  };

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
          {cell.cellType === "ai" ? (
            <AiCellTypeSelector onCellTypeChange={changeCellType} />
          ) : (
            <CellTypeSelector cell={cell} onCellTypeChange={changeCellType} />
          )}

          {/* Cell-type-specific toolbars */}
          {cell.cellType === "code" && <CodeToolbar />}
          {cell.cellType === "markdown" &&
            (isEditing ? (
              <Button
                variant="outline"
                size="xs"
                ref={editButtonRef}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsEditing(false);
                }}
              >
                <Eye className="size-4" /> Preview
              </Button>
            ) : (
              <Button
                variant="outline"
                size="xs"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsEditing(true);
                }}
              >
                <Edit3 className="size-4" /> Edit
              </Button>
            ))}
          {cell.cellType === "ai" && (
            <AiToolbar
              provider={cell.aiProvider || "openai"}
              model={cell.aiModel || "gpt-4o-mini"}
              onProviderChange={() => {
                // TODO: Implement AI model change events
                console.log("AI model change not implemented yet");
              }}
            />
          )}
          {cell.cellType === "sql" && (
            <SqlToolbar
              dataConnection={cell.dataConnection || "default"}
              onDataConnectionChange={() => {
                // TODO: Implement data connection change events
                console.log("Data connection change not implemented yet");
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
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onDeleteCell={onDeleteCell}
          onClearOutputs={clearCellOutputs}
          hasOutputs={hasOutputs}
          toggleSourceVisibility={toggleSourceVisibility}
          toggleAiContextVisibility={toggleAiContextVisibility}
          playButton={
            // Only show mobile play button for executable cell types
            cell.cellType === "code" ||
            cell.cellType === "sql" ||
            cell.cellType === "ai" ? (
              <PlayButton
                executionState={cell.executionState}
                cellType={cell.cellType}
                autoFocus={autoFocus}
                onExecute={() => {
                  console.log(
                    "📱 Mobile PlayButton clicked for cellType:",
                    cell.cellType
                  );
                  const handler =
                    cell.cellType === "ai" ? executeAiPrompt : executeCell;
                  handler();
                }}
                onInterrupt={interruptCell}
                className="mobile-play-btn block sm:hidden"
                primaryColor="text-foreground"
              />
            ) : undefined
          }
        />
      </div>

      {/* Cell Content with Left Gutter Play Button - Desktop Only */}
      <div className="relative">
        {/* Play Button Breaking Through Left Border - Desktop Only (for executable cells) */}
        {(cell.cellType === "code" ||
          cell.cellType === "sql" ||
          cell.cellType === "ai") && (
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
              onExecute={() => {
                console.log(
                  "🖥️ Desktop PlayButton clicked for cellType:",
                  cell.cellType
                );
                const handler =
                  cell.cellType === "ai" ? executeAiPrompt : executeCell;
                handler();
              }}
              onInterrupt={interruptCell}
              size="default"
              className="h-6 w-6 rounded-sm border-0 bg-white p-0 transition-colors hover:bg-white"
              primaryColor={
                cell.cellType === "ai" ? "text-purple-600" : "text-foreground"
              }
            />
          </div>
        )}

        {/* Render cell-type-specific content */}
        <ErrorBoundary fallback={<div>Error rendering cell content</div>}>
          {cell.cellType === "code" && <CodeCellContent {...contentProps} />}
          {cell.cellType === "markdown" && (
            <MarkdownCellContent {...contentProps} />
          )}
          {cell.cellType === "ai" && <AiCellContent {...contentProps} />}
          {cell.cellType === "sql" && <SqlCellContent {...contentProps} />}
        </ErrorBoundary>
      </div>

      {/* Execution Summary - appears after input (for executable cells) */}
      {(cell.cellType === "code" ||
        cell.cellType === "sql" ||
        cell.cellType === "ai") &&
        (cell.executionCount ||
          cell.executionState === "running" ||
          cell.executionState === "queued") && (
          <div className="cell-content mt-1 pr-1 pl-6 sm:pr-4">
            <div className="text-muted-foreground flex items-center justify-between pb-1 text-xs">
              <span>
                {cell.executionState === "running"
                  ? cell.cellType === "ai"
                    ? "Generating AI response..."
                    : "Executing..."
                  : cell.executionState === "queued"
                    ? cell.cellType === "ai"
                      ? "Queued for AI processing"
                      : "Queued for execution"
                    : cell.executionCount
                      ? cell.lastExecutionDurationMs
                        ? cell.cellType === "ai"
                          ? `Generated in ${
                              cell.lastExecutionDurationMs < 1000
                                ? `${cell.lastExecutionDurationMs}ms`
                                : `${(cell.lastExecutionDurationMs / 1000).toFixed(1)}s`
                            }`
                          : `Executed in ${
                              cell.lastExecutionDurationMs < 1000
                                ? `${cell.lastExecutionDurationMs}ms`
                                : `${(cell.lastExecutionDurationMs / 1000).toFixed(1)}s`
                            }`
                        : cell.cellType === "ai"
                          ? "Generated"
                          : "Executed"
                      : null}
              </span>
              {(outputs.length > 0 || cell.executionState === "running") && (
                <div className="flex items-center gap-2">
                  {!cell.outputVisible && hasOutputs && (
                    <span className="text-muted-foreground text-xs">
                      {cell.cellType === "ai"
                        ? outputs.length === 1
                          ? "1 response hidden"
                          : `${outputs.length} responses hidden`
                        : outputs.length === 1
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
                    title={
                      cell.outputVisible
                        ? cell.cellType === "ai"
                          ? "Hide response"
                          : "Hide results"
                        : cell.cellType === "ai"
                          ? "Show response"
                          : "Show results"
                    }
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

      {/* Output Area (for executable cells) */}
      {(cell.cellType === "code" ||
        cell.cellType === "sql" ||
        cell.cellType === "ai") &&
        cell.outputVisible &&
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
