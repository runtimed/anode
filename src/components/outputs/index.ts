// Re-export AnsiOutput from the notebook folder for convenience
import { AiToolCallData, AiToolResultData } from "@/schema";

export { AiToolCallOutput } from "./AiToolCallOutput.js";
export { AiToolResultOutput } from "./AiToolResultOutput.js";
export { AiToolApprovalOutput } from "./AiToolApprovalOutput.js";
export { AnsiOutput, AnsiStreamOutput } from "./AnsiOutput.js";
export { HtmlOutput } from "./HtmlOutput.js";
export { ImageOutput } from "./ImageOutput.js";
export { JsonOutput } from "./JsonOutput.js";

export { PlainTextOutput } from "./PlainTextOutput.js";
export { RichOutput } from "./RichOutput.js";
export { SvgOutput } from "./SvgOutput.js";

// Note: Heavy output components are now dynamically imported in RichOutput.tsx
// to reduce bundle size. They are no longer exported from this index file.

// Re-export types from schema for consistency
export type { OutputData, AiToolCallData, AiToolResultData } from "@/schema";

// Legacy type aliases for backward compatibility
export type ToolCallData = AiToolCallData;
export type ToolResultData = AiToolResultData;
