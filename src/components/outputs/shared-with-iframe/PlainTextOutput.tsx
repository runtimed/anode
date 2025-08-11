import React from "react";

interface PlainTextOutputProps {
  content: string;
  className?: string;
}

export const PlainTextOutput: React.FC<PlainTextOutputProps> = ({
  content,
  className = "font-mono text-sm whitespace-pre-wrap leading-relaxed text-gray-700",
}) => {
  // TODO: added stuff for testing
  return <div className={className}>{content}</div>;
};

export default PlainTextOutput;
