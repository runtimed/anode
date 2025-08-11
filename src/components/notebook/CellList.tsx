import React from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useQuery } from "@livestore/react";
import { Cell } from "./cell/Cell.js";
import { CellBetweener } from "./cell/CellBetweener.js";
import { CellReference } from "@/schema";
import { focusedCellSignal$ } from "./signals/focus.js";
import { contextSelectionMode$ } from "./signals/ai-context.js";

interface CellListProps {
  cellReferences: readonly CellReference[];
}

export const CellList: React.FC<CellListProps> = ({ cellReferences }) => {
  const focusedCellId = useQuery(focusedCellSignal$);
  const contextSelectionMode = useQuery(contextSelectionMode$);

  return (
    <div style={{ paddingLeft: "1rem" }}>
      {cellReferences.map((cellReference, index) => (
        <div key={cellReference.id}>
          <ErrorBoundary fallback={<div>Error rendering cell</div>}>
            {index === 0 && (
              <CellBetweener cell={cellReference} position="before" />
            )}
            <Cell
              cellId={cellReference.id}
              isFocused={cellReference.id === focusedCellId}
              contextSelectionMode={contextSelectionMode}
            />
            <CellBetweener cell={cellReference} position="after" />
          </ErrorBoundary>
        </div>
      ))}
    </div>
  );
};
