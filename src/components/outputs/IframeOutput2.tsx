import { OutputData } from "@/schema";
import React from "react";
import { useIframeCommsParent } from "./shared-with-iframe/comms";

interface IframeOutputProps {
  outputs: OutputData[];
  style?: React.CSSProperties;
  className?: string;
  onHeightChange?: (height: number) => void;
  isReact?: boolean;
  defaultHeight?: string;
}

export const IframeOutput2: React.FC<IframeOutputProps> = ({
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

export default IframeOutput2;
