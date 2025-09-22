import { useCallback } from "react";
import { useStore } from "@livestore/react";
import { useAuthenticatedUser } from "../auth/index.js";
import { queries, moveCellBetween } from "@runtimed/schema";

export const useMoveCell = (cellId: string) => {
  const { store } = useStore();
  const userId = useAuthenticatedUser();

  const moveCellUp = useCallback(() => {
    const cellReferences = store.query(queries.cellsWithIndices$);
    const currentIndex = cellReferences.findIndex((c) => c.id === cellId);

    if (currentIndex <= 0) {
      // Already at the top, can't move up
      return;
    }

    const currentCell = cellReferences[currentIndex];
    const previousCell = cellReferences[currentIndex - 1];
    const cellBefore =
      currentIndex > 1 ? cellReferences[currentIndex - 2] : null;

    // Move current cell to position before the previous cell
    const moveEvent = moveCellBetween(
      currentCell,
      cellBefore,
      previousCell,
      userId
    );

    if (moveEvent) {
      store.commit(moveEvent);
    }
  }, [store, cellId, userId]);

  const moveCellDown = useCallback(() => {
    const cellReferences = store.query(queries.cellsWithIndices$);
    const currentIndex = cellReferences.findIndex((c) => c.id === cellId);

    if (currentIndex >= cellReferences.length - 1) {
      // Already at the bottom, can't move down
      return;
    }

    const currentCell = cellReferences[currentIndex];
    const nextCell = cellReferences[currentIndex + 1];
    const cellAfter =
      currentIndex < cellReferences.length - 2
        ? cellReferences[currentIndex + 2]
        : null;

    // Move current cell to position after the next cell
    const moveEvent = moveCellBetween(currentCell, nextCell, cellAfter, userId);

    if (moveEvent) {
      store.commit(moveEvent);
    }
  }, [store, cellId, userId]);

  const canMoveUp = useCallback(() => {
    const cellReferences = store.query(queries.cellsWithIndices$);
    const currentIndex = cellReferences.findIndex((c) => c.id === cellId);
    return currentIndex > 0;
  }, [store, cellId]);

  const canMoveDown = useCallback(() => {
    const cellReferences = store.query(queries.cellsWithIndices$);
    const currentIndex = cellReferences.findIndex((c) => c.id === cellId);
    return currentIndex < cellReferences.length - 1;
  }, [store, cellId]);

  const moveCellToTop = useCallback(() => {
    const cellReferences = store.query(queries.cellsWithIndices$);
    const currentIndex = cellReferences.findIndex((c) => c.id === cellId);

    if (currentIndex <= 0) {
      // Already at the top, can't move to top
      return;
    }

    const currentCell = cellReferences[currentIndex];
    const firstCell = cellReferences[0];

    // Move current cell to position before the first cell (i.e., to the top)
    const moveEvent = moveCellBetween(currentCell, null, firstCell, userId);

    if (moveEvent) {
      store.commit(moveEvent);
    }
  }, [store, cellId, userId]);

  const moveCellToBottom = useCallback(() => {
    const cellReferences = store.query(queries.cellsWithIndices$);
    const currentIndex = cellReferences.findIndex((c) => c.id === cellId);

    if (currentIndex >= cellReferences.length - 1) {
      // Already at the bottom, can't move to bottom
      return;
    }

    const currentCell = cellReferences[currentIndex];
    const lastCell = cellReferences[cellReferences.length - 1];

    // Move current cell to position after the last cell (i.e., to the bottom)
    const moveEvent = moveCellBetween(currentCell, lastCell, null, userId);

    if (moveEvent) {
      store.commit(moveEvent);
    }
  }, [store, cellId, userId]);

  return {
    moveCellUp,
    moveCellDown,
    moveCellToTop,
    moveCellToBottom,
    canMoveUp: canMoveUp(),
    canMoveDown: canMoveDown(),
  };
};
