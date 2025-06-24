import React from "react";
import { StreamOutputData } from "@runt/schema";
import {
  AiToolCallOutput,
  AnsiStreamOutput,
  HtmlOutput,
  ImageOutput,
  JsonOutput,
  MarkdownRenderer,
  OutputData,
  PlainTextOutput,
  SvgOutput,
  ToolCallData,
} from "../outputs/index.js";
import "../outputs/outputs.css";

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

  const outputData = data as OutputData;

  // Determine the best media type to render, in order of preference
  const getPreferredMediaType = (): string | null => {
    const preferenceOrder = [
      "application/vnd.anode.aitool+json",
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
      <div className="p-3 bg-gray-50/50 text-sm text-gray-500 italic">
        No displayable content
      </div>
    );
  }

  const renderContent = () => {
    switch (mediaType) {
      case "application/vnd.anode.aitool+json":
        return (
          <AiToolCallOutput
            toolData={outputData[mediaType] as ToolCallData}
          />
        );

      case "text/markdown":
        return (
          <MarkdownRenderer
            content={String(outputData[mediaType] || "")}
            enableCopyCode={true}
          />
        );

      case "text/html":
        return <HtmlOutput content={String(outputData[mediaType] || "")} />;

      case "image/png":
      case "image/jpeg":
        return (
          <ImageOutput
            src={String(outputData[mediaType] || "")}
            mediaType={mediaType as "image/png" | "image/jpeg"}
          />
        );

      case "image/svg+xml":
      case "image/svg":
        return <SvgOutput content={String(outputData[mediaType] || "")} />;

      case "application/json":
        return <JsonOutput data={outputData[mediaType]} />;

      case "text/plain":
      default:
        return (
          <PlainTextOutput
            content={String(outputData[mediaType] || "")}
          />
        );
    }
  };

  return (
    <div className="rich-output">
      <div className="overflow-hidden max-w-full">{renderContent()}</div>
    </div>
  );
};

// Helper function to create rich output data
export const createRichOutput = (
  content: string,
  mediaType: string = "text/plain",
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
