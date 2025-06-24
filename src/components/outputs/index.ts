export { MarkdownRenderer } from "./MarkdownRenderer.js";
export { ImageOutput } from "./ImageOutput.js";
export { SvgOutput } from "./SvgOutput.js";
export { JsonOutput } from "./JsonOutput.js";
export { AiToolCallOutput } from "./AiToolCallOutput.js";
export { HtmlOutput } from "./HtmlOutput.js";
export { PlainTextOutput } from "./PlainTextOutput.js";

// Re-export AnsiOutput from the notebook folder for convenience
export { AnsiStreamOutput } from "../notebook/AnsiOutput.js";

// Helper types
export interface OutputData {
  "text/plain"?: string;
  "text/markdown"?: string;
  "text/html"?: string;
  "image/svg+xml"?: string;
  "image/svg"?: string;
  "image/png"?: string;
  "image/jpeg"?: string;
  "application/json"?: unknown;
  "application/vnd.anode.aitool+json"?: ToolCallData;
  [key: string]: unknown;
}

export interface ToolCallData {
  tool_call_id: string;
  tool_name: string;
  arguments: Record<string, any>;
  status: "success" | "error";
  timestamp: string;
  execution_time_ms?: number;
}
