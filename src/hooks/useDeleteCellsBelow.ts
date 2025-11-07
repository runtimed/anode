import { useCallback, useMemo } from "react";
import { useStore } from "@livestore/react";
import { useAuthenticatedUser } from "../auth/index.js";
import { events, queries } from "@runtimed/schema";

export const useDeleteCellsBelow = (cellId: string) => {
  const { store } = useStore();
  const userId = useAuthenticatedUser();

  const deleteAllCellsBelow = useCallback(() => {
    const cellReferences = store.query(queries.cellsWithIndices$);
    const currentIndex = cellReferences.findIndex((c) => c.id === cellId);

    if (currentIndex === -1) {
      return;
    }

    // Delete all cells after the current one
    // We could delete in one event. This would be prefered in other instances, like
    // when running all cells.
    const cellsToDelete = cellReferences.slice(currentIndex + 1);
    store.commit(
      ...cellsToDelete.map((cellToDelete) =>
        events.cellDeleted({
          id: cellToDelete.id,
          actorId: userId,
        })
      )
    );
  }, [cellId, store, userId]);

  // Check if there are cells below
  const hasCellsBelow = useMemo(() => {
    const cellReferences = store.query(queries.cellsWithIndices$);
    const currentIndex = cellReferences.findIndex((c) => c.id === cellId);
    return currentIndex !== -1 && currentIndex < cellReferences.length - 1;
  }, [cellId, store]);

  return { deleteAllCellsBelow, hasCellsBelow };
};
