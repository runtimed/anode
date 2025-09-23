import { tables } from "@runtimed/schema";
import { forwardRef, ReactNode, useState } from "react";
import "./PresenceIndicators.css";
import { useDragDropCellSort } from "@/hooks/useDragDropCellSort";

interface CellContainerProps {
  cell: typeof tables.cells.Type;
  autoFocus?: boolean;
  contextSelectionMode?: boolean;
  onFocus?: () => void;
  children: ReactNode;
  focusColor?: string;
  focusBgColor?: string;
}

export const CellContainer = forwardRef<HTMLDivElement, CellContainerProps>(
  (
    {
      cell,
      autoFocus = false,
      contextSelectionMode = false,
      onFocus,
      children,
      focusColor = "bg-primary/60",
      focusBgColor = "bg-primary/5",
    },
    ref
  ) => {
    const [draggingOverPosition, setDraggingOverPosition] = useState<
      "before" | "after" | undefined
    >();
    const { onDrop } = useDragDropCellSort();

    return (
      <div
        ref={ref}
        data-cell-id={cell.id}
        className={`cell-container group relative pt-2 transition-all duration-200 ${
          autoFocus && !contextSelectionMode
            ? focusBgColor
            : "hover:bg-muted/10"
        } ${contextSelectionMode && !cell.aiContextVisible ? "opacity-60" : ""} ${
          contextSelectionMode
            ? cell.aiContextVisible
              ? "bg-purple-50/30 ring-2 ring-purple-300"
              : "bg-gray-50/30 ring-2 ring-gray-300"
            : ""
        }`}
        onClick={contextSelectionMode ? onFocus : undefined}
        style={{
          position: "relative",
        }}
        draggable
        onDragStart={(e) => (e.dataTransfer.effectAllowed = "move")}
        onDragOver={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const y = e.clientY - rect.top;
          const isTopHalf = y < rect.height / 2;
          setDraggingOverPosition(isTopHalf ? "before" : "after");
          console.log(
            `Drag over ${cell.id} - ${isTopHalf ? "top" : "bottom"} half`
          );
        }}
        onDrop={() => onDrop(cell.id, draggingOverPosition)}
      >
        {/* Custom left border with controlled height */}
        <div
          className={`cell-border absolute top-0 left-3 w-0.5 transition-all duration-200 sm:left-0 ${
            autoFocus && !contextSelectionMode ? focusColor : "bg-border/30"
          }`}
          style={{
            height: "100%", // Will be controlled by content
          }}
        />

        {children}
      </div>
    );
  }
);
