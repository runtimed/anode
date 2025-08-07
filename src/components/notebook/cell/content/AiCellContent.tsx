import React, { useCallback } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useStore } from "@livestore/react";
import { events } from "@/schema";
import { useAuth } from "@/components/auth/AuthProvider.js";
import { useToolApprovals } from "@/hooks/useToolApprovals.js";
import { useAvailableAiModels } from "@/util/ai-models.js";
import { Editor } from "../shared/Editor.js";
import { AiToolApprovalOutput } from "../../../outputs/AiToolApprovalOutput.js";

import type { CellContentProps } from "../UniversalCell.js";

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

export const AiCellContent: React.FC<CellContentProps> = ({
  cell,
  localSource,
  handleSourceChange,
  updateSource,
  autoFocus,
  onFocus,
  keyMap,
}) => {
  const { store } = useStore();
  const {
    user: { sub: userId },
  } = useAuth();

  // Get AI model settings
  const provider = cell.aiProvider || "openai";
  const model = cell.aiModel || "gpt-4o-mini";

  // Get available AI models from runtime capabilities
  const { models: _ } = useAvailableAiModels();

  // AI-specific execution logic
  const executeAiPrompt = useCallback(async () => {
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

      // Generate unique queue ID for AI execution
      const queueId = `ai-exec-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
      const executionCount = (cell.executionCount || 0) + 1;

      // Add AI execution request to queue (uses same event as other cell types)
      store.commit(
        events.executionRequested({
          queueId,
          cellId: cell.id,
          executionCount,
          requestedBy: userId,
        })
      );
    } catch (error) {
      console.error("❌ AI execution error:", error);

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
              traceback: ["Error occurred while emitting AI execution event"],
            },
          },
        })
      );
    }
  }, [
    cell.id,
    localSource,
    cell.source,
    cell.executionCount,
    store,
    userId,
    provider,
    model,
  ]);

  // Enhanced keyMap for AI-specific commands
  const aiKeyMap = [
    {
      key: "Shift-Enter",
      run: () => {
        executeAiPrompt();
        return true;
      },
    },
    ...keyMap.filter((binding) => binding.key !== "Shift-Enter"), // Remove default Shift-Enter if present
  ];

  return (
    <>
      {/* Tool Approval (if any) */}
      <MaybeInlineToolApproval cellId={cell.id} />

      {/* Editor Content Area */}
      {cell.sourceVisible && (
        <div className="cell-content bg-white py-1 pl-4 transition-colors">
          <ErrorBoundary fallback={<div>Error rendering AI editor</div>}>
            <Editor
              localSource={localSource}
              handleSourceChange={handleSourceChange}
              onBlur={updateSource}
              handleFocus={onFocus}
              cell={cell}
              autoFocus={autoFocus}
              keyMap={aiKeyMap}
            />
          </ErrorBoundary>
        </div>
      )}
    </>
  );
};
