import { CellData } from "@runt/schema";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import React from "react";
import { VirtualizedItemCell } from "./VirtualizedItemCell.js";

interface VirtualizedCellListProps {
  cells: readonly CellData[];
  focusedCellId: string | null;
  onAddCell: (
    cellId?: string,
    cellType?: "code" | "markdown" | "sql" | "ai",
    position?: "before" | "after"
  ) => void;
  onDeleteCell: (cellId: string) => void;
  onMoveUp: (cellId: string) => void;
  onMoveDown: (cellId: string) => void;
  onFocusNext: (cellId: string) => void;
  onFocusPrevious: (cellId: string) => void;
  onFocus: (cellId: string) => void;
  contextSelectionMode?: boolean;
  // Virtualization config
  itemHeight?: number;
  overscan?: number;
  threshold?: number; // Number of cells before virtualization kicks in
}

export const VirtualizedCellList: React.FC<VirtualizedCellListProps> = ({
  cells,
  focusedCellId,
  onAddCell,
  onDeleteCell,
  onMoveUp,
  onMoveDown,
  onFocusNext,
  onFocusPrevious,
  onFocus,
  contextSelectionMode = false,
  itemHeight = 200, // Estimated height per cell
  overscan = 10, // Extra items to render outside viewport
  threshold = 50, // Enable virtualization when cells > threshold
}) => {
  // eslint-disable-next-line react-compiler/react-compiler
  "use no memo";

  const virtualizer = useWindowVirtualizer({
    count: cells.length,
    // getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan,
    enabled: cells.length > threshold,
  });

  const vItems = virtualizer.getVirtualItems();

  return (
    <div
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        width: "100%",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          transform: `translateY(${vItems[0]?.start ?? 0}px)`,
        }}
      >
        {vItems.map((vItem) => (
          <VirtualizedItemCell
            key={vItem.key}
            virtualItem={vItem}
            cell={cells[vItem.index]}
            onDeleteCell={onDeleteCell}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onFocusNext={onFocusNext}
            onFocusPrevious={onFocusPrevious}
            onFocus={onFocus}
            onAddCell={onAddCell}
            autoFocus={cells[vItem.index].id === focusedCellId}
            contextSelectionMode={contextSelectionMode}
            measureElement={virtualizer.measureElement}
          />
        ))}
      </div>
    </div>
  );
};
