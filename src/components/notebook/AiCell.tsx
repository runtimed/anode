import React, { useCallback } from "react";
import { useStore } from "@livestore/react";
import { events, tables } from "@runt/schema";
import { queryDb } from "@livestore/livestore";
import { useCellKeyboardNavigation } from "../../hooks/useCellKeyboardNavigation.js";
import { useCellContent } from "../../hooks/useCellContent.js";
import { useCellOutputs } from "../../hooks/useCellOutputs.js";
import { useAvailableAiModels } from "../../util/ai-models.js";
import { AiToolbar } from "./toolbars/AiToolbar.js";
import { CodeMirrorEditor } from "./codemirror/CodeMirrorEditor.js";
import { CellContainer } from "./shared/CellContainer.js";
import { CellControls } from "./shared/CellControls.js";
import { PlayButton } from "./shared/PlayButton.js";
import { AiCellTypeSelector } from "./shared/AiCellTypeSelector.js";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import { OutputsErrorBoundary } from "./shared/OutputsErrorBoundary.js";

interface AiCellProps {
  cell: typeof tables.cells.Type;
  onAddCell: () => void;
  onDeleteCell: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onFocusNext?: () => void;
  onFocusPrevious?: () => void;
  autoFocus?: boolean;
  onFocus?: () => void;
  contextSelectionMode?: boolean;
}

export const AiCell: React.FC<AiCellProps> = ({
  cell,
  onAddCell,
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

  // Get AI model settings
  const provider = cell.aiProvider || "openai";
  const model = cell.aiModel || "gpt-4o-mini";

  // Get available AI models from runtime capabilities
  const { models: _ } = useAvailableAiModels();

  // Use shared content management hook
  const { localSource, updateSource, handleSourceChange } = useCellContent({
    cellId: cell.id,
    initialSource: cell.source,
  });

  // Use shared outputs hook with AI-specific configuration
  const { outputs, hasOutputs, MaybeOutputs } = useCellOutputs({
    cellId: cell.id,
    groupConsecutiveStreams: false,
    enableErrorOutput: true,
    enableTerminalOutput: true,
    mobileStyle: "chat-bubble",
  });

  const clearCellOutputs = useCallback(async () => {
    if (hasOutputs) {
      store.commit(
        events.cellOutputsCleared({
          cellId: cell.id,
          wait: false,
          clearedBy: "current-user",
        })
      );
    }
  }, [cell.id, store, hasOutputs]);

  const executeAiPrompt = useCallback(async () => {
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
          clearedBy: "current-user",
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
          requestedBy: "current-user",
        })
      );
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
  }, [cell.id, localSource, cell.source, cell.executionCount, store]);

  const interruptAiCell = useCallback(async () => {
    // Find the current execution in the queue for this cell
    const executionQueue = store.query(
      queryDb(tables.executionQueue.select().where({ cellId: cell.id }))
    );

    const currentExecution = executionQueue.find(
      (exec: any) =>
        exec.status === "executing" ||
        exec.status === "pending" ||
        exec.status === "assigned"
    );

    if (currentExecution) {
      store.commit(
        events.executionCancelled({
          queueId: currentExecution.id,
          cellId: cell.id,
          cancelledBy: "current-user",
          reason: "User interrupted AI execution",
        })
      );
    }
  }, [cell.id, store]);

  // Use shared keyboard navigation hook
  const { keyMap } = useCellKeyboardNavigation({
    onFocusNext,
    onFocusPrevious,
    onDeleteCell,
    onExecute: executeAiPrompt,
    onUpdateSource: updateSource,
  });

  const handleFocus = useCallback(() => {
    if (onFocus) {
      onFocus();
    }
  }, [onFocus]);

  const changeProvider = useCallback(
    (newProvider: string, newModel: string) => {
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
    },
    [cell.id, store]
  );

  const changeCellType = useCallback(
    (newType: "code" | "markdown" | "sql" | "ai") => {
      store.commit(
        events.cellTypeChanged({
          id: cell.id,
          cellType: newType,
        })
      );
    },
    [cell.id, store]
  );

  const toggleSourceVisibility = useCallback(() => {
    store.commit(
      events.cellSourceVisibilityToggled({
        id: cell.id,
        sourceVisible: !cell.sourceVisible,
      })
    );
  }, [cell.id, cell.sourceVisible, store]);

  const toggleAiContextVisibility = useCallback(() => {
    store.commit(
      events.cellAiContextVisibilityToggled({
        id: cell.id,
        aiContextVisible: !cell.aiContextVisible,
      })
    );
  }, [cell.id, cell.aiContextVisible, store]);

  const toggleOutputVisibility = useCallback(() => {
    store.commit(
      events.cellOutputVisibilityToggled({
        id: cell.id,
        outputVisible: !cell.outputVisible,
      })
    );
  }, [cell.id, cell.outputVisible, store]);

  return (
    <CellContainer
      cell={cell}
      autoFocus={autoFocus}
      contextSelectionMode={contextSelectionMode}
      onFocus={handleFocus}
      focusColor="bg-purple-500/60"
      focusBgColor="bg-purple-50/30"
    >
      {/* Cell Header */}
      <div className="cell-header mb-2 flex items-center justify-between pr-1 pl-6 sm:pr-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <AiCellTypeSelector onCellTypeChange={changeCellType} />
          <AiToolbar
            provider={provider}
            model={model}
            onProviderChange={changeProvider}
          />
        </div>

        <CellControls
          cell={cell}
          contextSelectionMode={contextSelectionMode}
          onAddCell={onAddCell}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onDeleteCell={onDeleteCell}
          onClearOutputs={clearCellOutputs}
          hasOutputs={hasOutputs}
          toggleSourceVisibility={toggleSourceVisibility}
          toggleAiContextVisibility={toggleAiContextVisibility}
          playButton={
            <PlayButton
              cell={cell}
              autoFocus={autoFocus}
              onExecute={executeAiPrompt}
              onInterrupt={interruptAiCell}
              className="mobile-play-btn block sm:hidden"
              primaryColor="text-purple-600"
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
            top: cell.sourceVisible ? "0.3rem" : "-1.5rem",
          }}
        >
          <PlayButton
            cell={cell}
            autoFocus={autoFocus}
            onExecute={executeAiPrompt}
            onInterrupt={interruptAiCell}
            size="default"
            className="h-6 w-6 rounded-sm border-0 bg-white p-0 transition-colors hover:bg-white"
            primaryColor="text-purple-600"
          />
        </div>

        {/* Editor Content Area */}
        {cell.sourceVisible && (
          <div className="cell-content bg-white py-1 pl-4 transition-colors">
            <div className="relative min-h-[1.5rem]">
              <CodeMirrorEditor
                className="text-base sm:text-sm"
                language="markdown"
                placeholder="Ask me anything about your notebook, data, or analysis..."
                value={localSource}
                onValueChange={handleSourceChange}
                autoFocus={autoFocus}
                onFocus={handleFocus}
                keyMap={keyMap}
                onBlur={updateSource}
                enableLineWrapping={true}
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
                ? "Generating AI response..."
                : cell.executionState === "queued"
                  ? "Queued for AI processing"
                  : cell.executionCount
                    ? cell.lastExecutionDurationMs
                      ? `Generated in ${
                          cell.lastExecutionDurationMs < 1000
                            ? `${cell.lastExecutionDurationMs}ms`
                            : `${(cell.lastExecutionDurationMs / 1000).toFixed(1)}s`
                        }`
                      : "Generated"
                    : null}
            </span>
            {(outputs.length > 0 || cell.executionState === "running") && (
              <div className="flex items-center gap-2">
                {!cell.outputVisible && hasOutputs && (
                  <span className="text-muted-foreground text-xs">
                    {outputs.length === 1
                      ? "1 response hidden"
                      : `${outputs.length} responses hidden`}
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
                  title={cell.outputVisible ? "Hide response" : "Show response"}
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
