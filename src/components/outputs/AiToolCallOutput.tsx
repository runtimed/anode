import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ChevronDown, Edit, FilePlus, Info } from "lucide-react";

interface AiToolCallOutputProps {
  toolData: {
    tool_call_id: string;
    tool_name: string;
    arguments: Record<string, any>;
    status: "success" | "error";
    timestamp: string;
    execution_time_ms?: number;
  };
}

// Tool icon and action mapping for AI tools
const getToolConfig = (toolName: string, status: "success" | "error") => {
  const toolConfigs: Record<
    string,
    {
      icon: React.ComponentType<any>;
      verb: string;
      pastVerb: string;
      label: string;
    }
  > = {
    create_cell: {
      icon: FilePlus,
      verb: "Creating",
      pastVerb: "Created",
      label: "cell",
    },
    modify_cell: {
      icon: Edit,
      verb: "Modifying",
      pastVerb: "Modified",
      label: "cell",
    },
  };

  const config = toolConfigs[toolName] || {
    icon: Info,
    verb: "Executing",
    pastVerb: "Executed",
    label: "tool",
  };

  return {
    ...config,
    displayVerb: status === "success" ? config.pastVerb : config.verb,
  };
};

export const AiToolCallOutput: React.FC<AiToolCallOutputProps> = ({
  toolData,
}) => {
  const isSuccess = toolData.status === "success";
  const toolConfig = getToolConfig(toolData.tool_name, toolData.status);
  const ToolIcon = toolConfig.icon;

  return (
    <div className="py-2">
      {Object.keys(toolData.arguments).length > 0
        ? (
          <details className="group">
            <summary className="cursor-pointer flex items-center gap-2 text-sm hover:bg-muted/20 -m-1 p-1 rounded">
              <ToolIcon
                className={`h-4 w-4 ${
                  isSuccess ? "text-green-500" : "text-red-500"
                }`}
              />
              <span className="text-muted-foreground flex-1">
                {toolConfig.displayVerb} {toolConfig.label}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground group-open:rotate-180 transition-transform" />
            </summary>
            <div className="mt-2 ml-6 p-3 bg-card/30 rounded border border-border/50 text-xs">
              <div className="text-muted-foreground mb-2">
                {new Date(toolData.timestamp).toLocaleTimeString()}
                {toolData.execution_time_ms && (
                  <span className="ml-2">
                    ({toolData.execution_time_ms}ms)
                  </span>
                )}
              </div>
              <SyntaxHighlighter
                language="json"
                style={oneLight}
                customStyle={{
                  margin: 0,
                  background: "transparent",
                  fontSize: "0.75rem",
                }}
              >
                {JSON.stringify(toolData.arguments, null, 2)}
              </SyntaxHighlighter>
            </div>
          </details>
        )
        : (
          <div className="flex items-center gap-2 text-sm">
            <ToolIcon
              className={`h-4 w-4 ${
                isSuccess ? "text-green-500" : "text-red-500"
              }`}
            />
            <span className="text-muted-foreground">
              {toolConfig.displayVerb} {toolConfig.label}
            </span>
            {toolData.execution_time_ms && (
              <span className="text-xs text-muted-foreground">
                ({toolData.execution_time_ms}ms)
              </span>
            )}
          </div>
        )}
    </div>
  );
};

export default AiToolCallOutput;
