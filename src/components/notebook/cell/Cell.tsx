import { queries } from "@/schema";
import React from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useQuery } from "@livestore/react";
import { UniversalCell } from "./UniversalCell.js";

interface CellProps {
  cellId: string;
  onDeleteCell: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onFocusNext?: () => void;
  onFocusPrevious?: () => void;
  autoFocus?: boolean;
  onFocus?: () => void;
  contextSelectionMode?: boolean;
}

export const Cell: React.FC<CellProps> = ({
  cellId,
  onDeleteCell,
  onMoveUp,
  onMoveDown,
  onFocusNext,
  onFocusPrevious,
  autoFocus = false,
  onFocus,
  contextSelectionMode = false,
}) => {
  const cell = useQuery(queries.cellQuery.byId(cellId));

  if (!cell) {
    console.warn("Asked to render a cell that does not exist");
    return null;
  }

  return (
    <ErrorBoundary fallback={<div>Error rendering cell</div>}>
      <UniversalCell
        cell={cell}
        onDeleteCell={onDeleteCell}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onFocusNext={onFocusNext}
        onFocusPrevious={onFocusPrevious}
        autoFocus={autoFocus}
        onFocus={onFocus}
        contextSelectionMode={contextSelectionMode}
      />
    </ErrorBoundary>
  );
};
