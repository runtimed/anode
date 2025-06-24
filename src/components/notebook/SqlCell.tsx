import React, { useCallback, useState } from "react";
import { useStore } from "@livestore/react";
import { events, SqlResultData, tables } from "@runt/schema";
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
  const [localQuery, setLocalQuery] = useState(cell.source);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-focus when requested
  React.useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Sync local source with cell source
  React.useEffect(() => {
    setLocalQuery(cell.source);
  }, [cell.source]);

  const updateQuery = useCallback(() => {
    if (localQuery !== cell.source) {
      store.commit(events.cellSourceChanged({
        id: cell.id,
        source: localQuery,
        modifiedBy: "current-user",
      }));
    }
  }, [localQuery, cell.source, cell.id, store]);

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
      cell.sqlConnectionId,
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

    store.commit(events.sqlQueryExecuted({
      cellId: cell.id,
      connectionId: cell.sqlConnectionId,
      query: localQuery,
      resultData: mockResult,
      executedBy: "current-user",
    }));
  }, [cell.id, cell.sqlConnectionId, localQuery, store]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const textarea = e.currentTarget;
      const { selectionStart, selectionEnd, value } = textarea;

      // Handle Home/End keys to prevent page navigation
      if (e.key === "Home" || e.key === "End") {
        // Let the textarea handle Home/End internally, but stop propagation to prevent page scroll
        e.stopPropagation();
        return;
      }

      // Handle arrow key navigation between cells
      if (e.key === "ArrowUp" && selectionStart === selectionEnd) {
        // For empty cells or cursor at beginning of first line
        const beforeCursor = value.substring(0, selectionStart);
        const isAtTop = selectionStart === 0 || !beforeCursor.includes("\n");

        if (isAtTop && onFocusPrevious) {
          e.preventDefault();
          updateQuery();
          onFocusPrevious();
          return;
        }
      } else if (e.key === "ArrowDown" && selectionStart === selectionEnd) {
        // For empty cells or cursor at end of last line
        const afterCursor = value.substring(selectionEnd);
        const isAtBottom = selectionEnd === value.length ||
          !afterCursor.includes("\n");

        if (isAtBottom && onFocusNext) {
          e.preventDefault();
          updateQuery();
          onFocusNext();
          return;
        }
      }

      if (e.key === "Enter" && e.shiftKey) {
        // Shift+Enter: Run query and move to next (or create new cell if at end)
        e.preventDefault();
        updateQuery();
        executeQuery();
        if (onFocusNext) {
          onFocusNext(); // Move to next cell (or create new if at end)
        }
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        // Ctrl/Cmd+Enter: Run query but stay in current cell
        e.preventDefault();
        updateQuery();
        executeQuery();
      }
    },
    [updateQuery, executeQuery, onAddCell, onFocusNext, onFocusPrevious],
  );

  const handleFocus = useCallback(() => {
    if (onFocus) {
      onFocus();
    }
  }, [onFocus]);

  const changeCellType = useCallback(
    (newType: "code" | "markdown" | "sql" | "ai") => {
      store.commit(events.cellTypeChanged({
        id: cell.id,
        cellType: newType,
      }));
    },
    [cell.id, store],
  );

  const toggleSourceVisibility = useCallback(() => {
    store.commit(events.cellSourceVisibilityToggled({
      id: cell.id,
      sourceVisible: !cell.sourceVisible,
    }));
  }, [cell.id, cell.sourceVisible, store]);

  const toggleOutputVisibility = useCallback(() => {
    store.commit(events.cellOutputVisibilityToggled({
      id: cell.id,
      outputVisible: !cell.outputVisible,
    }));
  }, [cell.id, cell.outputVisible, store]);

  const toggleAiContextVisibility = useCallback(() => {
    store.commit(events.cellAiContextVisibilityToggled({
      id: cell.id,
      aiContextVisible: !cell.aiContextVisible,
    }));
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
            className="h-5 text-xs border-blue-200 text-blue-700 bg-blue-50"
          >
            <div className="animate-spin w-2 h-2 border border-blue-600 border-t-transparent rounded-full mr-1">
            </div>
            Running
          </Badge>
        );
      case "completed":
        return (
          <Badge
            variant="outline"
            className="h-5 text-xs border-green-200 text-green-700 bg-green-50"
          >
            ✓
          </Badge>
        );
      case "error":
        return (
          <Badge
            variant="outline"
            className="h-5 text-xs border-red-200 text-red-700 bg-red-50"
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
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{data.rowCount} rows returned</span>
          <span>Executed in {data.executionTime}</span>
        </div>

        <div className="border rounded-md overflow-hidden">
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
      className={`cell-container mb-2 sm:mb-3 relative group transition-all duration-200 pt-2 -mx-3 sm:mx-0 px-3 sm:px-0 ${
        autoFocus && !contextSelectionMode
          ? "bg-blue-50/30"
          : "hover:bg-muted/10"
      } ${contextSelectionMode && !cell.aiContextVisible ? "opacity-60" : ""} ${
        contextSelectionMode
          ? (cell.aiContextVisible
            ? "ring-2 ring-purple-300 bg-purple-50/30"
            : "ring-2 ring-gray-300 bg-gray-50/30")
          : ""
      }`}
      style={{
        position: "relative",
      }}
    >
      {/* Custom left border with controlled height */}
      <div
        className={`cell-border absolute left-3 sm:left-0 top-0 w-0.5 transition-all duration-200 ${
          autoFocus && !contextSelectionMode ? "bg-blue-500/60" : "bg-border/30"
        }`}
        style={{
          height: cell.sqlResultData || cell.executionState === "running" ||
              cell.executionState === "queued"
            ? "100%"
            : "4rem",
        }}
      />
      {/* Cell Header */}
      <div className="cell-header flex items-center justify-between mb-2 pl-6 pr-1 sm:pr-4">
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 sm:h-6 px-2 gap-1.5 text-xs font-medium hover:bg-muted/50 bg-blue-50 text-blue-700 border border-blue-200"
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
            className="h-5 text-xs text-muted-foreground"
          >
            {cell.sqlConnectionId || "No connection"}
          </Badge>
          {getExecutionStatus()}
        </div>

        {/* Cell Controls - visible on hover or always on mobile */}
        <div className="cell-controls flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {/* Mobile Play Button - SQL cells */}
          <Button
            variant="ghost"
            size="sm"
            onClick={executeQuery}
            disabled={cell.executionState === "running" ||
              cell.executionState === "queued"}
            className="mobile-play-btn block sm:hidden h-8 w-8 p-0 hover:bg-muted/80"
            title="Execute SQL query"
          >
            {cell.executionState === "running"
              ? (
                <div className="animate-spin w-4 h-4 border border-current border-t-transparent rounded-full">
                </div>
              )
              : cell.executionState === "queued"
              ? <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              : <Play className="h-4 w-4" />}
          </Button>

          <div className="flex-1" />

          {/* Add Cell Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddCell}
            className="h-8 w-8 sm:h-7 sm:w-7 p-0 hover:bg-muted/80"
            title="Add cell below"
          >
            <Plus className="h-4 w-4 sm:h-3 sm:w-3" />
          </Button>

          {/* Source Visibility Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSourceVisibility}
            className={`h-8 w-8 sm:h-7 sm:w-7 p-0 hover:bg-muted/80 ${
              cell.sourceVisible ? "" : "text-muted-foreground/60"
            }`}
            title={cell.sourceVisible ? "Hide source" : "Show source"}
          >
            {cell.sourceVisible
              ? <ChevronUp className="h-4 w-4 sm:h-3 sm:w-3" />
              : <ChevronDown className="h-4 w-4 sm:h-3 sm:w-3" />}
          </Button>

          {/* Context Selection Mode Button */}
          {contextSelectionMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAiContextVisibility}
              className={`h-8 w-8 sm:h-7 sm:w-7 p-0 hover:bg-muted/80 ${
                cell.aiContextVisible ? "text-purple-600" : "text-gray-500"
              }`}
              title={cell.aiContextVisible
                ? "Hide from AI context"
                : "Show in AI context"}
            >
              {cell.aiContextVisible
                ? <Eye className="h-4 w-4 sm:h-3 sm:w-3" />
                : <EyeOff className="h-4 w-4 sm:h-3 sm:w-3" />}
            </Button>
          )}

          {/* Desktop-only controls */}
          <div className="desktop-controls hidden sm:flex items-center gap-0.5">
            {/* Separator */}
            <div className="w-px h-4 bg-border/50 mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveUp}
              className="h-7 w-7 p-0 hover:bg-muted/80"
              title="Move cell up"
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveDown}
              className="h-7 w-7 p-0 hover:bg-muted/80"
              title="Move cell down"
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeleteCell}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
          className="desktop-play-btn hidden sm:block absolute -left-3 z-10"
          style={{ top: cell.sourceVisible ? "0.375rem" : "-1.5rem" }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={executeQuery}
            disabled={cell.executionState === "running" ||
              cell.executionState === "queued"}
            className={`h-6 w-6 p-0 rounded-sm bg-white border-0 hover:bg-white transition-colors ${
              autoFocus
                ? "text-blue-600"
                : "text-muted-foreground/40 hover:text-blue-600 group-hover:text-blue-600"
            }`}
          >
            {cell.executionState === "running"
              ? (
                <div className="animate-spin w-3 h-3 border border-blue-600 border-t-transparent rounded-full bg-white">
                </div>
              )
              : cell.executionState === "queued"
              ? <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              : <Play className="h-3 w-3" />}
          </Button>
        </div>

        {/* Text Content Area */}
        {cell.sourceVisible && (
          <div
            className={`cell-content transition-colors py-1 pl-4 pr-1 sm:pr-4 ${
              autoFocus ? "bg-white" : "bg-white"
            }`}
          >
            <div className="min-h-[1.5rem]">
              <Textarea
                ref={textareaRef}
                value={localQuery}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setLocalQuery(e.target.value)}
                onBlur={updateQuery}
                onKeyDown={handleKeyDown}
                placeholder="SELECT * FROM your_table WHERE condition = 'value';"
                className="min-h-[1.5rem] resize-none border-0 px-2 py-1 focus-visible:ring-0 font-mono bg-white w-full placeholder:text-muted-foreground/60 shadow-none"
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
      {(cell.executionCount || cell.executionState === "running" ||
        cell.executionState === "queued") && (
        <div className="cell-content mt-1 pl-6 pr-1 sm:pr-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
            <span>
              {cell.executionState === "running"
                ? (
                  "Running query..."
                )
                : cell.executionState === "queued"
                ? (
                  "Queued"
                )
                : cell.executionCount
                ? (
                  cell.lastExecutionDurationMs
                    ? `${
                      cell.lastExecutionDurationMs < 1000
                        ? `${cell.lastExecutionDurationMs}ms`
                        : `${(cell.lastExecutionDurationMs / 1000).toFixed(1)}s`
                    }`
                    : "Completed"
                )
                : null}
            </span>
            {cell.sqlResultData && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleOutputVisibility}
                className={`h-6 w-6 sm:h-5 sm:w-5 p-0 hover:bg-muted/80 transition-opacity ${
                  autoFocus
                    ? "opacity-100"
                    : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                } ${cell.outputVisible ? "" : "text-muted-foreground/60"}`}
                title={cell.outputVisible ? "Hide output" : "Show output"}
              >
                {cell.outputVisible
                  ? <ChevronUp className="h-3 w-3" />
                  : <ChevronDown className="h-3 w-3" />}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Query Results */}
      {cell.sqlResultData && cell.outputVisible && (
        <div className="cell-content mt-1 pl-6 pr-1 sm:pr-4 bg-background overflow-hidden max-w-full">
          {renderResults()}
        </div>
      )}
    </div>
  );
};
