import { queries } from "@runtimed/schema";
import React, { memo } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useQuery } from "@livestore/react";
import { ExecutableCell } from "./ExecutableCell.js";
import { MarkdownCell } from "./MarkdownCell.js";

interface CellProps {
  cellId: string;
  isFocused: boolean;
  contextSelectionMode: boolean;
  dragHandle?: React.ReactNode;
}

export const Cell: React.FC<CellProps> = memo(
  ({ cellId, isFocused, contextSelectionMode, dragHandle }) => {
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
            autoFocus={isFocused}
            contextSelectionMode={contextSelectionMode}
            dragHandle={dragHandle}
          />
        ) : (
          <ExecutableCell
            cell={cell}
            autoFocus={isFocused}
            contextSelectionMode={contextSelectionMode}
            dragHandle={dragHandle}
          />
        )}
      </ErrorBoundary>
    );
  }
);
