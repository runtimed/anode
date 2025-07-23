import React from "react";
import IframeOutput from "./IframeOutput";

interface HtmlOutputProps {
  content: string;
  className?: string;
}

export const HtmlOutput: React.FC<HtmlOutputProps> = ({
  content,
  className = "max-w-none dataframe-container",
}) => {
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
