import React, { useCallback } from "react";
import { useStore } from "@livestore/react";
import { events, OutputData, tables } from "@runt/schema";
import { queryDb } from "@livestore/livestore";
import { useCellKeyboardNavigation } from "../../hooks/useCellKeyboardNavigation.js";
import { useCellContent } from "../../hooks/useCellContent.js";
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
  Square,
  X,
} from "lucide-react";
import { CellBase } from "./CellBase.js";
import { CodeMirrorEditor } from "./codemirror/CodeMirrorEditor.js";

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
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Create stable query using useMemo to prevent React Hook issues
  const outputsQuery = React.useMemo(
    () => queryDb(tables.outputs.select().where({ cellId: cell.id })),
    [cell.id]
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

  // Use shared content management hook
  const { localSource, updateSource, handleSourceChange } = useCellContent({
    cellId: cell.id,
    initialSource: cell.source,
  });

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

      // The runtime service will now:
      // 1. See the pending execution in the queue
      // 2. Recognize it's an AI cell and handle accordingly
      // 3. Make the AI API call (OpenAI, Anthropic, etc.)
      // 4. Emit execution events and cell outputs
      // 5. All clients will see the results in real-time!
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
  const { handleKeyDown, keyMap } = useCellKeyboardNavigation({
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
        className={`h-5 cursor-pointer text-xs hover:opacity-80 ${
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
            className="h-5 border-purple-200 bg-purple-50 text-xs text-purple-700"
          >
            <div className="mr-1 h-2 w-2 animate-spin rounded-full border border-purple-600 border-t-transparent"></div>
            Generating
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

  return (
    <div
      className={`cell-container group relative mb-2 pt-2 transition-all duration-200 sm:mb-3 ${
        autoFocus && !contextSelectionMode
          ? "bg-purple-50/30"
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
          autoFocus && !contextSelectionMode
            ? "bg-purple-500/60"
            : "bg-border/30"
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
        <div className="flex items-center gap-2 sm:gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-muted/50 h-7 gap-1.5 border border-purple-200 bg-purple-50 px-2 text-xs font-medium text-purple-700 sm:h-6"
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
        <div className="cell-controls flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          {/* Mobile Play Button - AI cells */}
          <Button
            variant="ghost"
            size="sm"
            onClick={
              cell.executionState === "running" ||
              cell.executionState === "queued"
                ? interruptAiCell
                : executeAiPrompt
            }
            className="mobile-play-btn hover:bg-muted/80 block h-8 w-8 p-0 sm:hidden"
            title={
              cell.executionState === "running" ||
              cell.executionState === "queued"
                ? "Stop AI execution"
                : "Generate AI response"
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
            onClick={
              cell.executionState === "running" ||
              cell.executionState === "queued"
                ? interruptAiCell
                : executeAiPrompt
            }
            className={`h-6 w-6 rounded-sm border-0 bg-white p-0 transition-colors hover:bg-white ${
              autoFocus
                ? "text-purple-600"
                : "text-muted-foreground/40 group-hover:text-purple-600 hover:text-purple-600"
            }`}
            title={
              cell.executionState === "running" ||
              cell.executionState === "queued"
                ? "Stop AI execution"
                : "Generate AI response"
            }
          >
            {cell.executionState === "running" ? (
              <Square className="h-3 w-3" />
            ) : cell.executionState === "queued" ? (
              <Square className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3" />
            )}
          </Button>
        </div>

        {/* Text Content Area - Chat-like on mobile */}
        {cell.sourceVisible && (
          <div
            className={`cell-content px-4 py-1 transition-colors sm:px-4 ${
              autoFocus ? "bg-white" : "bg-white"
            }`}
          >
            {/* Mobile Chat-like Input */}
            <div className="block sm:hidden">
              <div className="mb-16 rounded-lg border border-purple-200/50 bg-purple-50/50 p-3">
                <Textarea
                  ref={textareaRef}
                  value={localSource}
                  onChange={(e) => handleSourceChange(e.target.value)}
                  onBlur={updateSource}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything about your notebook, data, or analysis..."
                  className="max-h-32 min-h-[3rem] w-full resize-none border-0 bg-transparent px-0 py-0 text-base leading-relaxed shadow-none placeholder:text-purple-400/70 focus-visible:ring-0"
                  onFocus={handleFocus}
                />
                <div className="mt-2 flex items-center justify-between border-t border-purple-200/50 pt-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="cursor-pointer text-xs text-purple-600/60 transition-colors hover:text-purple-600">
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
                          changeProvider("openai", "gpt-3.5-turbo")
                        }
                      >
                        OpenAI GPT-3.5 Turbo
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          changeProvider("anthropic", "claude-3-sonnet")
                        }
                      >
                        Anthropic Claude 3 Sonnet
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          changeProvider("anthropic", "claude-3-haiku")
                        }
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

            {/* Mobile: Textarea */}
            <div className="block sm:hidden">
              <CellBase asChild>
                <Textarea
                  ref={textareaRef}
                  value={localSource}
                  onChange={(e) => handleSourceChange(e.target.value)}
                  onBlur={updateSource}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything about your notebook, data, or analysis..."
                  onFocus={handleFocus}
                />
              </CellBase>
            </div>
            {/* Desktop: CodeMirror Editor */}
            <div className="relative hidden min-h-[1.5rem] sm:block">
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
                disableAutocompletion={true}
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
                {!cell.outputVisible && outputs.length > 0 && (
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

      {/* Output Area for AI Responses */}
      {outputs.length > 0 && cell.outputVisible && (
        <div className="cell-content bg-background mt-1 max-w-full overflow-hidden px-4 sm:px-4">
          {groupConsecutiveStreamOutputs(
            outputs.sort(
              (a: OutputData, b: OutputData) => a.position - b.position
            )
          ).map((output: OutputData, index: number) => (
            <div
              key={output.id}
              className={index > 0 ? "border-border/30 mt-2 border-t pt-2" : ""}
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
              ) : (
                // Use RichOutput for all other output types - chat bubble style on mobile
                <div className="max-w-full overflow-hidden py-2">
                  <div className="max-w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-3 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
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
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
