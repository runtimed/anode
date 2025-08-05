import { IframeOutputs } from "@/components/outputs/IframeOutputs.js";
import { OutputData, tables } from "@/schema";
import { queryDb } from "@livestore/livestore";
import { useQuery } from "@livestore/react";
import React, { useCallback, useMemo } from "react";

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
  MaybeOutputs: React.FC;
}

// TODO: extract components and have them consume the outputs of this
// If prop drilling is needed, use React context
export const useCellOutputs = ({
  cellId,
  groupConsecutiveStreams = false,
  enableErrorOutput = true,
  enableTerminalOutput = true,
  mobileStyle = "default",
}: UseCellOutputsOptions): CellOutputsResult => {
  // Create stable query using useMemo to prevent React Hook issues
  const outputsQuery = useMemo(
    () => queryDb(tables.outputs.select().where({ cellId })),
    [cellId]
  );
  const outputs = useQuery(outputsQuery) as OutputData[];

  const hasOutputs = useMemo(() => outputs.length > 0, [outputs.length]);

  // Note: this approach is not ideal, but it ensures that if this component throws, we can put an error boundary that works
  // Otherwise, just calling `<ErrorBoundary FallbackComponent={OutputsErrorBoundary}>renderOutputs()</ErrorBoundary>` will not work as expected
  const MaybeOutputs = useCallback(() => {
    if (!hasOutputs) return null;

    return (
      <div className="outputs-container px-4 py-2">
        <IframeOutputs
          outputs={outputs}
          groupConsecutiveStreams={groupConsecutiveStreams}
          enableErrorOutput={enableErrorOutput}
          enableTerminalOutput={enableTerminalOutput}
          mobileStyle={mobileStyle}
        />
      </div>
    );
  }, [
    hasOutputs,
    outputs,
    groupConsecutiveStreams,
    enableErrorOutput,
    enableTerminalOutput,
    mobileStyle,
  ]);

  return {
    outputs,
    hasOutputs,
    MaybeOutputs,
  };
};
