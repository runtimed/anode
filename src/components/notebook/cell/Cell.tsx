import { CellData } from "@runtimed/schema";
import React, { memo } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { ExecutableCell } from "./ExecutableCell.js";
import { MarkdownCell } from "./MarkdownCell.js";

interface CellProps {
  cell: CellData;
  isFocused: boolean;
  contextSelectionMode: boolean;
  dragHandle?: React.ReactNode;
}

export const Cell: React.FC<CellProps> = memo(
  ({ cell, isFocused, contextSelectionMode, dragHandle }) => {
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
