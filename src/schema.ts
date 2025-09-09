import { makeSchema, State, Store as LiveStore } from "@livestore/livestore";
import * as RuntSchema from "@/runt-schema";

export * as queries from "@/runt-schema/queries";

// Create the schema using the factory pattern
const state = State.SQLite.makeState({
  tables: RuntSchema.tables,
  materializers: RuntSchema.materializers,
});
export const schema = makeSchema({ events: RuntSchema.events, state });
export type Store = LiveStore<typeof schema>;

// Overriding for now to include a cell type
export type CellReference = RuntSchema.CellReference & {
  cellType: RuntSchema.CellType;
};

export type {
  // Re-export types
  CellData,
  CellType,
  RuntimeSessionData,
  MediaContainer,
  OutputData,
  AiToolCallData,
  AiToolResultData,
  CellOperationResult,
  MoveOperationResult,
} from "@/runt-schema";

// TODO: put these into @runt/schema
/**
 * Safe MIME types are ones that are safe to render directly in the parent page.
 * And content that has the capability of running scipts is insafe. Some examples:
 * - text/html
 * - text/markdown
 * - svg
 *
 * We're using a whitelist because it's safer.
 */
export const SAFE_MIME_TYPES = [
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/gif",
] as const;

export const {
  // Re-export everything we need from @runt/schema
  events,
  tables,
  materializers,
  // Re-export functions
  fractionalIndexBetween,
  createCellBetween,
  moveCellBetween,
  moveCellBetweenWithRebalancing,
  // Re-export convenience functions
  createCellBetweenAndCommit,
  moveCellBetweenAndCommit,
  // Re-export type guards
  isInlineContainer,
  isArtifactContainer,
  isAiToolCallData,
  isAiToolResultData,
  // Re-export constants
  IMAGE_MIME_TYPES,
  JUPYTER_MIME_TYPES,
  AI_TOOL_CALL_MIME_TYPE,
  AI_TOOL_RESULT_MIME_TYPE,
  TEXT_MIME_TYPES,
  APPLICATION_MIME_TYPES,
} = RuntSchema;
