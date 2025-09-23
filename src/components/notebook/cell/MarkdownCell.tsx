import { useAddCell } from "@/hooks/useAddCell.js";
import { useCellContent } from "@/hooks/useCellContent.js";
import { useCellKeyboardNavigation } from "@/hooks/useCellKeyboardNavigation.js";
import { useDeleteCell } from "@/hooks/useDeleteCell.js";
import { useMoveCell } from "@/hooks/useMoveCell.js";
import { useEditorRegistry } from "@/hooks/useEditorRegistry.js";
import { events, queries, tables, CellTypeNoRaw } from "@runtimed/schema";
import { useStore } from "@livestore/react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button.js";
import { useUserRegistry } from "@/hooks/useUserRegistry.js";
import { cn } from "@/lib/utils.js";
import { Edit3, Eye } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import { useClickAway } from "react-use";
import { useAuthenticatedUser } from "../../../auth/index.js";
import { focusedCellSignal$, hasManuallyFocused$ } from "../signals/focus.js";
import { CellContainer } from "./shared/CellContainer.js";
import { CellControls } from "./shared/CellControls.js";
import { CellTypeSelector } from "./shared/CellTypeSelector.js";
import { Editor, EditorRef } from "./shared/Editor.js";
import { PresenceBookmarks } from "./shared/PresenceBookmarks.js";
import { IframeOutput } from "@/components/outputs/MaybeCellOutputs.js";

interface MarkdownCellProps {
  cell: typeof tables.cells.Type;
  autoFocus?: boolean;
  contextSelectionMode?: boolean;
  dragHandle?: React.ReactNode;
}

export const MarkdownCell: React.FC<MarkdownCellProps> = ({
  cell,
  autoFocus = false,
  contextSelectionMode = false,
  dragHandle,
}) => {
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const cellContainerRef = useRef<HTMLDivElement>(null);

  const { store } = useStore();
  const {
    registerEditor,
    unregisterEditor,
    focusCell: registryFocusCell,
  } = useEditorRegistry();

  const { handleDeleteCell } = useDeleteCell(cell.id);
  const { addCell } = useAddCell();
  const { moveCellUp, moveCellDown, canMoveUp, canMoveDown } = useMoveCell(
    cell.id
  );
  // Use shared content management hook
  const { localSource, setLocalSource, updateSource, handleSourceChange } =
    useCellContent({
      cellId: cell.id,
      initialSource: cell.source,
    });

  useClickAway(cellContainerRef, () => {
    if (localSource.length > 0) {
      setIsEditing(false);
    }
    updateSource();
  });

  // All hooks must be called at the top level before any conditional returns
  const userId = useAuthenticatedUser();
  const { getUsersOnCell, getUserColor } = useUserRegistry();
  const [isEditing, setIsEditing] = useState(autoFocus);

  // If another cell causes this one to focus, we need to set the editing state to false
  useEffect(() => {
    setIsEditing(autoFocus);
  }, [autoFocus]);

  // Get users present on this cell (excluding current user)
  const usersOnCell = getUsersOnCell(cell.id).filter(
    (user) => user.id !== userId
  );

  const changeCellType = useCallback(
    (newType: CellTypeNoRaw) => {
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
    store.commit(
      events.cellOutputsCleared({
        cellId: cell.id,
        wait: false,
        clearedBy: userId,
      })
    );
  }, [cell.id, store, userId]);

  // Create navigation handlers using the registry
  const onFocusNext = useCallback(
    (cursorPosition: "start" | "end" = "start") => {
      const cellReferences = store.query(queries.cellsWithIndices$);
      const currentIndex = cellReferences.findIndex((c) => c.id === cell.id);

      if (currentIndex < cellReferences.length - 1) {
        const nextCell = cellReferences[currentIndex + 1];
        store.setSignal(focusedCellSignal$, nextCell.id);
        registryFocusCell(nextCell.id, cursorPosition);
      } else {
        // At the last cell, create a new one with same cell type (but never raw)
        const currentCell = cellReferences[currentIndex];
        const newCellType =
          currentCell.cellType === "raw" ? "code" : currentCell.cellType;
        addCell(cell.id, newCellType);
      }
    },
    [cell.id, store, registryFocusCell, addCell]
  );

  const onFocusPrevious = useCallback(
    (cursorPosition: "start" | "end" = "end") => {
      const cellReferences = store.query(queries.cellsWithIndices$);
      const currentIndex = cellReferences.findIndex((c) => c.id === cell.id);

      if (currentIndex > 0) {
        const previousCell = cellReferences[currentIndex - 1];
        store.setSignal(focusedCellSignal$, previousCell.id);
        registryFocusCell(previousCell.id, cursorPosition);
      }
    },
    [cell.id, store, registryFocusCell]
  );

  // Use shared keyboard navigation hook
  const { keyMap, handleKeyDown } = useCellKeyboardNavigation({
    onFocusNext,
    onFocusPrevious,
    onDeleteCell: () => handleDeleteCell("keyboard"),
    onUpdateSource: updateSource,
  });

  // Because this is a markdown cell, there's nothing to execute, but we do want to handle the same keybindings as a code cell
  const extendedKeyMap = useMemo(() => {
    return [
      {
        key: "Escape",
        run: () => {
          setLocalSource(cell.source);
          if (cell.source.length > 0) {
            setTimeout(() => {
              setIsEditing(false);
              editButtonRef.current?.focus();
            }, 0);
          }
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
    keyMap,
    setLocalSource,
    updateSource,
    editButtonRef,
    setIsEditing,
  ]);

  const handleFocus = useCallback(() => {
    store.setSignal(focusedCellSignal$, cell.id);
    store.setSignal(hasManuallyFocused$, true);

    // Set presence to track user focus on this cell
    store.commit(
      events.presenceSet({
        userId,
        cellId: cell.id,
      })
    );
  }, [store, cell.id, userId]);

  // Handle editor registration for navigation
  const handleEditorReady = useCallback(
    (editorRef: EditorRef) => {
      if (editorRef) {
        registerEditor(cell.id, editorRef);
      }
    },
    [cell.id, registerEditor]
  );

  // Cleanup editor registration on unmount
  React.useEffect(() => {
    return () => {
      unregisterEditor(cell.id);
    };
  }, [cell.id, unregisterEditor]);

  const focusColor = "bg-amber-500/40";
  const focusBgColor = "bg-amber-50/20";

  return (
    <CellContainer
      ref={cellContainerRef}
      cell={cell}
      autoFocus={autoFocus}
      contextSelectionMode={contextSelectionMode}
      onFocus={handleFocus}
      focusColor={focusColor}
      focusBgColor={focusBgColor}
    >
      {/* Cell Header */}
      <div
        className="cell-header relative mb-2 flex items-center justify-between pr-1 pl-6 sm:pr-4"
        onKeyDown={!isEditing ? handleKeyDown : undefined}
      >
        <div className="relative flex items-center gap-3">
          {dragHandle}
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
          sourceVisible={cell.sourceVisible}
          aiContextVisible={cell.aiContextVisible}
          contextSelectionMode={contextSelectionMode}
          onDeleteCell={() => handleDeleteCell("click")}
          onClearOutputs={clearCellOutputs}
          hasOutputs={true}
          toggleSourceVisibility={toggleSourceVisibility}
          toggleAiContextVisibility={toggleAiContextVisibility}
          onMoveUp={moveCellUp}
          onMoveDown={moveCellDown}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
        />
      </div>

      {/* Cell Content */}
      <div className="relative">
        <div
          className={cn(
            "cell-content bg-white py-1 pr-4 pl-4 transition-colors",
            cell.sourceVisible && !isEditing ? "h-auto" : "h-0 opacity-0"
          )}
        >
          {/* Send markdown content to iframe */}
          <IframeOutput
            onDoubleClick={() => setIsEditing(true)}
            outputs={[
              {
                id: cell.id + "-output",
                cellId: cell.id,
                position: 0,
                streamName: null,
                executionCount: 0,
                representations: {
                  "text/markdown": {
                    type: "inline",
                    data: localSource,
                    metadata: {},
                  },
                },
                metadata: {},
                displayId: null,
                mimeType: "text/markdown",
                artifactId: null,
                data: localSource,
                outputType: "markdown",
              },
            ]}
            isReact
          />
        </div>

        {/* Editor Content Area */}
        <div
          className={cn(
            "cell-content bg-white py-1 pl-4 transition-colors",
            cell.sourceVisible && isEditing ? "block" : "hidden"
          )}
        >
          <ErrorBoundary fallback={<div>Error rendering editor</div>}>
            <Editor
              ref={handleEditorReady}
              localSource={localSource}
              handleSourceChange={handleSourceChange}
              onBlur={updateSource}
              handleFocus={handleFocus}
              language="markdown"
              placeholder="Write markdown..."
              enableLineWrapping={true}
              autoFocus={autoFocus}
              keyMap={extendedKeyMap}
            />
          </ErrorBoundary>
        </div>
      </div>
    </CellContainer>
  );
};
