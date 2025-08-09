import React from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useQuery } from "@livestore/react";
import { Cell } from "./cell/Cell.js";
import { CellBetweener } from "./cell/CellBetweener.js";
import { CellReference } from "@/schema";
import { focusedCellSignal$ } from "./signals/focus.js";

interface CellListProps {
  cellReferences: readonly CellReference[];
  onAddCell: (
    cellId?: string,
    cellType?: "code" | "markdown" | "sql" | "ai",
    position?: "before" | "after"
  ) => void;
  onDeleteCell: (cellId: string) => void;
}

export const CellList: React.FC<CellListProps> = ({
  cellReferences,
  onAddCell,
  onDeleteCell,
}) => {
  const focusedCellId = useQuery(focusedCellSignal$);
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
              isFocused={cellReference.id === focusedCellId}
              onDeleteCell={() => onDeleteCell(cellReference.id)}
              onAddCell={onAddCell}
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
