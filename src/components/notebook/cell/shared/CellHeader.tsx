import { useDragDropCellSort } from "@/hooks/useDragDropCellSort";
import { cn } from "@/lib/utils";
import React, { ReactNode, useCallback } from "react";

interface CellHeaderProps {
  cellId: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void;
  leftContent: ReactNode;
  rightContent: ReactNode;
}

export const CellHeader: React.FC<CellHeaderProps> = ({
  cellId,
  className = "",
  onKeyDown,
  leftContent,
  rightContent,
}) => {
  const { setDraggingCell } = useDragDropCellSort();

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = "move";
      setDraggingCell(cellId);
    },
    [cellId, setDraggingCell]
  );

  return (
    <div
      className={cn(
        "cell-header flex items-center justify-between px-1 py-2 sm:pr-4",
        className
      )}
      onKeyDown={onKeyDown}
      draggable={true}
      onDragStart={handleDragStart}
    >
      <div className="flex items-center gap-1">{leftContent}</div>
      {rightContent}
    </div>
  );
};
