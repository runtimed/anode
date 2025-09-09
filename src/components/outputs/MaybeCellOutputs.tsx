import { cn } from "@/lib/utils";
import { outputsDeltasQuery, processDeltas } from "@/queries/outputDeltas";
import { OutputData, SAFE_MIME_TYPES } from "@/schema";
import { groupConsecutiveStreamOutputs } from "@/util/output-grouping";
import { useQuery } from "@livestore/react";
import { useMemo, useState } from "react";
import { useIframeCommsParent } from "./shared-with-iframe/comms";
import { SingleOutput } from "./shared-with-iframe/SingleOutput";
import { useDebounce } from "react-use";
import { OutputsContainer } from "./shared-with-iframe/OutputsContainer";
import { SuspenseSpinner } from "./shared-with-iframe/SuspenseSpinner";

/**
 * TODO: consider renaming this component
 * By default, we want to be ready to render the outputs
 */
export const MaybeCellOutputs = ({
  outputs,
  shouldAlwaysUseIframe = false,
  isLoading,
  showOutput,
}: {
  outputs: readonly OutputData[];
  shouldAlwaysUseIframe?: boolean;
  isLoading: boolean;
  showOutput: boolean;
}) => {
  const outputDeltas = useQuery(
    outputsDeltasQuery(outputs.map((output) => output.id))
  );

  // Apply grouping strategy based on cell type
  const processedOutputs = useMemo(() => {
    const grouped = groupConsecutiveStreamOutputs(outputs);
    return processDeltas(grouped, outputDeltas);
  }, [outputs, outputDeltas]);

  const isUnsafe = hasUnsafeOutputs(processedOutputs ?? []);

  // Always assume we'll be rendering in an iframe if there are no outputs
  const shouldUseIframe = shouldAlwaysUseIframe || isUnsafe || !outputs.length;

  return (
    <div
      className={cn(
        "cell-content bg-background max-w-full min-w-0 overflow-x-auto px-2 sm:px-4",
        showOutput ? "block" : "hidden"
      )}
    >
      {/* When loading and has stale outputs, we fade it out */}
      <div
        className={cn(
          outputs.length ? "transition-opacity duration-300" : "",
          isLoading && outputs.length ? "opacity-50" : "opacity-100"
        )}
      >
        {/* TODO: consider rendering an empty iframewhen we have a safe output currently rendered but cell input has changed */}
        {shouldUseIframe ? (
          <IframeOutput
            outputs={processedOutputs}
            className="transition-[height] duration-150 ease-out"
            isReact
          />
        ) : (
          <SuspenseSpinner>
            <OutputsContainer>
              {processedOutputs.map((output: OutputData) => (
                <SingleOutput key={output.id} output={output} />
              ))}
            </OutputsContainer>
          </SuspenseSpinner>
        )}
      </div>
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
  useDebounce(() => setDebouncedIframeHeight(iframeHeight), 50, [iframeHeight]);

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
