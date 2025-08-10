// Re-export AnsiOutput from the notebook folder for convenience
import { AiToolCallData, AiToolResultData } from "@/schema";

export { AiToolCallOutput } from "./AiToolCallOutput.js";
export { AiToolResultOutput } from "./AiToolResultOutput.js";
export { AiToolApprovalOutput } from "./AiToolApprovalOutput.js";
export { HtmlOutput } from "./shared-with-iframe/HtmlOutput.js";
export { ImageOutput } from "./shared-with-iframe/ImageOutput.js";
export { JsonOutput } from "./shared-with-iframe/JsonOutput.js";

export { PlainTextOutput } from "./shared-with-iframe/PlainTextOutput.js";
export { SingleOutput as RichOutput } from "./shared-with-iframe/SingleOutput.js";
export { SvgOutput } from "./shared-with-iframe/SvgOutput.js";

// Note: Heavy output components are now dynamically imported in RichOutput.tsx
// to reduce bundle size. They are no longer exported from this index file.

// Re-export types from schema for consistency
export type { OutputData, AiToolCallData, AiToolResultData } from "@/schema";

// Legacy type aliases for backward compatibility
export type ToolCallData = AiToolCallData;
export type ToolResultData = AiToolResultData;
