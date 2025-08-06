import { groupConsecutiveStreamOutputs } from "@/util/output-grouping";
import { OutputData } from "@runt/schema";
import { IframeOutput2 } from "./IframeOutput2";
import { useMemo } from "react";
import { SingleOutput } from "./SingleOutput";
import { Button } from "../ui/button";
import { useLocalStorage } from "react-use";

export const IframeOutputs = ({ outputs }: { outputs: OutputData[] }) => {
  const [shouldUseIframe, setShouldUseIframe] = useLocalStorage(
    "shouldUseIframe",
    true
  );

  // Apply grouping strategy based on cell type
  const processedOutputs = useMemo(
    () =>
      groupConsecutiveStreamOutputs(
        outputs.sort((a: OutputData, b: OutputData) => a.position - b.position)
      ),
    [outputs]
  );

  return (
    <div>
      <Button
        size="xs"
        variant="outline"
        onClick={() => setShouldUseIframe(!shouldUseIframe)}
      >
        {shouldUseIframe ? "Render directly" : "Use iframe"}
      </Button>
      {shouldUseIframe ? (
        <IframeOutput2 outputs={processedOutputs} isReact />
      ) : (
        processedOutputs.map((output: OutputData, index: number) => (
          <div
            key={output.id}
            className={index > 0 ? "border-border/30 mt-2 border-t pt-2" : ""}
          >
            <SingleOutput output={output} mobileStyle="default" />
          </div>
        ))
      )}
    </div>
  );
};
