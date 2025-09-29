import { queryDb } from "../index.ts";
import { tables } from "../tables.ts";

export const maxAiIterations$ = queryDb(
  tables.notebookMetadata
    .select("value")
    .where("key", "=", "max_ai_iterations")
    .first({ fallback: () => "10" })
);
