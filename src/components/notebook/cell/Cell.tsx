import { queries } from "@/schema";
import React from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useQuery } from "@livestore/react";
import { ExecutableCell } from "./ExecutableCell.js";
import { MarkdownCell } from "./MarkdownCell.js";

interface CellProps {
  cellId: string;
  isFocused: boolean;
  onDeleteCell: () => void;
  onFocusNext?: () => void;
  onFocusPrevious?: () => void;
  onFocus?: () => void;
}

export const Cell: React.FC<CellProps> = ({
  cellId,
  isFocused,
  onDeleteCell,
  onFocusNext,
  onFocusPrevious,
  onFocus,
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
          onFocusNext={onFocusNext}
          onFocusPrevious={onFocusPrevious}
          autoFocus={isFocused}
          onFocus={onFocus}
        />
      ) : (
        <ExecutableCell
          cell={cell}
          onDeleteCell={onDeleteCell}
          onFocusNext={onFocusNext}
          onFocusPrevious={onFocusPrevious}
          autoFocus={isFocused}
          onFocus={onFocus}
        />
      )}
    </ErrorBoundary>
  );
};
