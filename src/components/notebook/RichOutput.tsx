import React, { Suspense } from "react";
import { StreamOutputData } from "@runt/schema";
import {
  AnsiStreamOutput,
  OutputData,
  ToolCallData,
  ToolResultData,
} from "../outputs/index.js";
import "../outputs/outputs.css";

// Dynamic imports for heavy components
const MarkdownRenderer = React.lazy(() =>
  import("../outputs/MarkdownRenderer.js").then((m) => ({
    default: m.MarkdownRenderer,
  }))
);
const JsonOutput = React.lazy(() =>
  import("../outputs/JsonOutput.js").then((m) => ({ default: m.JsonOutput }))
);
const AiToolCallOutput = React.lazy(() =>
  import("../outputs/AiToolCallOutput.js").then((m) => ({
    default: m.AiToolCallOutput,
  }))
);
const AiToolResultOutput = React.lazy(() =>
  import("../outputs/AiToolResultOutput.js").then((m) => ({
    default: m.AiToolResultOutput,
  }))
);
const HtmlOutput = React.lazy(() =>
  import("../outputs/HtmlOutput.js").then((m) => ({ default: m.HtmlOutput }))
);
const ImageOutput = React.lazy(() =>
  import("../outputs/ImageOutput.js").then((m) => ({ default: m.ImageOutput }))
);
const SvgOutput = React.lazy(() =>
  import("../outputs/SvgOutput.js").then((m) => ({ default: m.SvgOutput }))
);
const PlainTextOutput = React.lazy(() =>
  import("../outputs/PlainTextOutput.js").then((m) => ({
    default: m.PlainTextOutput,
  }))
);

interface RichOutputProps {
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  outputType?: "display_data" | "execute_result" | "stream" | "error";
}

export const RichOutput: React.FC<RichOutputProps> = ({
  data,
  outputType = "display_data",
}) => {
  // Handle stream outputs specially
  if (outputType === "stream") {
    const streamData = data as unknown as StreamOutputData;
    return (
      <AnsiStreamOutput text={streamData.text} streamName={streamData.name} />
    );
  }

  // Handle new unified output system - data now contains representations
  let outputData: OutputData;

  // Check if data is in new MediaRepresentation format (representations object)
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const representations = data as Record<string, any>;

    // Check if this looks like representations (has MediaRepresentation structure)
    const hasRepresentations = Object.values(representations).some(
      (value: any) =>
        value &&
        typeof value === "object" &&
        (value.type === "inline" || value.type === "artifact")
    );

    if (hasRepresentations) {
      // Convert from representations to legacy format for rendering
      outputData = {};
      for (const [mimeType, representation] of Object.entries(
        representations
      )) {
        if (
          representation &&
          typeof representation === "object" &&
          representation.data !== undefined
        ) {
          outputData[mimeType] = representation.data;
        }
      }
    } else {
      // Legacy format - data is direct MIME type mapping
      outputData = data as OutputData;
    }
  } else {
    outputData = data as OutputData;
  }

  // Determine the best media type to render, in order of preference
  const getPreferredMediaType = (): string | null => {
    const preferenceOrder = [
      "application/vnd.anode.aitool+json",
      "application/vnd.anode.aitool.result+json",
      "text/markdown",
      "text/html",
      "image/png",
      "image/jpeg",
      "image/svg+xml",
      "image/svg",
      "application/json",
      "text/plain",
    ];

    for (const mediaType of preferenceOrder) {
      if (
        outputData[mediaType] !== undefined &&
        outputData[mediaType] !== null
      ) {
        return mediaType;
      }
    }

    return null;
  };

  const mediaType = getPreferredMediaType();

  if (!mediaType) {
    return (
      <div className="bg-gray-50/50 p-3 text-sm text-gray-500 italic">
        No displayable content
      </div>
    );
  }

  const renderContent = () => {
    const LoadingSpinner = () => (
      <div className="flex items-center justify-center p-4">
        <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-gray-900"></div>
      </div>
    );

    switch (mediaType) {
      case "application/vnd.anode.aitool+json":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AiToolCallOutput
              toolData={outputData[mediaType] as ToolCallData}
            />
          </Suspense>
        );

      case "application/vnd.anode.aitool.result+json":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AiToolResultOutput
              resultData={outputData[mediaType] as ToolResultData}
            />
          </Suspense>
        );

      case "text/markdown":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <MarkdownRenderer
              content={String(outputData[mediaType] || "")}
              enableCopyCode={true}
            />
          </Suspense>
        );

      case "text/html":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <HtmlOutput content={String(outputData[mediaType] || "")} />
          </Suspense>
        );

      case "image/png":
      case "image/jpeg":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ImageOutput
              src={String(outputData[mediaType] || "")}
              mediaType={mediaType as "image/png" | "image/jpeg"}
            />
          </Suspense>
        );

      case "image/svg+xml":
      case "image/svg":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <SvgOutput content={String(outputData[mediaType] || "")} />
          </Suspense>
        );

      case "application/json":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <JsonOutput data={outputData[mediaType]} />
          </Suspense>
        );

      case "text/plain":
      default:
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <PlainTextOutput content={String(outputData[mediaType] || "")} />
          </Suspense>
        );
    }
  };

  return (
    <div className="rich-output">
      <div className="max-w-full overflow-hidden">{renderContent()}</div>
    </div>
  );
};

// Helper function to create rich output data
export const createRichOutput = (
  content: string,
  mediaType: string = "text/plain"
) => {
  return {
    [mediaType]: content,
  };
};

// Helper function to create markdown output
export const createMarkdownOutput = (markdown: string) => {
  return createRichOutput(markdown, "text/markdown");
};

// Helper function to create SVG output
export const createSvgOutput = (svg: string) => {
  return createRichOutput(svg, "image/svg+xml");
};
