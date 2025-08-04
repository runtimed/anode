import { CellData } from "@runt/schema";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import React from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Cell } from "./cell/Cell.js";
import { CellBetweener } from "./cell/CellBetweener.js";

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
          <div
            key={vItem.key}
            data-index={vItem.index}
            ref={virtualizer.measureElement}
          >
            <ErrorBoundary fallback={<div>Error rendering cell</div>}>
              {vItem.index === 0 && (
                <CellBetweener
                  cell={cells[vItem.index]}
                  onAddCell={onAddCell}
                  position="before"
                />
              )}
              <Cell
                cell={cells[vItem.index]}
                onDeleteCell={() => onDeleteCell(cells[vItem.index].id)}
                onMoveUp={() => onMoveUp(cells[vItem.index].id)}
                onMoveDown={() => onMoveDown(cells[vItem.index].id)}
                onFocusNext={() => onFocusNext(cells[vItem.index].id)}
                onFocusPrevious={() => onFocusPrevious(cells[vItem.index].id)}
                onFocus={() => onFocus(cells[vItem.index].id)}
                autoFocus={cells[vItem.index].id === focusedCellId}
                contextSelectionMode={contextSelectionMode}
              />
              <CellBetweener
                cell={cells[vItem.index]}
                onAddCell={onAddCell}
                position="after"
              />
            </ErrorBoundary>
          </div>
        ))}
      </div>
    </div>
  );
};
