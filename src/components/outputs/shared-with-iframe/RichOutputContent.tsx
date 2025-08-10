import React from "react";

import {
  APPLICATION_MIME_TYPES,
  IMAGE_MIME_TYPES,
  TEXT_MIME_TYPES,
  AI_TOOL_CALL_MIME_TYPE,
  AI_TOOL_RESULT_MIME_TYPE,
  isAiToolCallData,
  isAiToolResultData,
} from "@/schema";
import { SuspenseSpinner } from "./SuspenseSpinner";

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

// Dynamic imports for AI outputs
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

export function RichOutputContent({
  mediaType,
  outputData,
}: {
  mediaType: string;
  outputData: Record<string, unknown>;
}) {
  switch (mediaType) {
    case AI_TOOL_CALL_MIME_TYPE: {
      const toolData = outputData[mediaType];
      if (isAiToolCallData(toolData)) {
        return (
          <SuspenseSpinner>
            <AiToolCallOutput toolData={toolData} />
          </SuspenseSpinner>
        );
      }
      return <div className="text-red-500">Invalid tool call data</div>;
    }

    case AI_TOOL_RESULT_MIME_TYPE: {
      const resultData = outputData[mediaType];
      if (isAiToolResultData(resultData)) {
        return (
          <SuspenseSpinner>
            <AiToolResultOutput resultData={resultData} />
          </SuspenseSpinner>
        );
      }
      return <div className="text-red-500">Invalid tool result data</div>;
    }

    case TEXT_MIME_TYPES[2]: // text/markdown
      return (
        <SuspenseSpinner>
          <MarkdownRenderer
            content={String(outputData[mediaType] || "")}
            enableCopyCode={true}
          />
        </SuspenseSpinner>
      );

    case TEXT_MIME_TYPES[1]: // text/html
      return (
        <SuspenseSpinner>
          <HtmlOutput content={String(outputData[mediaType] || "")} />
        </SuspenseSpinner>
      );

    case IMAGE_MIME_TYPES[0]: // image/png
    case IMAGE_MIME_TYPES[1]: // image/jpeg
      return (
        <SuspenseSpinner>
          <ImageOutput
            src={String(outputData[mediaType] || "")}
            mediaType={mediaType as "image/png" | "image/jpeg"}
          />
        </SuspenseSpinner>
      );

    case IMAGE_MIME_TYPES[2]: // image/svg+xml
    case "image/svg": // legacy SVG format
      return (
        <SuspenseSpinner>
          <SvgOutput content={String(outputData[mediaType] || "")} />
        </SuspenseSpinner>
      );

    case "application/vnd.plotly.v1+json":
      return (
        <SuspenseSpinner>
          <JsonOutput data={outputData[mediaType]} />
        </SuspenseSpinner>
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
        <SuspenseSpinner>
          <JsonOutput data={outputData[mediaType]} />
        </SuspenseSpinner>
      );

    case "application/geo+json":
      return (
        <SuspenseSpinner>
          <JsonOutput data={outputData[mediaType]} />
        </SuspenseSpinner>
      );

    case APPLICATION_MIME_TYPES[0]: // application/json
      return (
        <SuspenseSpinner>
          <JsonOutput data={outputData[mediaType]} />
        </SuspenseSpinner>
      );

    case TEXT_MIME_TYPES[0]: // text/plain
    default:
      return (
        <SuspenseSpinner>
          <PlainTextOutput content={String(outputData[mediaType] || "")} />
        </SuspenseSpinner>
      );
  }
}
