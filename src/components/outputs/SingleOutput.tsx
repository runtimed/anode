import { MediaContainer, OutputData } from "@runt/schema";
import { RichOutput } from "./RichOutput";
import { AnsiErrorOutput, AnsiStreamOutput } from "./AnsiOutput";

export function SingleOutput({
  output,
  enableErrorOutput,
  mobileStyle,
}: {
  output: OutputData;
  enableErrorOutput: boolean;
  mobileStyle: "default" | "chat-bubble";
}) {
  if (output.outputType === "error" && enableErrorOutput) {
    let errorData;
    try {
      errorData =
        typeof output.data === "string" ? JSON.parse(output.data) : output.data;
    } catch {
      errorData = {
        ename: "Error",
        evalue: String(output.data),
        traceback: [],
      };
    }
    return (
      <AnsiErrorOutput
        ename={errorData?.ename}
        evalue={errorData?.evalue}
        traceback={errorData?.traceback || []}
      />
    );
  }

  // Handle terminal outputs with AnsiStreamOutput
  if (output.outputType === "terminal") {
    return (
      <div className="max-w-full overflow-hidden py-2">
        ansi stream output
        <AnsiStreamOutput
          text={output.data || ""}
          streamName={(output.streamName as "stdout" | "stderr") || "stdout"}
        />
      </div>
    );
  }

  // Handle all other outputs with RichOutput
  const outputContent = (
    <RichOutput
      data={
        output.outputType === "markdown"
          ? output.data || ""
          : (output.representations as Record<string, MediaContainer>) || {
              "text/plain": output.data || "",
            }
      }
      metadata={output.metadata as Record<string, unknown> | undefined}
      outputType={output.outputType}
      outputId={output.id}
    />
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
  return (
    <div className="max-w-full overflow-hidden py-2">
      (default styling rich output){outputContent}
    </div>
  );
}
