// Re-export AnsiOutput from the notebook folder for convenience
export { AnsiStreamOutput } from "../notebook/AnsiOutput.js";

// Note: Heavy output components are now dynamically imported in RichOutput.tsx
// to reduce bundle size. They are no longer exported from this index file.

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
  "application/vnd.anode.aitool.result+json"?: ToolResultData;
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

export interface ToolResultData {
  tool_call_id: string;
  result?: string;
  status: string;
}
