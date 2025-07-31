import React from "react";
import { useTimeout } from "react-use";
import IframeOutput from "./IframeOutput";

interface HtmlOutputProps {
  content: string;
  className?: string;
  delay?: number;
}

export const HtmlOutput: React.FC<HtmlOutputProps> = ({
  content,
  className = "max-w-none dataframe-container",
  delay = 0,
}) => {
  const [isReady] = useTimeout(delay);

  // Don't render the iframe immediately - wait for the timeout
  if (!isReady()) {
    return <div className={className}>Loading...</div>;
  }

  return (
    <IframeOutput
      className={className}
      content={String(content || "")}
      style={
        {
          // Clean styles for pandas DataFrames
          "--dataframe-border": "1px solid #e5e7eb",
          "--dataframe-bg": "#fff",
          "--dataframe-header-bg": "#f9fafb",
          "--dataframe-hover-bg": "#f3f4f6",
        } as React.CSSProperties
      }
    />
  );
};

export default HtmlOutput;
