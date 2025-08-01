import { tables } from "@runt/schema";
import { queryDb } from "@livestore/livestore";

export * from "./outputDeltas";

export const cellIDs$ = queryDb(
  tables.cells.select("id").orderBy("position", "asc"),
  { label: "notebook.cellIds" }
);

export const notebookMetadata$ = queryDb(
  tables.notebookMetadata.select("key", "value")
);

export const cellQuery = {
  byId: (cellId: string) =>
    queryDb(
      tables.cells
        .select()
        .where({ id: cellId })
        .first({
          fallback: () => null,
        }),
      {
        deps: [cellId],
        label: `cell.${cellId}`,
      }
    ),

  outputs: (cellId: string) =>
    queryDb(
      tables.outputs.select().where({ cellId }).orderBy("position", "asc"),
      { deps: [cellId], label: `outputs:${cellId}` }
    ),

  executionQueue: (cellId: string) =>
    queryDb(
      tables.executionQueue.select().where({ cellId }).orderBy("id", "desc"),
      { deps: [cellId], label: `queue:${cellId}` }
    ),
};

export const runtimeSessions$ = queryDb(
  tables.runtimeSessions.select().orderBy("sessionId", "desc"),
  { label: "runtime.sessions" }
);
