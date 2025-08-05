import { OutputData } from "@runt/schema";
import { groupConsecutiveStreamOutputs } from "@/util/output-grouping";

export const IframeOutputs = ({
  outputs,
  groupConsecutiveStreams,
}: {
  outputs: OutputData[];
  groupConsecutiveStreams: boolean;
}) => {
  // Apply grouping strategy based on cell type
  const processedOutputs = groupConsecutiveStreams
    ? groupConsecutiveStreamOutputs(
        outputs.sort((a: OutputData, b: OutputData) => a.position - b.position)
      )
    : outputs.sort((a: OutputData, b: OutputData) => a.position - b.position);

  return <div>IframeOutputs: {outputs.length}</div>;
};
