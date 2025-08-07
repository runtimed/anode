import { groupConsecutiveStreamOutputs } from "@/util/output-grouping";
import { OutputData } from "@runt/schema";
import { useMemo } from "react";
import { IframeOutput2 } from "./IframeOutput2";
import { SingleOutput } from "./SingleOutput";

export const MaybeCellOutputs = ({
  outputs,
  shouldUseIframe,
}: {
  outputs: OutputData[];
  shouldUseIframe: boolean;
}) => {
  // TODO: look through all the outputs and see if any are HTML/SVG. If so, use an iframe.
  // TODO: collapse AI results?

  // Apply grouping strategy based on cell type
  const processedOutputs = useMemo(
    () =>
      groupConsecutiveStreamOutputs(
        outputs.sort((a: OutputData, b: OutputData) => a.position - b.position)
      ),
    [outputs]
  );

  if (!outputs.length) return null;

  return (
    <div className="outputs-container px-4 py-2">
      {shouldUseIframe ? (
        <IframeOutput2 outputs={processedOutputs} isReact />
      ) : (
        processedOutputs.map((output: OutputData, index: number) => (
          <div
            key={output.id}
            className={index > 0 ? "border-border/30 mt-2 border-t pt-2" : ""}
          >
            <SingleOutput output={output} />
          </div>
        ))
      )}
    </div>
  );
};
