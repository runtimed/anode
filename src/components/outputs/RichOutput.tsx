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
  OutputData,
} from "@/schema";
import { outputDeltasQuery, getFinalContent } from "@/queries/outputDeltas";
import { useQuery } from "@livestore/react";
import { AnsiErrorOutput } from "@/components/outputs/shared-with-iframe/AnsiOutput";

// Dynamic imports for heavy components
const MarkdownRenderer = React.lazy(() =>
  import("@/components/outputs/shared-with-iframe/MarkdownRenderer").then(
    (m) => ({
    default: m.MarkdownRenderer,
    })
  )
);
const JsonOutput = React.lazy(() =>
  import("@/components/outputs/shared-with-iframe/JsonOutput").then((m) => ({
    default: m.JsonOutput,
  }))
);
const AiToolCallOutput = React.lazy(() =>
  import("@/components/outputs/AiToolCallOutput").then((m) => ({
    default: m.AiToolCallOutput,
  }))
);
const AiToolResultOutput = React.lazy(() =>
  import("@/components/outputs/AiToolResultOutput").then((m) => ({
    default: m.AiToolResultOutput,
  }))
);
const HtmlOutput = React.lazy(() =>
  import("@/components/outputs/shared-with-iframe/HtmlOutput").then((m) => ({
    default: m.HtmlOutput,
  }))
);
const ImageOutput = React.lazy(() =>
  import("@/components/outputs/shared-with-iframe/ImageOutput").then((m) => ({
    default: m.ImageOutput,
  }))
);
const SvgOutput = React.lazy(() =>
  import("@/components/outputs/shared-with-iframe/SvgOutput").then((m) => ({
    default: m.SvgOutput,
  }))
);
const PlainTextOutput = React.lazy(() =>
  import("@/components/outputs/shared-with-iframe/PlainTextOutput").then(
    (m) => ({
    default: m.PlainTextOutput,
    })
  )
);

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-gray-900"></div>
  </div>
);

/**
 * Process multimedia data and convert it to a format suitable for rendering
 */
const processMultimediaData = (
  data: string | Record<string, MediaContainer> | null
): Record<string, unknown> => {
  // Check if data contains media containers (new format)
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const potentialContainers = data as Record<string, MediaContainer>;

    // Check if this looks like media containers
    const hasContainers = Object.values(potentialContainers).some(
      (value: any) => isInlineContainer(value) || isArtifactContainer(value)
    );

    if (hasContainers) {
      // Convert from media containers to rendering format
      const outputData: Record<string, unknown> = {};
      for (const [mimeType, container] of Object.entries(potentialContainers)) {
        if (isInlineContainer(container)) {
          outputData[mimeType] = container.data;
        } else if (isArtifactContainer(container)) {
          // Generate proper artifact URL for loading
          outputData[mimeType] = `/api/artifacts/${container.artifactId}`;
        }
      }
      return outputData;
    } else {
      // Direct data format (legacy support)
      return potentialContainers as Record<string, unknown>;
    }
  } else {
    // Fallback for simple data
    return { "text/plain": String(data || "") };
  }
};

// Determine the best media type to render, in order of preference
const getPreferredMediaType = (
  outputData: Record<string, unknown>
): string | null => {
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
    if (outputData[mediaType] !== undefined && outputData[mediaType] !== null) {
      return mediaType;
    }
  }

  return null;
};

function MarkdownOutput({
  data,
  outputId,
}: {
  data: string | null;
  outputId: string;
}) {
  // Always query deltas (even if not used)
  const deltas = useQuery(outputDeltasQuery(outputId));

  const markdownData = typeof data === "string" ? data : String(data || "");

  // Apply deltas if we have an outputId
  const { content: finalContent } = outputId
    ? getFinalContent(markdownData, deltas)
    : { content: markdownData };

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MarkdownRenderer content={finalContent} enableCopyCode={true} />
    </Suspense>
  );
}

export const RichOutput: React.FC<{
  output: OutputData & {
    outputType:
      | "multimedia_display"
      | "multimedia_result"
      | "markdown"
      | "error";
  };
}> = ({ output }) => {
  const { data, outputType, id: outputId } = output;

  // Handle markdown outputs specially with delta support
  if (outputType === "markdown") {
    return <MarkdownOutput data={data} outputId={outputId} />;
  }

  const data2 = (output.representations as Record<string, MediaContainer>) || {
    "text/plain": output.data || "",
  };

  // Handle error outputs specially
  if (outputType === "error") {
    let errorData;
    try {
      errorData = typeof data === "string" ? JSON.parse(data) : data;
    } catch {
      errorData = { ename: "Error", evalue: String(data), traceback: [] };
    }
    if (!errorData) {
      try {
        errorData = typeof data2 === "string" ? JSON.parse(data2) : data2;
      } catch {
        errorData = { ename: "Error", evalue: String(data2), traceback: [] };
      }
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
  const outputData = processMultimediaData(data2);
  const mediaType = getPreferredMediaType(outputData);

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
