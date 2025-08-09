import { queries } from "@/schema";
import React from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useQuery } from "@livestore/react";
import { ExecutableCell } from "./ExecutableCell.js";
import { MarkdownCell } from "./MarkdownCell.js";
import { contextSelectionMode$ } from "../signals/ai-context.js";

interface CellProps {
  cellId: string;
  isFocused: boolean;
}

export const Cell: React.FC<CellProps> = ({ cellId, isFocused }) => {
  const cell = useQuery(queries.cellQuery.byId(cellId));
  const contextSelectionMode = useQuery(contextSelectionMode$);

  if (!cell) {
    console.warn("Asked to render a cell that does not exist");
    return null;
  }

  return (
    <ErrorBoundary fallback={<div>Error rendering cell</div>}>
      {cell.cellType === "markdown" ? (
        <MarkdownCell
          cell={cell}
          autoFocus={isFocused}
          contextSelectionMode={contextSelectionMode}
        />
      ) : (
        <ExecutableCell
          cell={cell}
          autoFocus={isFocused}
          contextSelectionMode={contextSelectionMode}
        />
      )}
    </ErrorBoundary>
  );
};
