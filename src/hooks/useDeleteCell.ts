import { useCallback } from "react";
import { useStore } from "@livestore/react";
import { useAuthenticatedUser } from "../auth/index.js";
import { useEditorRegistry } from "@/hooks/useEditorRegistry.js";
import { events, queries } from "@runtimed/schema";
import { focusedCellSignal$ } from "@/components/notebook/signals/focus.js";

export const useDeleteCell = (cellId: string) => {
  const { store } = useStore();
  const userId = useAuthenticatedUser();
  const { focusCell: registryFocusCell } = useEditorRegistry();

  const handleDeleteCell = useCallback(
    (trigger: "keyboard" | "click" = "click") => {
      const cellReferences = store.query(queries.cellsWithIndices$);
      const currentIndex = cellReferences.findIndex((c) => c.id === cellId);

      // Focus management based on trigger type
      if (trigger === "keyboard") {
        // Backspace: focus previous cell
        if (currentIndex > 0) {
          const previousCell = cellReferences[currentIndex - 1];
          store.setSignal(focusedCellSignal$, previousCell.id);
          setTimeout(() => {
            registryFocusCell(previousCell.id, "end");
          }, 0);
        } else if (cellReferences.length > 1) {
          // Focus next cell if deleting the first cell
          const nextCell = cellReferences[currentIndex + 1];
          store.setSignal(focusedCellSignal$, nextCell.id);
          setTimeout(() => {
            registryFocusCell(nextCell.id, "start");
          }, 0);
        } else {
          // Last cell - clear focus
          store.setSignal(focusedCellSignal$, null);
        }
      } else if (trigger === "click") {
        // Click delete: clear focus
        store.setSignal(focusedCellSignal$, null);
      }

      // Delete the cell
      store.commit(
        events.cellDeleted({
          id: cellId,
          actorId: userId,
        })
      );
    },
    [store, cellId, userId, registryFocusCell]
  );

  return { handleDeleteCell };
};
