import { makeSchema, State, Store as LiveStore } from "@livestore/livestore";
// import { events, tables, materializers } from "@runt/schema";
// import type { CellData, RuntimeSessionData, MediaContainer, OutputData, AiToolCallData, AiToolResultData } from "@runt/schema";
import { events, tables, materializers } from "./runt-schema";
import type {
  CellData,
  RuntimeSessionData,
  MediaContainer,
  OutputData,
  AiToolCallData,
  AiToolResultData,
} from "./runt-schema";

// Create the schema using the factory pattern
const state = State.SQLite.makeState({ tables, materializers });
export const schema = makeSchema({ events, state });
export type Store = LiveStore<typeof schema>;

// Re-export core schema components
export { events, tables, materializers };

// Re-export types
export type {
  CellData,
  RuntimeSessionData,
  MediaContainer,
  OutputData,
  AiToolCallData,
  AiToolResultData,
};

// Re-export functions
export {
  fractionalIndexBetween,
  createCellAfter,
  createCellBefore,
} from "@runt/schema";

// Re-export type guards
export {
  isInlineContainer,
  isArtifactContainer,
  isAiToolCallData,
  isAiToolResultData,
} from "@runt/schema";

// Re-export constants
export {
  IMAGE_MIME_TYPES,
  JUPYTER_MIME_TYPES,
  AI_TOOL_CALL_MIME_TYPE,
  AI_TOOL_RESULT_MIME_TYPE,
  TEXT_MIME_TYPES,
  APPLICATION_MIME_TYPES,
} from "@runt/schema";
