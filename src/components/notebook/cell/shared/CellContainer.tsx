import { tables } from "@runtimed/schema";
import { forwardRef, ReactNode, useCallback } from "react";
import { useDragDropCellSort } from "@/hooks/useDragDropCellSort";
import { cn } from "@/lib/utils";

interface CellContainerProps {
  cell: typeof tables.cells.Type;
  autoFocus?: boolean;
  contextSelectionMode?: boolean;
  onFocus?: () => void;
  children: ReactNode;
  focusBgColor?: string;
  focusBorderColor?: string;
  className?: string;
}

export const CellContainer = forwardRef<HTMLDivElement, CellContainerProps>(
  (
    {
      cell,
      autoFocus = false,
      contextSelectionMode = false,
      onFocus,
      children,
      focusBgColor = "bg-primary/5",
      focusBorderColor = "border-primary/60",
      className = "",
    },
    ref
  ) => {
    const {
      draggingCellId,
      draggingOverPosition,
      setDraggingOverCell,
      onDrop,
      clearDragState,
    } = useDragDropCellSort();

    const isBeingDragged = draggingCellId === cell.id;

    const handleDragEnd = useCallback(() => {
      clearDragState();
    }, [clearDragState]);

    const handleDragOver = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";

        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const isTopHalf = y < rect.height / 2;
        const position = isTopHalf ? "before" : "after";

        setDraggingOverCell(cell.id, position);
      },
      [cell.id, setDraggingOverCell]
    );

    const handleDragLeave = useCallback(
      (e: React.DragEvent) => {
        // Only clear if we're leaving the cell entirely (not just moving to a child)
        const rect = e.currentTarget.getBoundingClientRect();
        const { clientX, clientY } = e;

        if (
          clientX < rect.left ||
          clientX > rect.right ||
          clientY < rect.top ||
          clientY > rect.bottom
        ) {
          setDraggingOverCell(null);
        }
      },
      [setDraggingOverCell]
    );

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        onDrop(cell.id, draggingOverPosition || "after");
      },
      [cell.id, draggingOverPosition, onDrop]
    );

    return (
      <div
        ref={ref}
        data-cell-id={cell.id}
        className={cn(
          "cell-container group relative border-2 transition-all duration-200",
          autoFocus && !contextSelectionMode
            ? [focusBgColor, focusBorderColor]
            : "hover:bg-muted/10",
          contextSelectionMode && !cell.aiContextVisible && "opacity-60",
          contextSelectionMode &&
            (cell.aiContextVisible
              ? "bg-purple-50/30 ring-2 ring-purple-300"
              : "bg-gray-50/30 ring-2 ring-gray-300"),
          isBeingDragged && "scale-95 opacity-10",
          className
        )}
        onClick={contextSelectionMode ? onFocus : undefined}
        onMouseDown={onFocus}
        style={{
          position: "relative",
        }}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {children}
      </div>
    );
  }
);
