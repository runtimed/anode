import { outputDeltasQuery, processDeltas } from "@/queries";
import { OutputData } from "@/schema";
import { groupConsecutiveStreamOutputs } from "@/util/output-grouping";
import { useQuery } from "@livestore/react";
import { useMemo } from "react";
import { SingleOutput } from "./SingleOutput";
import { useIframeCommsParent } from "./shared-with-iframe/comms";

export const MaybeCellOutputs = ({
  outputs,
  shouldUseIframe,
}: {
  outputs: OutputData[];
  shouldUseIframe: boolean;
}) => {
  const outputDeltas = useQuery(
    outputDeltasQuery(outputs.map((output) => output.id))
  );
  // TODO: collapse AI results?

  // Apply grouping strategy based on cell type
  const processedOutputs = useMemo(() => {
    // TODO: doesn't .sort mutate?
    const sorted = outputs.sort(
      (a: OutputData, b: OutputData) => a.position - b.position
    );
    const grouped = groupConsecutiveStreamOutputs(sorted);
    return processDeltas(grouped, outputDeltas);
  }, [outputs, outputDeltas]);

  if (!outputs.length) return null;

  return (
    <div className="outputs-container px-4 py-2">
      {shouldUseIframe ? (
        <IframeOutput outputs={processedOutputs} isReact />
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

interface IframeOutputProps {
  outputs: OutputData[];
  style?: React.CSSProperties;
  className?: string;
  onHeightChange?: (height: number) => void;
  isReact?: boolean;
  defaultHeight?: string;
}

export const IframeOutput: React.FC<IframeOutputProps> = ({
  outputs,
  className,
  style,
  isReact,
  onHeightChange,
  defaultHeight = "0px",
}) => {
  const { iframeRef, iframeHeight } = useIframeCommsParent({
    defaultHeight,
    onHeightChange,
    outputs,
  });

  return (
    <iframe
      src={
        import.meta.env.VITE_IFRAME_OUTPUT_URI + (isReact ? "/react.html" : "")
      }
      ref={iframeRef}
      className={className}
      width="100%"
      height={iframeHeight}
      style={style}
      sandbox="allow-scripts allow-same-origin"
    />
  );
};
