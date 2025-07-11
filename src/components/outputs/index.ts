// Re-export AnsiOutput from the notebook folder for convenience
export { AnsiStreamOutput } from "../notebook/AnsiOutput.js";

// Note: Heavy output components are now dynamically imported in RichOutput.tsx
// to reduce bundle size. They are no longer exported from this index file.

// Re-export types from schema for consistency
export type {
  OutputData,
  AiToolCallData,
  AiToolResultData,
} from "@runt/schema";

// Legacy type aliases for backward compatibility
export type ToolCallData = import("@runt/schema").AiToolCallData;
export type ToolResultData = import("@runt/schema").AiToolResultData;
