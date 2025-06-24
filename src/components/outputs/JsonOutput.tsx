import React from "react";
import ReactJsonView from "@microlink/react-json-view";

interface JsonOutputProps {
  data: unknown;
  compact?: boolean;
}

export const JsonOutput: React.FC<JsonOutputProps> = ({
  data,
  compact = false,
}) => {
  return (
    <div className="bg-gray-50/50 rounded p-2">
      <ReactJsonView
        src={data}
        theme="rjv-default"
        collapsed={compact ? 1 : false}
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
