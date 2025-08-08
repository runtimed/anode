import { OutputData } from "@runt/schema";
import { AnsiStreamOutput } from "./shared-with-iframe/AnsiOutput";
import { RichOutput } from "./RichOutput";

export function SingleOutput({ output }: { output: OutputData }) {
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
  // Default styling
  // Can't do `output={output}` because TS gets confused, thinking `outputType` can be "terminal"
  return (
    <div className="max-w-full overflow-hidden py-2">
      <RichOutput output={{ ...output, outputType: output.outputType }} />
    </div>
  );
}
