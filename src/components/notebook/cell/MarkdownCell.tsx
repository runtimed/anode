import { useCellContent } from "@/hooks/useCellContent.js";
import { useCellKeyboardNavigation } from "@/hooks/useCellKeyboardNavigation.js";
import { useCellOutputs } from "@/hooks/useCellOutputs.js";
import { useStore } from "@livestore/react";
import { events, tables } from "@runt/schema";
import React, { useCallback } from "react";

import { useCurrentUserId } from "@/hooks/useCurrentUser.js";
import { ErrorBoundary } from "react-error-boundary";
import { CellContainer } from "./shared/CellContainer.js";
import { CellControls } from "./shared/CellControls.js";
import { CellTypeSelector } from "./shared/CellTypeSelector.js";
import { Editor } from "./shared/Editor.js";
import { MarkdownToolbar } from "./toolbars/MarkdownToolbar.js";

type CellType = typeof tables.cells.Type;

interface MarkdownCellProps {
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

export const MarkdownCell: React.FC<MarkdownCellProps> = ({
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
  const currentUserId = useCurrentUserId();

  // Use shared content management hook
  const { localSource, updateSource, handleSourceChange } = useCellContent({
    cellId: cell.id,
    initialSource: cell.source,
  });

  // Use shared outputs hook with markdown-specific configuration
  const { hasOutputs } = useCellOutputs({
    cellId: cell.id,
    groupConsecutiveStreams: true,
    enableErrorOutput: true,
    enableTerminalOutput: true,
    mobileStyle: "default",
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

  const toggleAiContextVisibility = useCallback(() => {
    store.commit(
      events.cellAiContextVisibilityToggled({
        id: cell.id,
        aiContextVisible: !cell.aiContextVisible,
      })
    );
  }, [cell.id, cell.aiContextVisible, store]);

  const clearCellOutputs = useCallback(async () => {
    if (hasOutputs) {
      store.commit(
        events.cellOutputsCleared({
          cellId: cell.id,
          wait: false,
          clearedBy: currentUserId,
        })
      );
    }
  }, [cell.id, store, hasOutputs, currentUserId]);

  // Use shared keyboard navigation hook
  const { keyMap } = useCellKeyboardNavigation({
    onFocusNext,
    onFocusPrevious,
    onDeleteCell,
    onUpdateSource: updateSource,
  });

  const handleFocus = useCallback(() => {
    onFocus?.();
  }, [onFocus]);

  const focusColor = "bg-amber-500/40";
  const focusBgColor = "bg-amber-50/20";

  return (
    <CellContainer
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
          <MarkdownToolbar />
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
          playButton={undefined}
        />
      </div>

      {/* Cell Content */}
      <div className="relative">
        {/* Editor Content Area */}
        {cell.sourceVisible && (
          <div className="cell-content bg-white py-1 pl-4 transition-colors">
            <ErrorBoundary fallback={<div>Error rendering editor</div>}>
              <Editor
                localSource={localSource}
                handleSourceChange={handleSourceChange}
                updateSource={updateSource}
                handleFocus={handleFocus}
                cell={cell}
                autoFocus={autoFocus}
                keyMap={keyMap}
              />
            </ErrorBoundary>
          </div>
        )}
      </div>
    </CellContainer>
  );
};
