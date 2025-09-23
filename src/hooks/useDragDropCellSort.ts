import { ReactNode } from "react";

export const DragDropSortProvider = ({ children }: { children: ReactNode }) => {
  return children;
};

export const useDragDropCellSort = () => {
  return {
    isDragging: false,
    setDraggingCell: (cellId: string, position?: "before" | "after") => {},
    draggingOverCell: undefined,
    draggingOverPosition: undefined,
    onDrop: (cellId: string, position?: "before" | "after") => {},
  };
};
