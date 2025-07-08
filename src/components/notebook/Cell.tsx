import { queryDb } from "@livestore/livestore";
import { useStore } from "@livestore/react";
import { events, OutputData, tables } from "@runt/schema";
import React, { useCallback } from "react";
import { useCellContent } from "../../hooks/useCellContent.js";
import { useCellKeyboardNavigation } from "../../hooks/useCellKeyboardNavigation.js";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { AiCell } from "./AiCell.js";
import { AnsiStreamOutput, AnsiErrorOutput } from "./AnsiOutput.js";
import { RichOutput } from "./RichOutput";
import { SqlCell } from "./SqlCell.js";

import {
  ArrowDown,
  ArrowUp,
  Bot,
  ChevronDown,
  ChevronUp,
  Code,
  Database,
  Eye,
  EyeOff,
  FileText,
  Play,
  Plus,
  Square,
  X,
} from "lucide-react";

import { groupConsecutiveStreamOutputs } from "../../util/output-grouping.js";
import { Editor } from "./Editor.js";

type CellType = typeof tables.cells.Type;

interface CellProps {
  cell: CellType;
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

export const Cell: React.FC<CellProps> = ({
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
  // All hooks must be called at the top level before any conditional returns
  const { store } = useStore();

  // Create stable query using useMemo to prevent React Hook issues
  const outputsQuery = React.useMemo(
    () => queryDb(tables.outputs.select().where({ cellId: cell.id })),
    [cell.id]
  );
  const outputs = store.useQuery(outputsQuery) as OutputData[];

  // Use shared content management hook
  const { localSource, updateSource, handleSourceChange } = useCellContent({
    cellId: cell.id,
    initialSource: cell.source,
  });

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

  const toggleOutputVisibility = useCallback(() => {
    store.commit(
      events.cellOutputVisibilityToggled({
        id: cell.id,
        outputVisible: !cell.outputVisible,
      })
    );
  }, [cell.id, cell.outputVisible, store]);

  const toggleAiContextVisibility = useCallback(() => {
    store.commit(
      events.cellAiContextVisibilityToggled({
        id: cell.id,
        aiContextVisible: !cell.aiContextVisible,
      })
    );
  }, [cell.id, cell.aiContextVisible, store]);

  const executeCell = useCallback(async () => {
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

      // The runtime service will now:
      // 1. See the pending execution in the queue
      // 2. Assign itself to the execution
      // 3. Execute the code
      // 4. Emit execution events and cell outputs
      // 5. All clients will see the results in real-time!
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
  }, [cell.id, localSource, cell.source, cell.executionCount, store]);

  const interruptCell = useCallback(async () => {
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
          reason: "User interrupted execution",
        })
      );
    }
  }, [cell.id, store]);

  // Use shared keyboard navigation hook
  const { keyMap } = useCellKeyboardNavigation({
    onFocusNext,
    onFocusPrevious,
    onDeleteCell,
    onExecute: cell.cellType === "code" ? executeCell : undefined,
    onUpdateSource: updateSource,
  });

  const handleFocus = useCallback(() => {
    onFocus?.();
  }, [onFocus]);

  // Route to specialized cell components
  if (cell.cellType === "sql") {
    return (
      <SqlCell
        cell={cell}
        onAddCell={onAddCell}
        onDeleteCell={onDeleteCell}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onFocusNext={onFocusNext}
        onFocusPrevious={onFocusPrevious}
        autoFocus={autoFocus}
        onFocus={onFocus}
        contextSelectionMode={contextSelectionMode}
      />
    );
  }

  if (cell.cellType === "ai") {
    return (
      <AiCell
        cell={cell}
        onAddCell={onAddCell}
        onDeleteCell={onDeleteCell}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onFocusNext={onFocusNext}
        onFocusPrevious={onFocusPrevious}
        autoFocus={autoFocus}
        onFocus={onFocus}
        contextSelectionMode={contextSelectionMode}
      />
    );
  }

  const getCellTypeIcon = () => {
    switch (cell.cellType) {
      case "code":
        return <Code className="h-3 w-3" />;
      case "markdown":
        return <FileText className="h-3 w-3" />;
      case "sql":
        return <Database className="h-3 w-3" />;
      case "ai":
        return <Bot className="h-3 w-3" />;
      default:
        return <Code className="h-3 w-3" />;
    }
  };

  const getExecutionStatus = () => {
    switch (cell.executionState) {
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

  return (
    <div
      className={`cell-container group relative mb-2 pt-2 transition-all duration-200 sm:mb-3 ${
        autoFocus && !contextSelectionMode
          ? "bg-primary/5"
          : "hover:bg-muted/10"
      } ${contextSelectionMode && !cell.aiContextVisible ? "opacity-60" : ""} ${
        contextSelectionMode
          ? cell.aiContextVisible
            ? "bg-purple-50/30 ring-2 ring-purple-300"
            : "bg-gray-50/30 ring-2 ring-gray-300"
          : ""
      }`}
    >
      {/* Custom left border with controlled height */}
      <div
        className={`cell-border absolute top-0 left-3 w-0.5 transition-all duration-200 sm:left-0 ${
          autoFocus && !contextSelectionMode ? "bg-primary/60" : "bg-border/30"
        }`}
        style={{
          height:
            outputs.length > 0 ||
            cell.executionState === "running" ||
            cell.executionState === "queued"
              ? "100%"
              : "4rem",
        }}
      />
      {/* Cell Header */}
      <div className="cell-header mb-2 flex items-center justify-between pr-1 pl-6 sm:pr-4">
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-muted/50 h-7 gap-1.5 px-2 text-xs font-medium sm:h-6"
              >
                {getCellTypeIcon()}
                <span className="cell-type-label hidden capitalize sm:inline">
                  {cell.cellType}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuItem
                onClick={() => changeCellType("code")}
                className="gap-2"
              >
                <Code className="h-4 w-4" />
                Code
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => changeCellType("markdown")}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Markdown
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => changeCellType("sql")}
                className="gap-2"
              >
                <Database className="h-4 w-4" />
                SQL Query
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => changeCellType("ai")}
                className="gap-2"
              >
                <Bot className="h-4 w-4" />
                AI Assistant
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {getExecutionStatus()}
        </div>

        {/* Cell Controls - visible on hover or always on mobile */}
        <div className="cell-controls flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          {/* Mobile Play Button - Code cells only */}
          {cell.cellType === "code" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={
                cell.executionState === "running" ||
                cell.executionState === "queued"
                  ? interruptCell
                  : executeCell
              }
              className="mobile-play-btn hover:bg-muted/80 block h-8 w-8 p-0 sm:hidden"
              title={
                cell.executionState === "running" ||
                cell.executionState === "queued"
                  ? "Stop execution"
                  : "Run cell"
              }
            >
              {cell.executionState === "running" ? (
                <Square className="h-4 w-4" />
              ) : cell.executionState === "queued" ? (
                <Square className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          )}

          <div className="flex-1" />

          {/* Add Cell Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddCell}
            className="hover:bg-muted/80 h-8 w-8 p-0 sm:h-7 sm:w-7"
            title="Add cell below"
          >
            <Plus className="h-4 w-4 sm:h-3 sm:w-3" />
          </Button>

          {/* Source Visibility Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSourceVisibility}
            className={`hover:bg-muted/80 h-8 w-8 p-0 sm:h-7 sm:w-7 ${
              cell.sourceVisible ? "" : "text-muted-foreground/60"
            }`}
            title={cell.sourceVisible ? "Hide source" : "Show source"}
          >
            {cell.sourceVisible ? (
              <ChevronUp className="h-4 w-4 sm:h-3 sm:w-3" />
            ) : (
              <ChevronDown className="h-4 w-4 sm:h-3 sm:w-3" />
            )}
          </Button>

          {/* Context Selection Mode Button */}
          {contextSelectionMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAiContextVisibility}
              className={`hover:bg-muted/80 h-8 w-8 p-0 sm:h-7 sm:w-7 ${
                cell.aiContextVisible ? "text-purple-600" : "text-gray-500"
              }`}
              title={
                cell.aiContextVisible
                  ? "Hide from AI context"
                  : "Show in AI context"
              }
            >
              {cell.aiContextVisible ? (
                <Eye className="h-4 w-4 sm:h-3 sm:w-3" />
              ) : (
                <EyeOff className="h-4 w-4 sm:h-3 sm:w-3" />
              )}
            </Button>
          )}

          {/* Desktop-only controls */}
          <div className="desktop-controls hidden items-center gap-0.5 sm:flex">
            {/* Separator */}
            <div className="bg-border/50 mx-1 h-4 w-px" />
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveUp}
              className="hover:bg-muted/80 h-7 w-7 p-0"
              title="Move cell up"
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveDown}
              className="hover:bg-muted/80 h-7 w-7 p-0"
              title="Move cell down"
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeleteCell}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
              title="Delete cell"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Cell Content with Left Gutter Play Button - Desktop Only */}
      <div className="relative">
        {/* Play Button Breaking Through Left Border - Desktop Only */}
        {cell.cellType === "code" && (
          <div
            className="desktop-play-btn absolute -left-3 z-10 hidden sm:block"
            style={{ top: cell.sourceVisible ? "0.375rem" : "-1.5rem" }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={
                cell.executionState === "running" ||
                cell.executionState === "queued"
                  ? interruptCell
                  : executeCell
              }
              className={`h-6 w-6 rounded-sm border-0 bg-white p-1 transition-colors hover:bg-white ${
                autoFocus
                  ? "text-foreground"
                  : "text-muted-foreground/40 hover:text-foreground group-hover:text-foreground"
              }`}
              title={
                cell.executionState === "running" ||
                cell.executionState === "queued"
                  ? "Stop execution"
                  : "Run cell"
              }
            >
              {cell.executionState === "running" ? (
                <Square className="h-4 w-4" />
              ) : cell.executionState === "queued" ? (
                <Square className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {/* Text Content Area */}
        {cell.sourceVisible && (
          <div
            className={`cell-content py-1 pl-4 transition-colors ${
              autoFocus ? "bg-white" : "bg-white"
            }`}
          >
            <Editor
              localSource={localSource}
              handleSourceChange={handleSourceChange}
              updateSource={updateSource}
              handleFocus={handleFocus}
              cell={cell}
              autoFocus={autoFocus}
              keyMap={keyMap}
            />
          </div>
        )}
      </div>

      {/* Execution Summary - appears after input */}
      {cell.cellType === "code" &&
        (cell.executionCount ||
          cell.executionState === "running" ||
          cell.executionState === "queued") && (
          <div className="cell-content mt-1 pr-1 pl-6 sm:pr-4">
            <div className="text-muted-foreground flex items-center justify-between pb-1 text-xs">
              <span>
                {cell.executionState === "running"
                  ? "Running..."
                  : cell.executionState === "queued"
                    ? "Queued"
                    : cell.executionCount
                      ? cell.lastExecutionDurationMs
                        ? `${
                            cell.lastExecutionDurationMs < 1000
                              ? `${cell.lastExecutionDurationMs}ms`
                              : `${(cell.lastExecutionDurationMs / 1000).toFixed(1)}s`
                          }`
                        : "Completed"
                      : null}
              </span>
              {(outputs.length > 0 || cell.executionState === "running") && (
                <div className="flex items-center gap-2">
                  {!cell.outputVisible && outputs.length > 0 && (
                    <span className="text-muted-foreground text-xs">
                      {outputs.length === 1
                        ? "1 output hidden"
                        : `${outputs.length} outputs hidden`}
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
                    title={cell.outputVisible ? "Hide output" : "Show output"}
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

      {/* Output Area for Code Cells */}
      {cell.cellType === "code" &&
        cell.outputVisible &&
        (outputs.length > 0 || cell.executionState === "running") && (
          <div className="cell-content bg-background mt-1 max-w-full overflow-hidden px-4 sm:px-4">
            {cell.executionState === "running" && outputs.length === 0 && (
              <div className="border-l-2 border-blue-200 py-3 pl-1">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                  <span className="text-sm text-blue-700">Executing...</span>
                </div>
              </div>
            )}

            {groupConsecutiveStreamOutputs(
              outputs.sort(
                (a: OutputData, b: OutputData) => a.position - b.position
              )
            ).map((output: OutputData, index: number) => (
              <div
                key={output.id}
                className={
                  index > 0 ? "border-border/30 mt-2 border-t pt-2" : ""
                }
              >
                {output.outputType === "error" ? (
                  // Use AnsiErrorOutput for colored error rendering
                  (() => {
                    let errorData;
                    try {
                      errorData =
                        typeof output.data === "string"
                          ? JSON.parse(output.data)
                          : output.data;
                    } catch {
                      errorData = {
                        ename: "Error",
                        evalue: String(output.data),
                        traceback: [],
                      };
                    }
                    return (
                      <AnsiErrorOutput
                        ename={errorData?.ename}
                        evalue={errorData?.evalue}
                        traceback={errorData?.traceback || []}
                      />
                    );
                  })()
                ) : output.outputType === "terminal" ? (
                  // Handle terminal outputs directly
                  <div className="max-w-full overflow-hidden py-2">
                    <AnsiStreamOutput
                      text={output.data || ""}
                      streamName={
                        (output.streamName as "stdout" | "stderr") || "stdout"
                      }
                    />
                  </div>
                ) : (
                  // Use RichOutput for multimedia outputs
                  <div className="max-w-full overflow-hidden py-2">
                    <RichOutput
                      data={
                        (output.outputType as string) === "markdown" ||
                        (output.outputType as string) === "terminal"
                          ? output.data || ""
                          : output.representations || {
                              "text/plain": output.data || "",
                            }
                      }
                      metadata={
                        output.metadata as Record<string, unknown> | undefined
                      }
                      outputType={output.outputType}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
};
