import { useCellContent } from "@/hooks/useCellContent.js";
import { useCellKeyboardNavigation } from "@/hooks/useCellKeyboardNavigation.js";
import { useCellOutputs } from "@/hooks/useCellOutputs.js";
import { useStore } from "@livestore/react";
import { events, tables } from "@runt/schema";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { MarkdownRenderer } from "@/components/outputs/MarkdownRenderer.js";
import { Button } from "@/components/ui/button.js";
import { useCurrentUserId } from "@/hooks/useCurrentUser.js";
import { useUserRegistry } from "@/hooks/useUserRegistry.js";
import { Edit3, Eye } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import { useClickAway } from "react-use";
import { CellContainer } from "./shared/CellContainer.js";
import { CellControls } from "./shared/CellControls.js";
import { CellTypeSelector } from "./shared/CellTypeSelector.js";
import { Editor } from "./shared/Editor.js";
import { PresenceBookmarks } from "./shared/PresenceBookmarks.js";

type CellType = typeof tables.cells.Type;

interface MarkdownCellProps {
  cell: CellType;
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
  onDeleteCell,
  onMoveUp,
  onMoveDown,
  onFocusNext,
  onFocusPrevious,
  autoFocus = false,
  onFocus,
  contextSelectionMode = false,
}) => {
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const cellContainerRef = useRef<HTMLDivElement>(null);

  useClickAway(cellContainerRef, () => {
    setIsEditing(false);
    updateSource();
  });

  // All hooks must be called at the top level before any conditional returns
  const { store } = useStore();
  const currentUserId = useCurrentUserId();
  const { getUsersOnCell, getUserColor } = useUserRegistry();
  const [isEditing, setIsEditing] = useState(autoFocus);

  // If another cell causes this one to focus, we need to set the editing state to false
  useEffect(() => {
    setIsEditing(autoFocus);
  }, [autoFocus]);

  // Get users present on this cell (excluding current user)
  const usersOnCell = getUsersOnCell(cell.id).filter(
    (user) => user.id !== currentUserId
  );

  // Use shared content management hook
  const { localSource, setLocalSource, updateSource, handleSourceChange } =
    useCellContent({
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
          actorId: currentUserId,
        })
      );
    },
    [cell.id, store, currentUserId]
  );

  const toggleSourceVisibility = useCallback(() => {
    store.commit(
      events.cellSourceVisibilityToggled({
        id: cell.id,
        sourceVisible: !cell.sourceVisible,
        actorId: currentUserId,
      })
    );
  }, [cell.id, cell.sourceVisible, store, currentUserId]);

  const toggleAiContextVisibility = useCallback(() => {
    store.commit(
      events.cellAiContextVisibilityToggled({
        id: cell.id,
        aiContextVisible: !cell.aiContextVisible,
        actorId: currentUserId,
      })
    );
  }, [cell.id, cell.aiContextVisible, store, currentUserId]);

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
  const { keyMap, handleKeyDown } = useCellKeyboardNavigation({
    onFocusNext,
    onFocusPrevious,
    onDeleteCell,
    onUpdateSource: updateSource,
  });

  // Because this is a markdown cell, there's nothing to execute, but we do want to handle the same keybindings as a code cell
  const extendedKeyMap = useMemo(() => {
    return [
      {
        key: "Escape",
        run: () => {
          console.log(cell.source, localSource);
          // TODO: undo changes
          setLocalSource(cell.source);
          setTimeout(() => {
            setIsEditing(false);
            editButtonRef.current?.focus();
          }, 0);
          return true;
        },
      },
      {
        key: "Mod-Enter",
        run: () => {
          setIsEditing(false);
          updateSource();
          editButtonRef.current?.focus();
          return true;
        },
      },
      ...keyMap,
    ];
  }, [
    cell.source,
    localSource,
    keyMap,
    setLocalSource,
    updateSource,
    editButtonRef,
    setIsEditing,
  ]);

  const handleFocus = useCallback(() => {
    onFocus?.();
  }, [onFocus]);

  const focusColor = "bg-amber-500/40";
  const focusBgColor = "bg-amber-50/20";

  return (
    <CellContainer
      ref={cellContainerRef}
      cell={cell}
      autoFocus={autoFocus}
      contextSelectionMode={contextSelectionMode}
      onFocus={onFocus}
      focusColor={focusColor}
      focusBgColor={focusBgColor}
    >
      {/* Cell Header */}
      <div
        className="cell-header mb-2 flex items-center justify-between pr-1 pl-6 sm:pr-4"
        onKeyDown={!isEditing ? handleKeyDown : undefined}
      >
        <div className="flex items-center gap-3">
          <CellTypeSelector cell={cell} onCellTypeChange={changeCellType} />
          {isEditing ? (
            <Button
              variant="outline"
              size="xs"
              ref={editButtonRef}
              onClick={() => setIsEditing(false)}
            >
              <Eye className="size-4" /> Preview
            </Button>
          ) : (
            <Button
              variant="outline"
              size="xs"
              onClick={() => setIsEditing(true)}
            >
              <Edit3 className="size-4" /> Edit
            </Button>
          )}

          <PresenceBookmarks
            usersOnCell={usersOnCell}
            getUserColor={getUserColor}
          />
        </div>

        <CellControls
          cell={cell}
          contextSelectionMode={contextSelectionMode}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onDeleteCell={onDeleteCell}
          onClearOutputs={clearCellOutputs}
          hasOutputs={hasOutputs}
          toggleSourceVisibility={toggleSourceVisibility}
          toggleAiContextVisibility={toggleAiContextVisibility}
        />
      </div>

      {/* Cell Content */}
      <div className="relative">
        {/* Editor Content Area */}
        {cell.sourceVisible && isEditing && (
          <div className="cell-content bg-white py-1 pl-4 transition-colors">
            <ErrorBoundary fallback={<div>Error rendering editor</div>}>
              <Editor
                localSource={localSource}
                handleSourceChange={handleSourceChange}
                handleFocus={handleFocus}
                cell={cell}
                autoFocus={autoFocus}
                keyMap={extendedKeyMap}
                onBlur={updateSource}
              />
            </ErrorBoundary>
          </div>
        )}
        {cell.sourceVisible && !isEditing && (
          <div
            className="cell-content bg-white py-1 pr-4 pl-4 transition-colors"
            onDoubleClick={() => setIsEditing(true)}
          >
            <MarkdownRenderer content={localSource} />
          </div>
        )}
      </div>
    </CellContainer>
  );
};
