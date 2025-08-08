import React from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Cell } from "./cell/Cell.js";
import { CellBetweener } from "./cell/CellBetweener.js";
import { CellReference } from "@/schema";

interface CellListProps {
  cellReferences: readonly CellReference[];
  focusedCellId: string | null;
  newlyCreatedCellId: string | null;
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
  onNewCellRendered: () => void;
  contextSelectionMode?: boolean;
  // Legacy virtualization props (ignored but kept for compatibility)
  itemHeight?: number;
  overscan?: number;
  threshold?: number;
}

export const CellList: React.FC<CellListProps> = ({
  cellReferences,
  focusedCellId,
  newlyCreatedCellId,
  onAddCell,
  onDeleteCell,
  onMoveUp,
  onMoveDown,
  onFocusNext,
  onFocusPrevious,
  onFocus,
  onNewCellRendered,
  contextSelectionMode = false,
  // Virtualization props ignored
}) => {
  // Clear newly created cell status after first render
  React.useEffect(() => {
    if (newlyCreatedCellId) {
      const timer = setTimeout(() => {
        onNewCellRendered();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [newlyCreatedCellId, onNewCellRendered]);
  return (
    <div style={{ paddingLeft: "1rem" }}>
      {cellReferences.map((cellReference, index) => (
        <div key={cellReference.id}>
          <ErrorBoundary fallback={<div>Error rendering cell</div>}>
            {index === 0 && (
              <CellBetweener
                cell={cellReference}
                onAddCell={onAddCell}
                position="before"
              />
            )}
            <Cell
              cellId={cellReference.id}
              onDeleteCell={() => onDeleteCell(cellReference.id)}
              onMoveUp={() => onMoveUp(cellReference.id)}
              onMoveDown={() => onMoveDown(cellReference.id)}
              onFocusNext={() => onFocusNext(cellReference.id)}
              onFocusPrevious={() => onFocusPrevious(cellReference.id)}
              onFocus={() => onFocus(cellReference.id)}
              autoFocus={cellReference.id === focusedCellId}
              scrollIntoView={cellReference.id === newlyCreatedCellId}
              contextSelectionMode={contextSelectionMode}
            />
            <CellBetweener
              cell={cellReference}
              onAddCell={onAddCell}
              position="after"
            />
          </ErrorBoundary>
        </div>
      ))}
    </div>
  );
};
