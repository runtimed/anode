import React from "react";
import IframeOutput from "./IframeOutput";

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
      <IframeOutput isReact content={JSON.stringify(jsonData)} />
    </div>
  );
};

export default JsonOutput;
