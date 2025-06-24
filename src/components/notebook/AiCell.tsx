import React, { useCallback, useState } from "react";
import { useStore } from "@livestore/react";
import { events, isErrorOutput, OutputData, tables } from "@runt/schema";
import { queryDb } from "@livestore/livestore";
import { groupConsecutiveStreamOutputs } from "../../util/output-grouping.js";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RichOutput } from "./RichOutput.js";
import { AnsiErrorOutput } from "./AnsiOutput.js";
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
  const [localSource, setLocalSource] = useState(cell.source);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Create stable query using useMemo to prevent React Hook issues
  const outputsQuery = React.useMemo(
    () => queryDb(tables.outputs.select().where({ cellId: cell.id })),
    [cell.id],
  );
  const outputs = store.useQuery(outputsQuery) as OutputData[];

  const provider = cell.aiProvider || "openai";
  const model = cell.aiModel || "gpt-4o-mini";

  // Auto-focus when requested
  React.useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Sync local source with cell source
  React.useEffect(() => {
    setLocalSource(cell.source);
  }, [cell.source]);

  const updateSource = useCallback(() => {
    if (localSource !== cell.source) {
      store.commit(
        events.cellSourceChanged({
          id: cell.id,
          source: localSource,
          modifiedBy: "current-user",
        }),
      );
    }
  }, [localSource, cell.source, cell.id, store]);

  const executeAiPrompt = useCallback(async () => {
    // Use localSource instead of cell.source to get the current typed content
    const sourceToExecute = localSource || cell.source;
    if (!sourceToExecute?.trim()) {
      console.log("No prompt to execute");
      return;
    }

    console.log("🤖 Executing AI prompt via execution queue:", cell.id);

    try {
      // Clear previous outputs first
      store.commit(
        events.cellOutputsCleared({
          cellId: cell.id,
          clearedBy: "current-user",
        }),
      );

      // Generate unique queue ID
      const queueId = `exec-${Date.now()}-${
        Math.random().toString(36).slice(2)
      }`;
      const executionCount = (cell.executionCount || 0) + 1;

      // Add to execution queue - kernels will pick this up
      store.commit(
        events.executionRequested({
          queueId,
          cellId: cell.id,
          executionCount,
          requestedBy: "current-user",
          priority: 1,
        }),
      );

      console.log("✅ AI execution queued with ID:", queueId);

      // The kernel service will now:
      // 1. See the pending execution in the queue
      // 2. Recognize it's an AI cell and handle accordingly
      // 3. Make the AI API call (OpenAI, Anthropic, etc.)
      // 4. Emit execution events and cell outputs
      // 5. All clients will see the results in real-time!
    } catch (error) {
      console.error("❌ LiveStore AI execution error:", error);

      // Store error information directly
      store.commit(
        events.cellOutputAdded({
          id: `error-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          cellId: cell.id,
          outputType: "error",
          data: {
            ename: "AIExecutionError",
            evalue: error instanceof Error
              ? error.message
              : "Failed to queue AI execution request",
            traceback: ["Error occurred while emitting LiveStore event"],
          },
          position: 0,
        }),
      );
    }
  }, [cell.id, localSource, cell.executionCount, store]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const textarea = e.currentTarget;
      const { selectionStart, selectionEnd, value } = textarea;

      // Handle arrow key navigation between cells
      if (e.key === "ArrowUp" && selectionStart === selectionEnd) {
        // For empty cells or cursor at beginning of first line
        const beforeCursor = value.substring(0, selectionStart);
        const isAtTop = selectionStart === 0 || !beforeCursor.includes("\n");

        if (isAtTop && onFocusPrevious) {
          e.preventDefault();
          updateSource();
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
          updateSource();
          onFocusNext();
          return;
        }
      }

      // Handle execution shortcuts
      if (e.key === "Enter" && e.shiftKey) {
        // Shift+Enter: Run cell and move to next (or create new cell if at end)
        e.preventDefault();
        updateSource();
        executeAiPrompt();
        if (onFocusNext) {
          onFocusNext(); // Move to next cell (or create new if at end)
        }
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        // Ctrl/Cmd+Enter: Run cell but stay in current cell
        e.preventDefault();
        updateSource();
        executeAiPrompt();
        // Don't call onAddCell() - stay in current cell
      }
    },
    [updateSource, executeAiPrompt, onAddCell, onFocusNext, onFocusPrevious],
  );

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
        }),
      );
    },
    [cell.id, store],
  );

  const toggleSourceVisibility = useCallback(() => {
    store.commit(
      events.cellSourceVisibilityToggled({
        id: cell.id,
        sourceVisible: !cell.sourceVisible,
      }),
    );
  }, [cell.id, cell.sourceVisible, store]);

  const toggleOutputVisibility = useCallback(() => {
    store.commit(
      events.cellOutputVisibilityToggled({
        id: cell.id,
        outputVisible: !cell.outputVisible,
      }),
    );
  }, [cell.id, cell.outputVisible, store]);

  const toggleAiContextVisibility = useCallback(() => {
    store.commit(
      events.cellAiContextVisibilityToggled({
        id: cell.id,
        aiContextVisible: !cell.aiContextVisible,
      }),
    );
  }, [cell.id, cell.aiContextVisible, store]);

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
        }),
      );
    },
    [cell.id, store],
  );

  const getCellTypeIcon = () => {
    return <Bot className="h-3 w-3" />;
  };

  const getProviderBadge = () => {
    const colors = {
      openai: "text-green-700 bg-green-50 border-green-200",
      anthropic: "text-orange-700 bg-orange-50 border-orange-200",
      local: "text-purple-700 bg-purple-50 border-purple-200",
    };
    return (
      <Badge
        variant="outline"
        className={`h-5 text-xs cursor-pointer hover:opacity-80 ${
          colors[provider as keyof typeof colors] || "bg-gray-50"
        }`}
      >
        {provider.toUpperCase()} • {model}
      </Badge>
    );
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
            className="h-5 text-xs border-purple-200 text-purple-700 bg-purple-50"
          >
            <div className="animate-spin w-2 h-2 border border-purple-600 border-t-transparent rounded-full mr-1">
            </div>
            Generating
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

  return (
    <div
      className={`cell-container mb-2 sm:mb-3 relative group transition-all duration-200 pt-2 -mx-3 sm:mx-0 px-3 sm:px-0 ${
        autoFocus && !contextSelectionMode
          ? "bg-purple-50/30"
          : "hover:bg-muted/10"
      } ${contextSelectionMode && !cell.aiContextVisible ? "opacity-60" : ""} ${
        contextSelectionMode
          ? cell.aiContextVisible
            ? "ring-2 ring-purple-300 bg-purple-50/30"
            : "ring-2 ring-gray-300 bg-gray-50/30"
          : ""
      }`}
      style={{
        position: "relative",
      }}
    >
      {/* Custom left border with controlled height */}
      <div
        className={`cell-border absolute left-3 sm:left-0 top-0 w-0.5 transition-all duration-200 ${
          autoFocus && !contextSelectionMode
            ? "bg-purple-500/60"
            : "bg-border/30"
        }`}
        style={{
          height: outputs.length > 0 ||
              cell.executionState === "running" ||
              cell.executionState === "queued"
            ? "100%"
            : "4rem",
        }}
      />
      {/* Cell Header */}
      <div className="cell-header flex items-center justify-between mb-2 pl-6 pr-1 sm:pr-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 sm:h-6 px-2 gap-1.5 text-xs font-medium hover:bg-muted/50 bg-purple-50 text-purple-700 border border-purple-200"
              >
                {getCellTypeIcon()}
                <span className="cell-type-label hidden sm:inline">AI</span>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="provider-badge hidden sm:block">
                {getProviderBadge()}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => changeProvider("openai", "gpt-4o")}
              >
                OpenAI GPT-4o
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => changeProvider("openai", "gpt-4o-mini")}
              >
                OpenAI GPT-4o Mini
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => changeProvider("openai", "gpt-4")}
              >
                OpenAI GPT-4 (Legacy)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => changeProvider("openai", "gpt-3.5-turbo")}
              >
                OpenAI GPT-3.5 Turbo
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => changeProvider("anthropic", "claude-3-sonnet")}
              >
                Anthropic Claude 3 Sonnet
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => changeProvider("anthropic", "claude-3-haiku")}
              >
                Anthropic Claude 3 Haiku
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => changeProvider("local", "llama-2")}
              >
                Local Llama 2
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {getExecutionStatus()}
        </div>

        {/* Cell Controls - visible on hover or always on mobile */}
        <div className="cell-controls flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {/* Mobile Play Button - AI cells */}
          <Button
            variant="ghost"
            size="sm"
            onClick={executeAiPrompt}
            disabled={cell.executionState === "running" ||
              cell.executionState === "queued"}
            className="mobile-play-btn block sm:hidden h-8 w-8 p-0 hover:bg-muted/80"
            title="Generate AI response"
          >
            {cell.executionState === "running"
              ? (
                <div className="animate-spin w-4 h-4 border border-purple-600 border-t-transparent rounded-full">
                </div>
              )
              : cell.executionState === "queued"
              ? <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
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
            onClick={executeAiPrompt}
            disabled={cell.executionState === "running" ||
              cell.executionState === "queued"}
            className={`h-6 w-6 p-0 rounded-sm bg-white border-0 hover:bg-white transition-colors ${
              autoFocus
                ? "text-purple-600"
                : "text-muted-foreground/40 hover:text-purple-600 group-hover:text-purple-600"
            }`}
          >
            {cell.executionState === "running"
              ? (
                <div className="animate-spin w-3 h-3 border border-purple-600 border-t-transparent rounded-full bg-white">
                </div>
              )
              : cell.executionState === "queued"
              ? <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              : <Play className="h-3 w-3" />}
          </Button>
        </div>

        {/* Text Content Area - Chat-like on mobile */}
        {cell.sourceVisible && (
          <div
            className={`cell-content transition-colors py-1 pl-4 pr-1 sm:pr-4 ${
              autoFocus ? "bg-white" : "bg-white"
            }`}
          >
            {/* Mobile Chat-like Input */}
            <div className="block sm:hidden">
              <div className="bg-purple-50/50 rounded-lg p-3 mb-16 border border-purple-200/50">
                <Textarea
                  ref={textareaRef}
                  value={localSource}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setLocalSource(e.target.value)}
                  onBlur={updateSource}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything about your notebook, data, or analysis..."
                  className="min-h-[3rem] max-h-32 resize-none border-0 px-0 py-0 focus-visible:ring-0 bg-transparent w-full placeholder:text-purple-400/70 shadow-none text-base leading-relaxed"
                  onFocus={handleFocus}
                />
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-purple-200/50">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="text-xs text-purple-600/60 hover:text-purple-600 transition-colors cursor-pointer">
                        {provider.toUpperCase()} • {model}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem
                        onClick={() => changeProvider("openai", "gpt-4o")}
                      >
                        OpenAI GPT-4o
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => changeProvider("openai", "gpt-4o-mini")}
                      >
                        OpenAI GPT-4o Mini
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => changeProvider("openai", "gpt-4")}
                      >
                        OpenAI GPT-4 (Legacy)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          changeProvider("openai", "gpt-3.5-turbo")}
                      >
                        OpenAI GPT-3.5 Turbo
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          changeProvider("anthropic", "claude-3-sonnet")}
                      >
                        Anthropic Claude 3 Sonnet
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          changeProvider("anthropic", "claude-3-haiku")}
                      >
                        Anthropic Claude 3 Haiku
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => changeProvider("local", "llama-2")}
                      >
                        Local Llama 2
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Desktop Traditional Input */}
            <div className="hidden sm:block min-h-[1.5rem]">
              <Textarea
                ref={textareaRef}
                value={localSource}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setLocalSource(e.target.value)}
                onBlur={updateSource}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about your notebook, data, or analysis..."
                className="min-h-[1.5rem] resize-none border-0 px-2 py-1 focus-visible:ring-0 font-mono bg-white w-full placeholder:text-muted-foreground/60 shadow-none text-sm"
                onFocus={handleFocus}
              />
            </div>
          </div>
        )}
      </div>

      {/* Execution Summary - appears after input */}
      {(cell.executionCount ||
        cell.executionState === "running" ||
        cell.executionState === "queued") && (
        <div className="cell-content mt-1 pl-6 pr-1 sm:pr-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
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
                {!cell.outputVisible && outputs.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {outputs.length === 1
                      ? "1 response hidden"
                      : `${outputs.length} responses hidden`}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleOutputVisibility}
                  className={`h-6 w-6 sm:h-5 sm:w-5 p-0 hover:bg-muted/80 transition-opacity ${
                    autoFocus
                      ? "opacity-100"
                      : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  } ${cell.outputVisible ? "" : "text-muted-foreground/60"}`}
                  title={cell.outputVisible ? "Hide response" : "Show response"}
                >
                  {cell.outputVisible
                    ? <ChevronUp className="h-4 w-4 sm:h-3 sm:w-3" />
                    : <ChevronDown className="h-4 w-4 sm:h-3 sm:w-3" />}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Output Area for AI Responses */}
      {outputs.length > 0 && cell.outputVisible && (
        <div className="cell-content mt-1 pl-6 pr-1 sm:pr-4 bg-background overflow-hidden max-w-full">
          {groupConsecutiveStreamOutputs(
            outputs.sort(
              (a: OutputData, b: OutputData) => a.position - b.position,
            ),
          ).map((output: OutputData, index: number) => (
            <div
              key={output.id}
              className={index > 0 ? "border-t border-border/30 mt-2 pt-2" : ""}
            >
              {output.outputType === "error"
                ? (
                  // Use AnsiErrorOutput for colored error rendering
                  <AnsiErrorOutput
                    ename={isErrorOutput(output.data)
                      ? output.data.ename
                      : undefined}
                    evalue={isErrorOutput(output.data)
                      ? output.data.evalue
                      : undefined}
                    traceback={isErrorOutput(output.data)
                      ? output.data.traceback
                      : undefined}
                  />
                )
                : (
                  // Use RichOutput for all other output types - chat bubble style on mobile
                  <div className="py-2 overflow-hidden max-w-full">
                    <div className="sm:bg-transparent bg-gray-50 sm:p-0 p-3 sm:rounded-none rounded-lg sm:border-0 border border-gray-200 overflow-hidden max-w-full">
                      <RichOutput
                        data={output.data as Record<string, unknown>}
                        metadata={output.metadata as
                          | Record<string, unknown>
                          | undefined}
                        outputType={output.outputType}
                      />
                    </div>
                  </div>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
