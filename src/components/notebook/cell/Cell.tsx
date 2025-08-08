import { queries } from "@/schema";
import React from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useQuery } from "@livestore/react";
import { ExecutableCell } from "./ExecutableCell.js";
import { MarkdownCell } from "./MarkdownCell.js";

interface CellProps {
  cellId: string;
  onDeleteCell: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onFocusNext?: () => void;
  onFocusPrevious?: () => void;
  autoFocus?: boolean;
  scrollIntoView?: boolean;
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
  scrollIntoView = false,
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
      {cell.cellType === "markdown" ? (
        <MarkdownCell
          cell={cell}
          onDeleteCell={onDeleteCell}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onFocusNext={onFocusNext}
          onFocusPrevious={onFocusPrevious}
          autoFocus={autoFocus}
          scrollIntoView={scrollIntoView}
          onFocus={onFocus}
          contextSelectionMode={contextSelectionMode}
        />
      ) : (
        <ExecutableCell
          cell={cell}
          onDeleteCell={onDeleteCell}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onFocusNext={onFocusNext}
          onFocusPrevious={onFocusPrevious}
          autoFocus={autoFocus}
          scrollIntoView={scrollIntoView}
          onFocus={onFocus}
          contextSelectionMode={contextSelectionMode}
        />
      )}
    </ErrorBoundary>
  );
};
