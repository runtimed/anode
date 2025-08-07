import ReactJsonView from "@microlink/react-json-view";
import React from "react";

interface JsonOutputProps {
  data: unknown;
  compact?: boolean;
}

export const JsonOutput: React.FC<JsonOutputProps> = ({
  data,
  compact = false,
}) => {
  // Ensure data is an object for react-json-view
  const jsonData = data && typeof data === "object" ? data : { value: data };

  return (
    <div className="rounded bg-gray-50/50 p-2">
      <ReactJsonView
        src={jsonData}
        theme="rjv-default"
        collapsed={false}
        displayDataTypes={false}
        displayObjectSize={false}
        enableClipboard={true}
        indentWidth={2}
        iconStyle="triangle"
        style={{
          backgroundColor: "transparent",
          fontSize: "0.875rem",
        }}
      />
    </div>
  );
};

export default JsonOutput;
