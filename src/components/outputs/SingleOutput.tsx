import { OutputData } from "@runt/schema";
import { AnsiStreamOutput } from "./AnsiOutput";
import { RichOutput } from "./RichOutput";
import ReactJsonView from "@microlink/react-json-view";

export function SingleOutput({
  output,
  mobileStyle,
}: {
  output: OutputData;
  mobileStyle: "default" | "chat-bubble";
}) {
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

  // Handle terminal outputs with AnsiStreamOutput
  if (output.outputType === "terminal") {
    return (
      <div className="max-w-full overflow-hidden py-2">
        <AnsiStreamOutput
          text={output.data || ""}
          streamName={(output.streamName as "stdout" | "stderr") || "stdout"}
        />
      </div>
    );
  }

  // Handle all other outputs with RichOutput
  const outputContent = (
    // Can't do `output={output}` because TS gets confused, thinking `outputType` can be "terminal"
    <RichOutput output={{ ...output, outputType: output.outputType }} />
  );

  // Apply mobile chat bubble style for AI cells
  if (mobileStyle === "chat-bubble") {
    return (
      <div className="max-w-full overflow-hidden py-2">
        <div className="max-w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-3 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
          {outputContent}
        </div>
      </div>
    );
  }

  // Default styling
  return <div className="max-w-full overflow-hidden py-2">{outputContent}</div>;
}
