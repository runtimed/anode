import { cn } from "@/lib/utils";
import { outputsDeltasQuery, processDeltas } from "@/queries/outputDeltas";
import { OutputData, SAFE_MIME_TYPES } from "@/schema";
import { groupConsecutiveStreamOutputs } from "@/util/output-grouping";
import { useQuery } from "@livestore/react";
import { useMemo, useState } from "react";
import { useDebounce } from "react-use";
import { SingleOutput } from "./shared-with-iframe/SingleOutput";
import { useIframeCommsParent } from "./shared-with-iframe/comms";

export const MaybeCellOutputs = ({
  outputs,
  shouldAlwaysUseIframe = false,
  isLoading,
}: {
  outputs: readonly OutputData[];
  shouldAlwaysUseIframe?: boolean;
  isLoading: boolean;
}) => {
  const outputDeltas = useQuery(
    outputsDeltasQuery(outputs.map((output) => output.id))
  );

  // Apply grouping strategy based on cell type
  const processedOutputs = useMemo(() => {
    const grouped = groupConsecutiveStreamOutputs(outputs);
    return processDeltas(grouped, outputDeltas);
  }, [outputs, outputDeltas]);

  if (!outputs.length) return null;

  const isUnsafe = hasUnsafeOutputs(processedOutputs ?? []);
  const shouldUseIframe = shouldAlwaysUseIframe || isUnsafe;

  return (
    <div
      className={cn(
        "outputs-container px-4 py-2 transition-opacity duration-300",
        isLoading ? "opacity-50" : "opacity-100"
      )}
    >
      {shouldUseIframe ? (
        <IframeOutput
          outputs={processedOutputs}
          isReact
          className="transition-[height] duration-300"
        />
      ) : (
        processedOutputs.map((output: OutputData) => (
          <SingleOutput key={output.id} output={output} />
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

  const [debouncedIframeHeight, setDebouncedIframeHeight] =
    useState(iframeHeight);

  // Iframe can get height updates pretty often, but we want to avoid layout jumping each time
  // TODO: ensure that it's a leading debounce!
  useDebounce(() => setDebouncedIframeHeight(iframeHeight), 200, [
    iframeHeight,
  ]);

  return (
    <iframe
      src={
        import.meta.env.VITE_IFRAME_OUTPUT_URI + (isReact ? "/react.html" : "")
      }
      ref={iframeRef}
      className={className}
      width="100%"
      height={debouncedIframeHeight}
      style={style}
      allow="accelerometer; autoplay; gyroscope; magnetometer; xr-spatial-tracking; clipboard-write"
      sandbox="allow-downloads allow-forms allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-modals"
    />
  );
};

const hasUnsafeOutputs = (outputs: OutputData[]) => {
  return outputs.some((output) => {
    return !SAFE_MIME_TYPES.includes(output.mimeType as any);
  });
};
