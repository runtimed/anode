import { useQuery, useStore } from "@livestore/react";
import { CellData, queries } from "@runtimed/schema";
import React from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Cell } from "./cell/Cell.js";
import { CellAdder } from "./cell/CellAdder";
import { CellBetweener } from "./cell/CellBetweener.js";
import { EmptyStateCellAdder } from "./EmptyStateCellAdder";
import { contextSelectionMode$ } from "./signals/ai-context.js";
import { focusedCellSignal$, hasManuallyFocused$ } from "./signals/focus.js";
import { useHideAiCells } from "../../hooks/useHideAiCells";

export const NotebookContent = () => {
  const { store } = useStore();
  const { hideAiCells } = useHideAiCells();
  const cellReferences = useQuery(
    queries.cellsFilterAi$({ filterOutAiCells: hideAiCells })
  );

  const focusedCellId = useQuery(focusedCellSignal$);
  const hasManuallyFocused = useQuery(hasManuallyFocused$);

  // Reset focus when focused cell changes or is removed
  React.useEffect(() => {
    if (focusedCellId && !cellReferences.find((c) => c.id === focusedCellId)) {
      store.setSignal(focusedCellSignal$, null);
    }
  }, [focusedCellId, cellReferences, store]);

  // Focus first cell when notebook loads and has cells (but not after deletion)
  React.useEffect(() => {
    if (!focusedCellId && cellReferences.length > 0 && !hasManuallyFocused) {
      store.setSignal(focusedCellSignal$, cellReferences[0].id);
      store.setSignal(hasManuallyFocused$, true);
    }
  }, [focusedCellId, cellReferences, store, hasManuallyFocused]);

  return (
    <>
      {cellReferences.length === 0 ? (
        <EmptyStateCellAdder />
      ) : (
        <>
          <ErrorBoundary fallback={<div>Error rendering cell list</div>}>
            <CellList cells={cellReferences} />
          </ErrorBoundary>
          {/* Add Cell Buttons */}
          <div className="border-border/30 mt-6 border-t px-4 pt-4 sm:mt-8 sm:px-0 sm:pt-6">
            <div className="space-y-3 text-center">
              <CellAdder position="after" />
              <div className="text-muted-foreground mt-2 hidden text-xs sm:block">
                Add a new cell
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

interface CellListProps {
  cells: readonly CellData[];
}

export const CellList: React.FC<CellListProps> = ({ cells }) => {
  const focusedCellId = useQuery(focusedCellSignal$);
  const contextSelectionMode = useQuery(contextSelectionMode$);

  return (
    <div style={{ paddingLeft: "1rem" }}>
      {cells.map((cell, index) => (
        <div key={cell.id}>
          <ErrorBoundary fallback={<div>Error rendering cell</div>}>
            {index === 0 && <CellBetweener cell={cell} position="before" />}
            <Cell
              cell={cell}
              isFocused={cell.id === focusedCellId}
              contextSelectionMode={contextSelectionMode}
            />
            <CellBetweener cell={cell} position="after" />
          </ErrorBoundary>
        </div>
      ))}
    </div>
  );
};
