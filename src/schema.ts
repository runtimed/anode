import { makeSchema, State, Store as LiveStore } from "@livestore/livestore";
import * as RuntSchema from "@runt/schema";

// Create the schema using the factory pattern
const state = State.SQLite.makeState({
  tables: RuntSchema.tables,
  materializers: RuntSchema.materializers,
});
export const schema = makeSchema({ events: RuntSchema.events, state });
export type Store = LiveStore<typeof schema>;

// Re-export everything we need from @runt/schema
export const { events, tables, materializers } = RuntSchema;

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
export const { fractionalIndexBetween, createCellBetween, moveCellBetween } =
  RuntSchema;

// Re-export type guards
export const {
  isInlineContainer,
  isArtifactContainer,
  isAiToolCallData,
  isAiToolResultData,
} = RuntSchema;

// Re-export constants
export const {
  IMAGE_MIME_TYPES,
  JUPYTER_MIME_TYPES,
  AI_TOOL_CALL_MIME_TYPE,
  AI_TOOL_RESULT_MIME_TYPE,
  TEXT_MIME_TYPES,
  APPLICATION_MIME_TYPES,
} = RuntSchema;
