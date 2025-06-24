import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

interface JsonOutputProps {
  data: unknown;
  compact?: boolean;
}

export const JsonOutput: React.FC<JsonOutputProps> = ({
  data,
  compact = false,
}) => {
  const jsonString = JSON.stringify(data, null, compact ? 0 : 2);

  return (
    <div className="bg-gray-50/50 rounded p-2">
      <SyntaxHighlighter
        language="json"
        style={oneLight}
        customStyle={{
          margin: 0,
          background: "transparent",
          fontSize: "0.875rem",
        }}
      >
        {jsonString}
      </SyntaxHighlighter>
    </div>
  );
};

export default JsonOutput;
