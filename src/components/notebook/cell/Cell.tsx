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
  onAddCell: (
    cellId?: string,
    cellType?: "code" | "markdown" | "sql" | "ai",
    position?: "before" | "after"
  ) => void;
}

export const Cell: React.FC<CellProps> = ({
  cellId,
  isFocused,
  onDeleteCell,
  onAddCell,
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
          onAddCell={onAddCell}
          autoFocus={isFocused}
        />
      ) : (
        <ExecutableCell
          cell={cell}
          onDeleteCell={onDeleteCell}
          onAddCell={onAddCell}
          autoFocus={isFocused}
        />
      )}
    </ErrorBoundary>
  );
};
