import { groupConsecutiveStreamOutputs } from "@/util/output-grouping";
import { OutputData } from "@runt/schema";
import { IframeOutput2 } from "./IframeOutput2";
import ReactJsonView from "@microlink/react-json-view";

export const IframeOutputs = ({ outputs }: { outputs: OutputData[] }) => {
  // Apply grouping strategy based on cell type
  const processedOutputs = outputs.sort(
    (a: OutputData, b: OutputData) => a.position - b.position
  );

  return (
    <div>
      {/* IframeOutputs: {processedOutputs.length} */}
      <ReactJsonView src={processedOutputs} collapsed={1} />
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
