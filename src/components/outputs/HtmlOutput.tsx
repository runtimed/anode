import React from "react";
import IframeOutput from "./IframeOutput";

interface HtmlOutputProps {
  content: string;
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
  onHeightChange?: (height: number) => void;
}

export const HtmlOutput: React.FC<HtmlOutputProps> = ({
  content,
  className = "max-w-none dataframe-container",
  style,
  onHeightChange,
}) => {
  return (
    <IframeOutput
      className={`${className} fade-in`}
      content={String(content || "")}
      style={
        {
          // Clean styles for pandas DataFrames
          "--dataframe-border": "1px solid #e5e7eb",
          "--dataframe-bg": "#fff",
          "--dataframe-header-bg": "#f9fafb",
          "--dataframe-hover-bg": "#f3f4f6",
          ...style,
        } as React.CSSProperties
      }
      onHeightChange={onHeightChange}
    />
  );
};

export default HtmlOutput;
