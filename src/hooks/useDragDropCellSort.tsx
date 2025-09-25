import {
  ReactNode,
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";
import { useStore } from "@livestore/react";
import { useAuthenticatedUser } from "../auth/index.js";
import { queries, moveCellBetween, CellReference } from "@runtimed/schema";

interface DragState {
  isDragging: boolean;
  draggingCellId: string | null;
  draggingOverCellId: string | null;
  draggingOverPosition: "before" | "after" | null;
}

interface DragDropContextType {
  dragState: DragState;
  setDraggingCell: (cellId: string | null) => void;
  setDraggingOverCell: (
    cellId: string | null,
    position?: "before" | "after"
  ) => void;
  onDrop: (targetCellId: string, position?: "before" | "after") => void;
  clearDragState: () => void;
}

const DragDropContext = createContext<DragDropContextType | null>(null);

export const DragDropSortProvider = ({ children }: { children: ReactNode }) => {
  const { store } = useStore();
  const userId = useAuthenticatedUser();

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggingCellId: null,
    draggingOverCellId: null,
    draggingOverPosition: null,
  });

  const setDraggingCell = useCallback((cellId: string | null) => {
    setDragState((prev) => ({
      ...prev,
      isDragging: cellId !== null,
      draggingCellId: cellId,
      // Clear drag over state when starting new drag
      draggingOverCellId: cellId ? prev.draggingOverCellId : null,
      draggingOverPosition: cellId ? prev.draggingOverPosition : null,
    }));
  }, []);

  const setDraggingOverCell = useCallback(
    (cellId: string | null, position?: "before" | "after") => {
      setDragState((prev) => ({
        ...prev,
        draggingOverCellId: cellId,
        draggingOverPosition: position || null,
      }));
    },
    []
  );

  const clearDragState = useCallback(() => {
    setDragState({
      isDragging: false,
      draggingCellId: null,
      draggingOverCellId: null,
      draggingOverPosition: null,
    });
  }, []);

  const onDrop = useCallback(
    (targetCellId: string, position: "before" | "after" = "after") => {
      if (!dragState.draggingCellId || !dragState.isDragging) {
        return;
      }

      try {
        const cellReferences = store.query(queries.cellsWithIndices$);
        const draggingCell = cellReferences.find(
          (c) => c.id === dragState.draggingCellId
        );

        const targetCell = cellReferences.find((c) => c.id === targetCellId);

        if (!draggingCell || !targetCell) {
          console.warn("Could not find dragging or target cell");
          clearDragState();
          return;
        }

        const targetIndex = cellReferences.findIndex(
          (c) => c.id === targetCellId
        );

        // Determine the before and after cells for the move operation
        let cellBefore: CellReference | null = null;
        let cellAfter: CellReference | null = null;

        if (position === "before") {
          // Move before target cell
          cellBefore = targetIndex > 0 ? cellReferences[targetIndex - 1] : null;
          cellAfter = targetCell;
        } else {
          // Move after target cell
          cellBefore = targetCell;
          cellAfter =
            targetIndex < cellReferences.length - 1
              ? cellReferences[targetIndex + 1]
              : null;
        }

        const moveEvent = moveCellBetween(
          draggingCell,
          cellBefore,
          cellAfter,
          userId
        );

        if (moveEvent) {
          store.commit(moveEvent);
        }
      } catch (error) {
        console.error("Error moving cell:", error);
      } finally {
        clearDragState();
      }
    },
    [
      dragState.draggingCellId,
      dragState.isDragging,
      store,
      userId,
      clearDragState,
    ]
  );

  const contextValue: DragDropContextType = {
    dragState,
    setDraggingCell,
    setDraggingOverCell,
    onDrop,
    clearDragState,
  };

  return (
    <DragDropContext.Provider value={contextValue}>
      {children}
    </DragDropContext.Provider>
  );
};

export const useDragDropCellSort = () => {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error(
      "useDragDropCellSort must be used within a DragDropSortProvider"
    );
  }

  return {
    isDragging: context.dragState.isDragging,
    draggingCellId: context.dragState.draggingCellId,
    draggingOverCell: context.dragState.draggingOverCellId,
    draggingOverPosition: context.dragState.draggingOverPosition,
    setDraggingCell: context.setDraggingCell,
    setDraggingOverCell: context.setDraggingOverCell,
    onDrop: context.onDrop,
    clearDragState: context.clearDragState,
  };
};
