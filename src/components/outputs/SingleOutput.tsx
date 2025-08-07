import { OutputData } from "@runt/schema";
import { AnsiStreamOutput } from "./AnsiOutput";
import { RichOutput } from "./RichOutput";
import ReactJsonView from "@microlink/react-json-view";

export function SingleOutput({ output }: { output: OutputData }) {
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

  // Default styling
  return <div className="max-w-full overflow-hidden py-2">{outputContent}</div>;
}
