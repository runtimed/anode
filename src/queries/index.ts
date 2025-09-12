import { tables } from "@runtimed/schema";
import { queryDb } from "@livestore/livestore";

// Most queries come from `@runtimed/schema/queries`. Where we've needed something custom, we've written it here.

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
