import { useCallback, useState } from "react";
import { Button } from "../ui/button";
import { queryDb } from "@livestore/livestore";
import { useQuery, useStore } from "@livestore/react";
import { CellData, events, tables } from "@runt/schema";
import { useAuth } from "../auth/AuthProvider";

const CELLS_TO_GENERATE = 200;

export function GenerateCells() {
  const { store } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    user: { sub: userId },
  } = useAuth();

  // Get current cells to calculate position
  const cells = useQuery(queryDb(tables.cells.select())) as CellData[];

  const generateCell = useCallback(
    (input: string) => {
      // Create AI cell at the bottom of the notebook
      const cellId = crypto.randomUUID();

      // Calculate position at end
      const newPosition =
        Math.max(...cells.map((c: CellData) => c.position), -1) + 1;

      // Create the cell
      store.commit(
        events.cellCreated({
          id: cellId,
          position: newPosition,
          cellType: "code",
          createdBy: userId,
          actorId: userId,
        })
      );

      // Set the source
      store.commit(
        events.cellSourceChanged({
          id: cellId,
          source: input.trim(),
          modifiedBy: userId,
        })
      );
    },
    [cells, store, userId]
  );

  const generateCells = useCallback(async () => {
    setIsSubmitting(true);

    try {
      for (let i = 0; i < CELLS_TO_GENERATE; i++) {
        setTimeout(() => {
          generateCell(`print ('Hello, world! ${i}')`);
        }, i * 10);
      }
    } catch (error) {
      console.error("Failed to create AI cell:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [generateCell]);

  return (
    <div>
      <Button disabled={isSubmitting} onClick={generateCells}>
        Generate {CELLS_TO_GENERATE} cells
      </Button>
    </div>
  );
}
