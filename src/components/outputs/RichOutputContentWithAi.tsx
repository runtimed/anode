import React from "react";

import {
  AI_TOOL_CALL_MIME_TYPE,
  AI_TOOL_RESULT_MIME_TYPE,
  isAiToolCallData,
  isAiToolResultData,
} from "@/schema";
import { SuspenseSpinner } from "./shared-with-iframe/SuspenseSpinner";

const AiToolCallOutput = React.lazy(() =>
  import("@/components/outputs/AiToolCallOutput").then((m) => ({
    default: m.AiToolCallOutput,
  }))
);
const AiToolResultOutput = React.lazy(() =>
  import("@/components/outputs/AiToolResultOutput").then((m) => ({
    default: m.AiToolResultOutput,
  }))
);

export function RichOutputContent({
  mediaType,
  outputData,
}: {
  mediaType: string;
  outputData: Record<string, unknown>;
}) {
  switch (mediaType) {
    case AI_TOOL_CALL_MIME_TYPE: {
      const toolData = outputData[mediaType];
      if (isAiToolCallData(toolData)) {
        return (
          <SuspenseSpinner>
            <AiToolCallOutput toolData={toolData} />
          </SuspenseSpinner>
        );
      }
      return <div className="text-red-500">Invalid tool call data</div>;
    }

    case AI_TOOL_RESULT_MIME_TYPE: {
      const resultData = outputData[mediaType];
      if (isAiToolResultData(resultData)) {
        return (
          <SuspenseSpinner>
            <AiToolResultOutput resultData={resultData} />
          </SuspenseSpinner>
        );
      }
      return <div className="text-red-500">Invalid tool result data</div>;
    }
  }
}
