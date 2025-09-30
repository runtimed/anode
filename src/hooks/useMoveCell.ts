import { useCallback } from "react";
import { useStore } from "@livestore/react";
import { useAuthenticatedUser } from "../auth/index.js";
import { queries, moveCellBetween } from "@runtimed/schema";

export const useMoveCell = (cellId: string) => {
  const { store } = useStore();
  const userId = useAuthenticatedUser();

  // Helper function to get cell references and current index
  const getCellContext = useCallback(() => {
    const cellReferences = store.query(queries.cellsWithIndices$);
    const currentIndex = cellReferences.findIndex((c) => c.id === cellId);
    return { cellReferences, currentIndex };
  }, [store, cellId]);

  // Helper function to execute a move operation
  const executeMove = useCallback(
    (beforeCell: any, afterCell: any) => {
      const { cellReferences, currentIndex } = getCellContext();
      const currentCell = cellReferences[currentIndex];

      const moveEvent = moveCellBetween(
        currentCell,
        beforeCell,
        afterCell,
        userId
      );
      if (moveEvent) {
        store.commit(moveEvent);
      }
    },
    [getCellContext, userId, store]
  );

  // Helper function to check if movement is possible
  const canMove = useCallback(
    (direction: "up" | "down") => {
      const { cellReferences, currentIndex } = getCellContext();
      if (direction === "up") {
        return currentIndex > 0;
      } else {
        return currentIndex < cellReferences.length - 1;
      }
    },
    [getCellContext]
  );

  const canMoveUp = useCallback(() => canMove("up"), [canMove]);
  const canMoveDown = useCallback(() => canMove("down"), [canMove]);

  // ---

  const moveCellUp = useCallback(() => {
    if (!canMove("up")) return;

    const { cellReferences, currentIndex } = getCellContext();

    const previousCell = cellReferences[currentIndex - 1];
    const cellBefore =
      currentIndex > 1 ? cellReferences[currentIndex - 2] : null;

    executeMove(cellBefore, previousCell);
  }, [getCellContext, canMove, executeMove]);

  const moveCellDown = useCallback(() => {
    if (!canMove("down")) return;

    const { cellReferences, currentIndex } = getCellContext();

    const nextCell = cellReferences[currentIndex + 1];
    const cellAfter =
      currentIndex < cellReferences.length - 2
        ? cellReferences[currentIndex + 2]
        : null;

    executeMove(nextCell, cellAfter);
  }, [getCellContext, canMove, executeMove]);

  const moveCellToTop = useCallback(() => {
    if (!canMove("up")) return;

    const { cellReferences } = getCellContext();

    const firstCell = cellReferences[0];
    executeMove(null, firstCell);
  }, [getCellContext, canMove, executeMove]);

  const moveCellToBottom = useCallback(() => {
    if (!canMove("down")) return;

    const { cellReferences } = getCellContext();

    const lastCell = cellReferences[cellReferences.length - 1];
    executeMove(lastCell, null);
  }, [getCellContext, canMove, executeMove]);

  return {
    moveCellUp,
    moveCellDown,
    moveCellToTop,
    moveCellToBottom,
    canMoveUp: canMoveUp(),
    canMoveDown: canMoveDown(),
  };
};
