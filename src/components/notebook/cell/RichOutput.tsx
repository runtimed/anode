import React, { Suspense } from "react";

import {
  MediaContainer,
  isInlineContainer,
  isArtifactContainer,
  isAiToolCallData,
  isAiToolResultData,
  AI_TOOL_CALL_MIME_TYPE,
  AI_TOOL_RESULT_MIME_TYPE,
  TEXT_MIME_TYPES,
  APPLICATION_MIME_TYPES,
  IMAGE_MIME_TYPES,
  JUPYTER_MIME_TYPES,
} from "@runt/schema";
import { AnsiStreamOutput } from "../../outputs/index.js";
import { AnsiErrorOutput } from "./AnsiOutput.js";
import "../outputs/outputs.css";

// Dynamic imports for heavy components
const MarkdownRenderer = React.lazy(() =>
  import("../../outputs/MarkdownRenderer.js").then((m) => ({
    default: m.MarkdownRenderer,
  }))
);
const JsonOutput = React.lazy(() =>
  import("../../outputs/JsonOutput.js").then((m) => ({ default: m.JsonOutput }))
);
const AiToolCallOutput = React.lazy(() =>
  import("../../outputs/AiToolCallOutput.js").then((m) => ({
    default: m.AiToolCallOutput,
  }))
);
const AiToolResultOutput = React.lazy(() =>
  import("../../outputs/AiToolResultOutput.js").then((m) => ({
    default: m.AiToolResultOutput,
  }))
);
const HtmlOutput = React.lazy(() =>
  import("../../outputs/HtmlOutput.js").then((m) => ({ default: m.HtmlOutput }))
);
const ImageOutput = React.lazy(() =>
  import("../../outputs/ImageOutput.js").then((m) => ({
    default: m.ImageOutput,
  }))
);
const SvgOutput = React.lazy(() =>
  import("../../outputs/SvgOutput.js").then((m) => ({ default: m.SvgOutput }))
);
const PlainTextOutput = React.lazy(() =>
  import("../../outputs/PlainTextOutput.js").then((m) => ({
    default: m.PlainTextOutput,
  }))
);

interface RichOutputProps {
  data: string | Record<string, MediaContainer>;
  metadata?: Record<string, unknown>;
  outputType?:
    | "multimedia_display"
    | "multimedia_result"
    | "terminal"
    | "markdown"
    | "error";
}

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-gray-900"></div>
  </div>
);

export const RichOutput: React.FC<RichOutputProps> = ({
  data,

  outputType = "multimedia_display",
}) => {
  // Handle terminal outputs specially
  if (outputType === "terminal") {
    const textData = typeof data === "string" ? data : String(data || "");
    return <AnsiStreamOutput text={textData} streamName="stdout" />;
  }

  // Handle markdown outputs specially
  if (outputType === "markdown") {
    const markdownData = typeof data === "string" ? data : String(data || "");
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <MarkdownRenderer content={markdownData} enableCopyCode={true} />
      </Suspense>
    );
  }

  // Handle error outputs specially
  if (outputType === "error") {
    let errorData;
    try {
      errorData = typeof data === "string" ? JSON.parse(data) : data;
    } catch {
      errorData = { ename: "Error", evalue: String(data), traceback: [] };
    }
    return (
      <AnsiErrorOutput
        ename={errorData.ename}
        evalue={errorData.evalue}
        traceback={errorData.traceback}
      />
    );
  }

  // Handle multimedia outputs (multimedia_display, multimedia_result)
  let outputData: Record<string, unknown> = {};

  // Check if data contains media containers (new format)
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const potentialContainers = data as Record<string, MediaContainer>;

    // Check if this looks like media containers
    const hasContainers = Object.values(potentialContainers).some(
      (value: any) => isInlineContainer(value) || isArtifactContainer(value)
    );

    if (hasContainers) {
      // Convert from media containers to rendering format
      for (const [mimeType, container] of Object.entries(potentialContainers)) {
        if (isInlineContainer(container)) {
          outputData[mimeType] = container.data;
        } else if (isArtifactContainer(container)) {
          // For artifacts, we'll need to handle them differently
          // For now, just mark as artifact reference
          outputData[mimeType] = `[Artifact: ${container.artifactId}]`;
        }
      }
    } else {
      // Direct data format (legacy support)
      outputData = potentialContainers as Record<string, unknown>;
    }
  } else {
    // Fallback for simple data
    outputData = { "text/plain": String(data || "") };
  }

  // Determine the best media type to render, in order of preference
  const getPreferredMediaType = (): string | null => {
    const preferenceOrder = [
      AI_TOOL_CALL_MIME_TYPE,
      AI_TOOL_RESULT_MIME_TYPE,
      // Jupyter rich formats (plots, widgets, etc.)
      ...JUPYTER_MIME_TYPES,
      // Text formats
      TEXT_MIME_TYPES[2], // text/markdown
      TEXT_MIME_TYPES[1], // text/html
      // Images
      IMAGE_MIME_TYPES[0], // image/png
      IMAGE_MIME_TYPES[1], // image/jpeg
      IMAGE_MIME_TYPES[2], // image/svg+xml
      "image/svg", // legacy SVG format
      // Application formats
      APPLICATION_MIME_TYPES[0], // application/json
      TEXT_MIME_TYPES[0], // text/plain
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
    switch (mediaType) {
      case AI_TOOL_CALL_MIME_TYPE: {
        const toolData = outputData[mediaType];
        if (isAiToolCallData(toolData)) {
          return (
            <Suspense fallback={<LoadingSpinner />}>
              <AiToolCallOutput toolData={toolData} />
            </Suspense>
          );
        }
        return <div className="text-red-500">Invalid tool call data</div>;
      }

      case AI_TOOL_RESULT_MIME_TYPE: {
        const resultData = outputData[mediaType];
        if (isAiToolResultData(resultData)) {
          return (
            <Suspense fallback={<LoadingSpinner />}>
              <AiToolResultOutput resultData={resultData} />
            </Suspense>
          );
        }
        return <div className="text-red-500">Invalid tool result data</div>;
      }

      case TEXT_MIME_TYPES[2]: // text/markdown
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <MarkdownRenderer
              content={String(outputData[mediaType] || "")}
              enableCopyCode={true}
            />
          </Suspense>
        );

      case TEXT_MIME_TYPES[1]: // text/html
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <HtmlOutput content={String(outputData[mediaType] || "")} />
          </Suspense>
        );

      case IMAGE_MIME_TYPES[0]: // image/png
      case IMAGE_MIME_TYPES[1]: // image/jpeg
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ImageOutput
              src={String(outputData[mediaType] || "")}
              mediaType={mediaType as "image/png" | "image/jpeg"}
            />
          </Suspense>
        );

      case IMAGE_MIME_TYPES[2]: // image/svg+xml
      case "image/svg": // legacy SVG format
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <SvgOutput content={String(outputData[mediaType] || "")} />
          </Suspense>
        );

      case "application/vnd.plotly.v1+json":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <JsonOutput data={outputData[mediaType]} />
          </Suspense>
        );

      case "application/vnd.vegalite.v2+json":
      case "application/vnd.vegalite.v3+json":
      case "application/vnd.vegalite.v4+json":
      case "application/vnd.vegalite.v5+json":
      case "application/vnd.vegalite.v6+json":
      case "application/vnd.vega.v3+json":
      case "application/vnd.vega.v4+json":
      case "application/vnd.vega.v5+json":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <JsonOutput data={outputData[mediaType]} />
          </Suspense>
        );

      case "application/geo+json":
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <JsonOutput data={outputData[mediaType]} />
          </Suspense>
        );

      case APPLICATION_MIME_TYPES[0]: // application/json
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <JsonOutput data={outputData[mediaType]} />
          </Suspense>
        );

      case TEXT_MIME_TYPES[0]: // text/plain
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
