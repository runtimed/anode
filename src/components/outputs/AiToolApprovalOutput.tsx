import React from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { AlertCircle } from "lucide-react";

interface AiToolApprovalOutputProps {
  toolCallId: string;
  toolName: string;
  onApprove: (status: "approved_once" | "approved_always" | "denied") => void;
}

const formatToolName = (toolName: string): string => {
  // Handle MCP tools (mcp__server__toolname format)
  if (toolName.startsWith("mcp__")) {
    const parts = toolName.split("__");
    if (parts.length >= 3) {
      const serverName = parts[1];
      const toolNamePart = parts.slice(2).join("_");
      return `${toolNamePart
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")} (${serverName})`;
    }
  }

  // Convert snake_case to title case for regular tools
  return toolName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const getToolDescription = (toolName: string): string => {
  // Handle MCP tools
  if (toolName.startsWith("mcp__")) {
    return `Use an external tool via MCP server`;
  }

  // Handle built-in tools
  switch (toolName) {
    case "create_cell":
      return "Create a new cell in the notebook";
    case "modify_cell":
      return "Modify the content of an existing cell";
    case "execute_cell":
      return "Execute a code cell";
    default:
      return `Use the ${formatToolName(toolName)} tool`;
  }
};

export const AiToolApprovalOutput: React.FC<AiToolApprovalOutputProps> = ({
  toolCallId,
  toolName,
  onApprove,
}) => {
  return (
    <div className="py-2">
      <Card className="border-l-4 border-amber-200 border-l-amber-400 bg-amber-50/50 p-4 shadow-sm">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-medium text-amber-800">
                Tool Approval Required
              </h4>
              <p className="mt-1 text-sm text-amber-700">
                AI wants to use: <strong>{formatToolName(toolName)}</strong>
              </p>
              <p className="mt-1 text-xs text-amber-600">
                {getToolDescription(toolName)}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <Button
              autoFocus
              onClick={() => onApprove("approved_once")}
              size="sm"
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
            >
              Approve Once
            </Button>

            <Button
              onClick={() => onApprove("approved_always")}
              size="sm"
              className="flex-1 bg-green-600 text-white hover:bg-green-700"
            >
              Always Allow
            </Button>

            <Button
              onClick={() => onApprove("denied")}
              size="sm"
              variant="outline"
              className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
            >
              Deny
            </Button>
          </div>

          <div className="text-center text-xs text-amber-600">
            Tool Call ID: {toolCallId.slice(0, 8)}...
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AiToolApprovalOutput;
