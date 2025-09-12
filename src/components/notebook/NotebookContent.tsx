import { queries } from "@runtimed/schema";
import { useQuery, useStore } from "@livestore/react";
import React from "react";
import { ErrorBoundary } from "react-error-boundary";
import { CellAdder } from "./cell/CellAdder";
import { CellList } from "./CellList";
import { EmptyStateCellAdder } from "./EmptyStateCellAdder";
import { focusedCellSignal$, hasManuallyFocused$ } from "./signals/focus.js";

export const NotebookContent = () => {
  const { store } = useStore();
  const cellReferences = useQuery(queries.cellsWithIndices$);

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
            <CellList cellReferences={cellReferences} />
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
