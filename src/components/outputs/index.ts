// Re-export components from the shared package for convenience
import { AiToolCallData, AiToolResultData } from "@/schema";

export { AiToolCallOutput } from "@anode/shared";
export { AiToolResultOutput } from "@anode/shared";
export { AiToolApprovalOutput } from "@anode/shared";
export { HtmlOutput } from "@anode/shared";
export { ImageOutput } from "@anode/shared";
export { JsonOutput } from "@anode/shared";
export { PlainTextOutput } from "@anode/shared";
export { SingleOutput as RichOutput } from "@anode/shared";
export { SvgOutput } from "@anode/shared";

// Note: Heavy output components are now dynamically imported in RichOutput.tsx
// from the shared package

// Export types for convenience
export type { AiToolCallData, AiToolResultData };
