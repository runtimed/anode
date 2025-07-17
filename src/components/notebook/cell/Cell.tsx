import { tables } from "@runt/schema";
import React from "react";

import { AiCell } from "./AiCell.js";
import { CodeCell } from "./CodeCell.js";
import { MarkdownCell } from "./MarkdownCell.js";
import { SqlCell } from "./SqlCell.js";

import { ErrorBoundary } from "react-error-boundary";

type CellType = typeof tables.cells.Type;

interface CellProps {
  cell: CellType;
  onAddCell: () => void;
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
  cell,
  onAddCell,
  onDeleteCell,
  onMoveUp,
  onMoveDown,
  onFocusNext,
  onFocusPrevious,
  autoFocus = false,
  onFocus,
  contextSelectionMode = false,
}) => {
  // Route to specialized cell components
  if (cell.cellType === "code") {
    return (
      <ErrorBoundary fallback={<div>Error rendering code cell</div>}>
        <CodeCell
          cell={cell}
          onAddCell={onAddCell}
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
  }

  if (cell.cellType === "sql") {
    return (
      <ErrorBoundary fallback={<div>Error rendering SQL cell</div>}>
        <SqlCell
          cell={cell}
          onAddCell={onAddCell}
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
  }

  if (cell.cellType === "ai") {
    return (
      <ErrorBoundary fallback={<div>Error rendering AI cell</div>}>
        <AiCell
          cell={cell}
          onAddCell={onAddCell}
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
  }

  if (cell.cellType === "markdown") {
    return (
      <ErrorBoundary fallback={<div>Error rendering markdown cell</div>}>
        <MarkdownCell
          cell={cell}
          onAddCell={onAddCell}
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
  }

  throw new Error(`Unknown cell type: ${cell.cellType}`);
};
