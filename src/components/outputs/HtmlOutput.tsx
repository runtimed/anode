import React from "react";

interface HtmlOutputProps {
  content: string;
  className?: string;
}

export const HtmlOutput: React.FC<HtmlOutputProps> = ({
  content,
  className = "max-w-none dataframe-container",
}) => {
  return (
    // TODO: if not in an iframe, we should create one
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: String(content || "") }}
    />
  );
};

export default HtmlOutput;
