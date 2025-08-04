import { CellData } from "@runt/schema";
import { VirtualItem } from "@tanstack/react-virtual";
import { ErrorBoundary } from "react-error-boundary";
import { Cell } from "./cell/Cell.js";
import { CellBetweener } from "./cell/CellBetweener.js";

interface VirtualizedItemCellProps {
  virtualItem: VirtualItem;
  cell: CellData;
  onDeleteCell: (cellId: string) => void;
  onMoveUp: (cellId: string) => void;
  onMoveDown: (cellId: string) => void;
  onFocusNext: (cellId: string) => void;
  onFocusPrevious: (cellId: string) => void;
  onFocus: (cellId: string) => void;
  onAddCell: (
    cellId?: string,
    cellType?: "code" | "markdown" | "sql" | "ai",
    position?: "before" | "after"
  ) => void;
  autoFocus: boolean;
  contextSelectionMode: boolean;
  measureElement: (node: HTMLElement | null) => void;
}

export function VirtualizedItemCell({
  virtualItem,
  cell,
  onDeleteCell,
  onMoveUp,
  onMoveDown,
  onFocusNext,
  onFocusPrevious,
  onFocus,
  onAddCell,
  autoFocus,
  contextSelectionMode,
  measureElement,
}: VirtualizedItemCellProps) {
  return (
    <div
      key={virtualItem.key}
      data-index={virtualItem.index}
      ref={measureElement}
    >
      <ErrorBoundary fallback={<div>Error rendering cell</div>}>
        {virtualItem.index === 0 && (
          <CellBetweener cell={cell} onAddCell={onAddCell} position="before" />
        )}
        <Cell
          cell={cell}
          onDeleteCell={() => onDeleteCell(cell.id)}
          onMoveUp={() => onMoveUp(cell.id)}
          onMoveDown={() => onMoveDown(cell.id)}
          onFocusNext={() => onFocusNext(cell.id)}
          onFocusPrevious={() => onFocusPrevious(cell.id)}
          onFocus={() => onFocus(cell.id)}
          autoFocus={autoFocus}
          contextSelectionMode={contextSelectionMode}
        />
        <CellBetweener cell={cell} onAddCell={onAddCell} position="after" />
      </ErrorBoundary>
    </div>
  );
}
