import React, { useEffect, useState } from "react";
import { OutputData } from "@/schema";
import ReactJsonView from "@microlink/react-json-view";
import {
  AnsiErrorOutput,
  AnsiStreamOutput,
} from "@/components/outputs/AnsiOutput";

interface IframeMessage {
  type: string;
  content?: string;
  height?: number;
  outputs?: OutputData[];
}

export const IframeReactApp: React.FC = () => {
  const [outputs, setOutputs] = useState<OutputData[]>([]);

  useEffect(() => {
    document.body.style.margin = "0";

    function sendHeight() {
      const height = document.body.scrollHeight;
      window.parent.postMessage(
        {
          type: "iframe-height",
          height: height,
        },
        "*"
      );
    }

    // Send height on load
    sendHeight();

    // Send height after a short delay to ensure content is rendered
    setTimeout(sendHeight, 100);

    // Send height when content changes (for dynamic content)
    const observer = new MutationObserver(sendHeight);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    // Also send height on resize
    window.addEventListener("resize", sendHeight);

    // Handle incoming content updates
    window.addEventListener("message", (event) => {
      const data: IframeMessage = event.data;
      if (data && data.type === "update-outputs") {
        console.log("update-outputs", data.outputs);
        setOutputs(data.outputs || []);
        setTimeout(sendHeight, 50);
      }
    });

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sendHeight);
    };
  }, []);

  // Default content or non-React mode
  return (
    <div className="dataframe-container border-2 border-amber-400">
      {outputs.length > 0
        ? outputs.map((output, index) => (
            <div
              key={output.id}
              className={index > 0 ? "mt-2 border-t border-black/10 pt-2" : ""}
            >
              <Output output={output} />
            </div>
          ))
        : "No content yet"}
    </div>
  );
};

function Output({ output }: { output: OutputData }) {
  switch (output.outputType) {
    case "terminal":
      return (
        <AnsiStreamOutput
          key={output.id}
          text={output.data ?? ""}
          streamName={output.streamName as "stdout" | "stderr"}
        />
      );
    case "multimedia_display":
      return (
        <div
          key={output.id}
          dangerouslySetInnerHTML={{ __html: output.data ?? "" }}
        />
      );
    case "error": {
      let errorData;
      try {
        errorData =
          typeof output.data === "string"
            ? JSON.parse(output.data)
            : output.data;
      } catch {
        errorData = {
          ename: "Error",
          evalue: String(output.data),
          traceback: [],
        };
      }
      return (
        <AnsiErrorOutput
          key={output.id}
          ename={errorData?.ename}
          evalue={errorData?.evalue}
          traceback={errorData?.traceback || []}
        />
      );
    }
    default:
      return (
        <ReactJsonView
          key={output.id}
          src={output}
          theme="rjv-default"
          collapsed={true}
          displayDataTypes={false}
          displayObjectSize={false}
          enableClipboard={true}
          indentWidth={2}
          iconStyle="triangle"
          style={{
            backgroundColor: "transparent",
            fontSize: "0.875rem",
          }}
        />
      );
  }
}
