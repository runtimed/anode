import React, { useCallback } from "react";
import { useStore } from "@livestore/react";
import { events, SqlResultData, tables } from "@runt/schema";
import { useCellKeyboardNavigation } from "../../hooks/useCellKeyboardNavigation.js";
import { useCellContent } from "../../hooks/useCellContent.js";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  X,
} from "lucide-react";

interface SqlCellProps {
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

export const SqlCell: React.FC<SqlCellProps> = ({
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
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-focus when requested
  React.useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Use shared content management hook
  const {
    localSource: localQuery,
    updateSource: updateQuery,
    handleSourceChange,
  } = useCellContent({
    cellId: cell.id,
    initialSource: cell.source,
  });

  const executeQuery = useCallback(() => {
    if (!cell.sqlConnectionId) {
      // TODO: Show connection selection modal
      console.log("No connection selected for SQL cell");
      return;
    }

    // TODO: Implement actual SQL execution
    console.log(
      "Execute SQL query:",
      localQuery,
      "on connection:",
      cell.sqlConnectionId
    );

    // Mock execution for now
    const mockResult = {
      columns: ["id", "name", "value"],
      rows: [
        [1, "Example Row 1", 42],
        [2, "Example Row 2", 84],
      ],
      rowCount: 2,
      executionTime: "15ms",
    };

    store.commit(
      events.sqlQueryExecuted({
        cellId: cell.id,
        connectionId: cell.sqlConnectionId,
        query: localQuery,
        resultData: mockResult,
        executedBy: "current-user",
      })
    );
  }, [cell.id, cell.sqlConnectionId, localQuery, store]);

  // Use shared keyboard navigation hook
  const { handleKeyDown } = useCellKeyboardNavigation({
    onFocusNext,
    onFocusPrevious,
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

  const getCellTypeIcon = () => {
    return <Database className="h-3 w-3" />;
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
      case "completed":
        return (
          <Badge
            variant="outline"
            className="h-5 border-green-200 bg-green-50 text-xs text-green-700"
          >
            ✓
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

  const renderResults = () => {
    if (!cell.sqlResultData) return null;

    const data = cell.sqlResultData as SqlResultData;

    return (
      <div className="mt-4 space-y-3">
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <span>{data.rowCount} rows returned</span>
          <span>Executed in {data.executionTime}</span>
        </div>

        <div className="overflow-hidden rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  {data.columns.map((col) => (
                    <th key={col} className="px-3 py-2 text-left font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={i} className="border-t">
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2">
                        {String(cell ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`cell-container group relative -mx-3 mb-2 px-3 pt-2 transition-all duration-200 sm:mx-0 sm:mb-3 sm:px-0 ${
        autoFocus && !contextSelectionMode
          ? "bg-blue-50/30"
          : "hover:bg-muted/10"
      } ${contextSelectionMode && !cell.aiContextVisible ? "opacity-60" : ""} ${
        contextSelectionMode
          ? cell.aiContextVisible
            ? "bg-purple-50/30 ring-2 ring-purple-300"
            : "bg-gray-50/30 ring-2 ring-gray-300"
          : ""
      }`}
      style={{
        position: "relative",
      }}
    >
      {/* Custom left border with controlled height */}
      <div
        className={`cell-border absolute top-0 left-3 w-0.5 transition-all duration-200 sm:left-0 ${
          autoFocus && !contextSelectionMode ? "bg-blue-500/60" : "bg-border/30"
        }`}
        style={{
          height:
            cell.sqlResultData ||
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
                className="hover:bg-muted/50 h-7 gap-1.5 border border-blue-200 bg-blue-50 px-2 text-xs font-medium text-blue-700 sm:h-6"
              >
                {getCellTypeIcon()}
                <span className="cell-type-label hidden sm:inline">SQL</span>
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
          <Badge
            variant="outline"
            className="text-muted-foreground h-5 text-xs"
          >
            {cell.sqlConnectionId || "No connection"}
          </Badge>
          {getExecutionStatus()}
        </div>

        {/* Cell Controls - visible on hover or always on mobile */}
        <div className="cell-controls flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          {/* Mobile Play Button - SQL cells */}
          <Button
            variant="ghost"
            size="sm"
            onClick={executeQuery}
            disabled={
              cell.executionState === "running" ||
              cell.executionState === "queued"
            }
            className="mobile-play-btn hover:bg-muted/80 block h-8 w-8 p-0 sm:hidden"
            title="Execute SQL query"
          >
            {cell.executionState === "running" ? (
              <div className="h-4 w-4 animate-spin rounded-full border border-current border-t-transparent"></div>
            ) : cell.executionState === "queued" ? (
              <div className="h-3 w-3 rounded-full bg-amber-500"></div>
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

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

      {/* Cell Content with Desktop Play Button */}
      <div className="relative">
        {/* Desktop Play Button Breaking Through Left Border */}
        <div
          className="desktop-play-btn absolute -left-3 z-10 hidden sm:block"
          style={{ top: cell.sourceVisible ? "0.375rem" : "-1.5rem" }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={executeQuery}
            disabled={
              cell.executionState === "running" ||
              cell.executionState === "queued"
            }
            className={`h-6 w-6 rounded-sm border-0 bg-white p-0 transition-colors hover:bg-white ${
              autoFocus
                ? "text-blue-600"
                : "text-muted-foreground/40 group-hover:text-blue-600 hover:text-blue-600"
            }`}
          >
            {cell.executionState === "running" ? (
              <div className="h-3 w-3 animate-spin rounded-full border border-blue-600 border-t-transparent bg-white"></div>
            ) : cell.executionState === "queued" ? (
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            ) : (
              <Play className="h-3 w-3" />
            )}
          </Button>
        </div>

        {/* Text Content Area */}
        {cell.sourceVisible && (
          <div
            className={`cell-content py-1 pr-1 pl-4 transition-colors sm:pr-4 ${
              autoFocus ? "bg-white" : "bg-white"
            }`}
          >
            <div className="min-h-[1.5rem]">
              <Textarea
                ref={textareaRef}
                value={localQuery}
                onChange={handleSourceChange}
                onBlur={updateQuery}
                onKeyDown={handleKeyDown}
                placeholder="SELECT * FROM your_table WHERE condition = 'value';"
                className="placeholder:text-muted-foreground/60 min-h-[1.5rem] w-full resize-none border-0 bg-white px-2 py-1 font-mono shadow-none focus-visible:ring-0"
                onFocus={handleFocus}
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
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
                ? "Running query..."
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
            {cell.sqlResultData && (
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
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Query Results */}
      {cell.sqlResultData && cell.outputVisible && (
        <div className="cell-content bg-background mt-1 max-w-full overflow-hidden pr-1 pl-6 sm:pr-4">
          {renderResults()}
        </div>
      )}
    </div>
  );
};
