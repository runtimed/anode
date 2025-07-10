import React, { useMemo, useCallback } from "react";
import { useStore } from "@livestore/react";
import { OutputData, tables } from "@runt/schema";
import { queryDb } from "@livestore/livestore";
import { groupConsecutiveStreamOutputs } from "../util/output-grouping.js";
import { RichOutput } from "../components/notebook/RichOutput.js";
import {
  AnsiErrorOutput,
  AnsiStreamOutput,
} from "../components/notebook/AnsiOutput.js";

interface UseCellOutputsOptions {
  cellId: string;
  groupConsecutiveStreams?: boolean;
  enableErrorOutput?: boolean;
  enableTerminalOutput?: boolean;
  mobileStyle?: "default" | "chat-bubble";
}

interface CellOutputsResult {
  outputs: OutputData[];
  hasOutputs: boolean;
  renderOutputs: () => React.ReactNode;
}

export const useCellOutputs = ({
  cellId,
  groupConsecutiveStreams = false,
  enableErrorOutput = true,
  enableTerminalOutput = true,
  mobileStyle = "default",
}: UseCellOutputsOptions): CellOutputsResult => {
  const { store } = useStore();

  // Create stable query using useMemo to prevent React Hook issues
  const outputsQuery = useMemo(
    () => queryDb(tables.outputs.select().where({ cellId })),
    [cellId]
  );
  const outputs = store.useQuery(outputsQuery) as OutputData[];

  const hasOutputs = useMemo(() => outputs.length > 0, [outputs.length]);

  const renderSingleOutput = useCallback(
    (output: OutputData) => {
      // Handle error outputs with AnsiErrorOutput
      if (output.outputType === "error" && enableErrorOutput) {
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
            ename={errorData?.ename}
            evalue={errorData?.evalue}
            traceback={errorData?.traceback || []}
          />
        );
      }

      // Handle terminal outputs with AnsiStreamOutput
      if (output.outputType === "terminal" && enableTerminalOutput) {
        return (
          <div className="max-w-full overflow-hidden py-2">
            <AnsiStreamOutput
              text={output.data || ""}
              streamName={
                (output.streamName as "stdout" | "stderr") || "stdout"
              }
            />
          </div>
        );
      }

      // Handle all other outputs with RichOutput
      const outputContent = (
        <RichOutput
          data={
            (output.outputType as string) === "markdown" ||
            (output.outputType as string) === "terminal"
              ? output.data || ""
              : output.representations || {
                  "text/plain": output.data || "",
                }
          }
          metadata={output.metadata as Record<string, unknown> | undefined}
          outputType={output.outputType}
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
        <div className="max-w-full overflow-hidden py-2">{outputContent}</div>
      );
    },
    [enableErrorOutput, enableTerminalOutput, mobileStyle]
  );

  const renderOutputs = useCallback(() => {
    if (!hasOutputs) return null;

    // Apply grouping strategy based on cell type
    const processedOutputs = groupConsecutiveStreams
      ? groupConsecutiveStreamOutputs(
          outputs.sort(
            (a: OutputData, b: OutputData) => a.position - b.position
          )
        )
      : outputs.sort((a: OutputData, b: OutputData) => a.position - b.position);

    return (
      <div className="outputs-container px-4 py-2">
        {processedOutputs.map((output: OutputData, index: number) => (
          <div
            key={output.id}
            className={index > 0 ? "border-border/30 mt-2 border-t pt-2" : ""}
          >
            {renderSingleOutput(output)}
          </div>
        ))}
      </div>
    );
  }, [hasOutputs, outputs, groupConsecutiveStreams, renderSingleOutput]);

  return {
    outputs,
    hasOutputs,
    renderOutputs,
  };
};
