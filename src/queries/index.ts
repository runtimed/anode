import { tables } from "@/schema";
import { queryDb } from "@livestore/livestore";

export * from "./outputDeltas";
export * from "./cellOrdering";

export const cellIDs$ = queryDb(
  tables.cells.select("id").orderBy("fractionalIndex", "asc"),
  { label: "notebook.cellIds" }
);

// Fine-grained query for cell list with fractional indices
export const cellList$ = queryDb(
  tables.cells
    .select("id", "fractionalIndex")
    .orderBy("fractionalIndex", "asc"),
  { label: "notebook.cellList" }
);

// Query for getting a specific cell's fractional index
export const cellFractionalIndex = (cellId: string) =>
  queryDb(
    tables.cells
      .select("fractionalIndex")
      .where({ id: cellId })
      .first({
        fallback: () => null,
      }),
    {
      deps: [cellId],
      label: `cell.fractionalIndex.${cellId}`,
    }
  );

// Stable queries for notebook metadata to prevent reference instability
export const lastUsedAiModel$ = queryDb(
  tables.notebookMetadata
    .select()
    .where({ key: "lastUsedAiModel" })
    .first({ fallback: () => null }),
  { label: "notebook.lastUsedAiModel" }
);

export const lastUsedAiProvider$ = queryDb(
  tables.notebookMetadata
    .select()
    .where({ key: "lastUsedAiProvider" })
    .first({ fallback: () => null }),
  { label: "notebook.lastUsedAiProvider" }
);

// Query for getting adjacent cells (useful for cell insertion)
export const adjacentCells = (cellId: string) =>
  queryDb(
    tables.cells
      .select("id", "fractionalIndex")
      .orderBy("fractionalIndex", "asc"),
    {
      deps: [cellId],
      label: `adjacentCells.${cellId}`,
    }
  );

export const notebookMetadata$ = queryDb(
  tables.notebookMetadata.select("key", "value")
);

export const runtimeSessions$ = queryDb(
  tables.runtimeSessions.select().orderBy("sessionId", "desc"),
  { label: "runtime.sessions" }
);
