import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { StreamOutputData } from "@runt/schema";
import { ChevronDown, Edit, FilePlus, Info, X, ZoomIn } from "lucide-react";
import { AnsiStreamOutput } from "./AnsiOutput.js";
import "./RichOutput.css";

interface RichOutputProps {
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  outputType?: "display_data" | "execute_result" | "stream" | "error";
}

interface OutputData {
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

interface ToolCallData {
  tool_call_id: string;
  tool_name: string;
  arguments: Record<string, any>;
  status: "success" | "error";
  timestamp: string;
  execution_time_ms?: number;
}

// Tool icon and action mapping for AI tools
const getToolConfig = (toolName: string, status: "success" | "error") => {
  const toolConfigs: Record<
    string,
    {
      icon: React.ComponentType<any>;
      verb: string;
      pastVerb: string;
      label: string;
    }
  > = {
    create_cell: {
      icon: FilePlus,
      verb: "Creating",
      pastVerb: "Created",
      label: "cell",
    },
    modify_cell: {
      icon: Edit,
      verb: "Modifying",
      pastVerb: "Modified",
      label: "cell",
    },
  };

  const config = toolConfigs[toolName] || {
    icon: Info,
    verb: "Executing",
    pastVerb: "Executed",
    label: "tool",
  };

  return {
    ...config,
    displayVerb: status === "success" ? config.pastVerb : config.verb,
  };
};

export const RichOutput: React.FC<RichOutputProps> = ({
  data,
  outputType = "display_data",
}) => {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
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

  // Image zoom modal
  const ZoomModal = ({
    src,
    onClose,
  }: {
    src: string;
    onClose: () => void;
  }) => (
    <div
      className="zoom-modal fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div className="relative max-w-full max-h-full">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70"
        >
          <X className="h-4 w-4" />
        </button>
        <img
          src={src}
          alt="Zoomed view"
          className="max-w-full max-h-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );

  const renderContent = () => {
    switch (mediaType) {
      case "application/vnd.anode.aitool+json":
        const toolData = outputData[mediaType] as ToolCallData;
        const isSuccess = toolData.status === "success";
        const toolConfig = getToolConfig(toolData.tool_name, toolData.status);
        const ToolIcon = toolConfig.icon;

        return (
          <div className="py-2">
            {Object.keys(toolData.arguments).length > 0
              ? (
                <details className="group">
                  <summary className="cursor-pointer flex items-center gap-2 text-sm hover:bg-muted/20 -m-1 p-1 rounded">
                    <ToolIcon
                      className={`h-4 w-4 ${
                        isSuccess ? "text-green-500" : "text-red-500"
                      }`}
                    />
                    <span className="text-muted-foreground flex-1">
                      {toolConfig.displayVerb} {toolConfig.label}
                    </span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="mt-2 ml-6 p-3 bg-card/30 rounded border border-border/50 text-xs">
                    <div className="text-muted-foreground mb-2">
                      {new Date(toolData.timestamp).toLocaleTimeString()}
                    </div>
                    <SyntaxHighlighter
                      language="json"
                      style={oneLight}
                      customStyle={{
                        margin: 0,
                        background: "transparent",
                        fontSize: "0.75rem",
                      }}
                    >
                      {JSON.stringify(toolData.arguments, null, 2)}
                    </SyntaxHighlighter>
                  </div>
                </details>
              )
              : (
                <div className="flex items-center gap-2 text-sm">
                  <ToolIcon
                    className={`h-4 w-4 ${
                      isSuccess ? "text-green-500" : "text-red-500"
                    }`}
                  />
                  <span className="text-muted-foreground">
                    {toolConfig.displayVerb} {toolConfig.label}
                  </span>
                </div>
              )}
          </div>
        );

      case "text/markdown":
        return (
          <div className="prose prose-sm max-w-none prose-gray [&_pre]:!bg-gray-50 [&_code]:!text-gray-800">
            <ReactMarkdown
              components={{
                code({ node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const language = match ? match[1] : "";
                  const inline = !className;

                  return !inline && language
                    ? (
                      <SyntaxHighlighter
                        style={oneLight}
                        language={language}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          background: "#f9fafb",
                          borderRadius: "0.375rem",
                          padding: "0.75rem",
                          fontSize: "0.875rem",
                          color: "#374151",
                          overflow: "auto",
                        }}
                        codeTagProps={{
                          style: {
                            color: "#374151",
                            background: "transparent",
                          },
                        }}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    )
                    : (
                      <code
                        className={`${className} bg-gray-100 px-1 py-0.5 rounded text-sm text-gray-800`}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                },
              }}
            >
              {String(outputData[mediaType] || "")}
            </ReactMarkdown>
          </div>
        );

      case "text/html":
        return (
          <div
            className="max-w-none dataframe-container"
            dangerouslySetInnerHTML={{ __html: outputData[mediaType] || "" }}
            style={{
              // Clean styles for pandas DataFrames
              "--dataframe-border": "1px solid #e5e7eb",
              "--dataframe-bg": "#fff",
              "--dataframe-header-bg": "#f9fafb",
              "--dataframe-hover-bg": "#f3f4f6",
            } as React.CSSProperties}
          />
        );

      case "image/png":
      case "image/jpeg":
        const imageData = outputData[mediaType] as string;
        const imageSrc = imageData.startsWith("data:")
          ? imageData
          : `data:${mediaType};base64,${imageData}`;

        return (
          <div className="py-2">
            <div className="relative group max-w-full">
              <img
                src={imageSrc}
                alt="Output image"
                className="zoomable-image max-w-full h-auto cursor-zoom-in hover:opacity-90 transition-opacity"
                style={{ maxHeight: "400px", objectFit: "contain" }}
                onClick={() => setZoomedImage(imageSrc)}
              />
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 text-white rounded p-1">
                <ZoomIn className="h-3 w-3" />
              </div>
            </div>
          </div>
        );

      case "image/svg+xml":
      case "image/svg":
        return (
          <div className="py-2">
            <div
              className="max-w-full overflow-hidden"
              style={{ maxHeight: "400px" }}
              dangerouslySetInnerHTML={{ __html: outputData[mediaType] || "" }}
            />
          </div>
        );

      case "application/json":
        return (
          <div className="bg-gray-50/50 rounded p-2">
            <SyntaxHighlighter
              language="json"
              style={oneLight}
              customStyle={{
                margin: 0,
                background: "transparent",
                fontSize: "0.875rem",
              }}
            >
              {JSON.stringify(outputData[mediaType], null, 2)}
            </SyntaxHighlighter>
          </div>
        );

      case "text/plain":
      default:
        return (
          <div className="font-mono text-sm whitespace-pre-wrap leading-relaxed text-gray-700">
            {String(outputData[mediaType] || "")}
          </div>
        );
    }
  };

  return (
    <div className="rich-output">
      {/* Content */}
      <div className="overflow-hidden max-w-full">{renderContent()}</div>

      {/* Zoom Modal */}
      {zoomedImage && (
        <ZoomModal
          src={zoomedImage}
          onClose={() => setZoomedImage(null)}
        />
      )}
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
