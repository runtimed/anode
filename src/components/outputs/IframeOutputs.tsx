import { groupConsecutiveStreamOutputs } from "@/util/output-grouping";
import { OutputData } from "@runt/schema";
import { IframeOutput2 } from "./IframeOutput2";

export const IframeOutputs = ({
  outputs,
  groupConsecutiveStreams,
  enableErrorOutput,
}: {
  outputs: OutputData[];
  groupConsecutiveStreams: boolean;
  enableErrorOutput: boolean;
}) => {
  // Apply grouping strategy based on cell type
  const processedOutputs = groupConsecutiveStreams
    ? groupConsecutiveStreamOutputs(
        outputs.sort((a: OutputData, b: OutputData) => a.position - b.position)
      )
    : outputs.sort((a: OutputData, b: OutputData) => a.position - b.position);

  return (
    <div>
      {/* IframeOutputs: {processedOutputs.length} */}
      {/* <ReactJsonView src={processedOutputs} collapsed={1} /> */}
      <IframeOutput2 outputs={processedOutputs} isReact />
      {/* {processedOutputs.map((output: OutputData, index: number) => (
        <div
          key={output.id}
          className={index > 0 ? "border-border/30 mt-2 border-t pt-2" : ""}
        >
          <SingleOutput
            output={output}
            enableErrorOutput={enableErrorOutput}
            mobileStyle={mobileStyle}
          />
        </div>
      ))} */}
    </div>
  );
};
