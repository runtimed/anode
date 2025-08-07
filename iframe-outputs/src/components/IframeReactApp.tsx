import { AnsiStreamOutput } from "@/components/outputs/AnsiOutput";
import { RichOutput } from "@/components/outputs/RichOutput";
import { OutputData } from "@/schema";
import ReactJsonView from "@microlink/react-json-view";
import React from "react";
import { useIframeCommsChild } from "@/components/outputs/shared-with-iframe/comms";

export const IframeReactApp: React.FC = () => {
  const { outputs } = useIframeCommsChild();

  if (outputs.length === 0) {
    return "No content yet";
  }

  // Default content or non-React mode
  return outputs.map((output, index) => (
    <div
      key={output.id}
      className={index > 0 ? "mt-2 border-t border-black/10 pt-2" : ""}
    >
      <Output output={output} />
    </div>
  ));
};

function Output({ output }: { output: OutputData }) {
  if (output.representations?.["application/json"]) {
    return (
      <ReactJsonView
        key={output.id}
        src={(output.representations["application/json"] as any).data}
        theme="rjv-default"
        collapsed={false}
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

  switch (output.outputType) {
    case "markdown":
    case "multimedia_display":
    case "multimedia_result":
    case "error":
      return (
        <RichOutput output={{ ...output, outputType: output.outputType }} />
      );
    case "terminal":
    default:
      return (
        <AnsiStreamOutput
          key={output.id}
          text={output.data ?? ""}
          streamName={output.streamName as "stdout" | "stderr"}
        />
      );
  }
}
