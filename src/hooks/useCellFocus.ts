import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface CellData {
  id: string;
  position: number;
  cellType: string;
  source?: string;
  executionState?: string;
  executionCount?: number;
  sourceVisible?: boolean;
  outputVisible?: boolean;
  aiContextVisible?: boolean;
}

interface UseCellFocusOptions {
  cells: CellData[];
  onAddCell: (afterCellId?: string, cellType?: string) => void;
}

export const useCellFocus = ({ cells, onAddCell }: UseCellFocusOptions) => {
  const [focusedCellId, setFocusedCellId] = useState<string | null>(null);
  const focusTimeoutRef = useRef<number | null>(null);

  // Memoize sorted cells to avoid repeated sorting operations
  const sortedCells = useMemo(() => {
    return [...cells].sort((a, b) => a.position - b.position);
  }, [cells]);

  // Create cell position index for O(1) lookups
  const cellPositionMap = useMemo(() => {
    const map = new Map<string, number>();
    sortedCells.forEach((cell, index) => {
      map.set(cell.id, index);
    });
    return map;
  }, [sortedCells]);

  // Debounced focus change to prevent excessive re-renders
  const debouncedSetFocus = useCallback((cellId: string | null) => {
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }

    focusTimeoutRef.current = window.setTimeout(() => {
      setFocusedCellId(cellId);
    }, 10);
  }, []);

  const focusCell = useCallback((cellId: string) => {
    debouncedSetFocus(cellId);
  }, [debouncedSetFocus]);

  const focusNextCell = useCallback(
    (currentCellId: string) => {
      const currentIndex = cellPositionMap.get(currentCellId);
      if (currentIndex === undefined) return;

      if (currentIndex < sortedCells.length - 1) {
        const nextCell = sortedCells[currentIndex + 1];
        debouncedSetFocus(nextCell.id);
      } else {
        // At the last cell, create a new one with same cell type (but never raw)
        const currentCell = sortedCells[currentIndex];
        const newCellType =
          currentCell.cellType === "raw" ? "code" : currentCell.cellType;
        onAddCell(currentCellId, newCellType);
      }
    },
    [cellPositionMap, sortedCells, onAddCell, debouncedSetFocus]
  );

  const focusPreviousCell = useCallback(
    (currentCellId: string) => {
      const currentIndex = cellPositionMap.get(currentCellId);
      if (currentIndex === undefined) return;

      if (currentIndex > 0) {
        const previousCell = sortedCells[currentIndex - 1];
        debouncedSetFocus(previousCell.id);
      }
    },
    [cellPositionMap, sortedCells, debouncedSetFocus]
  );

  // Reset focus when focused cell is removed
  useEffect(() => {
    if (focusedCellId && !cellPositionMap.has(focusedCellId)) {
      setFocusedCellId(null);
    }
  }, [focusedCellId, cellPositionMap]);

  // Focus first cell when notebook loads and has cells
  useEffect(() => {
    if (!focusedCellId && sortedCells.length > 0) {
      debouncedSetFocus(sortedCells[0].id);
    }
  }, [focusedCellId, sortedCells, debouncedSetFocus]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);

  return {
    focusedCellId,
    sortedCells,
    cellPositionMap,
    focusCell,
    focusNextCell,
    focusPreviousCell,
  };
};
