import React from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { ToolApprovalRequest } from "../../hooks/useToolApprovals";

interface ToolApprovalDialogProps {
  request: ToolApprovalRequest;
  onApprove: (status: "approved_once" | "approved_always" | "denied") => void;
}

const formatToolName = (toolName: string): string => {
  // Handle MCP tools (mcp__server__toolname format)
  if (toolName.startsWith("mcp__")) {
    const parts = toolName.split("__");
    if (parts.length >= 3) {
      const serverName = parts[1];
      const toolNamePart = parts.slice(2).join("_");
      return `${toolNamePart.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} (${serverName})`;
    }
  }
  
  // Convert snake_case to title case for regular tools
  return toolName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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

export const ToolApprovalDialog: React.FC<ToolApprovalDialogProps> = ({
  request,
  onApprove,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6 bg-white shadow-lg">
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Tool Approval Required
            </h3>
            <p className="text-sm text-gray-600 mt-2">
              AI wants to use: <strong>{formatToolName(request.toolName)}</strong>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {getToolDescription(request.toolName)}
            </p>
          </div>

          <div className="flex flex-col space-y-2">
            <Button
              onClick={() => onApprove("approved_once")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Approve Once
            </Button>
            
            <Button
              onClick={() => onApprove("approved_always")}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Always Allow This Tool
            </Button>
            
            <Button
              onClick={() => onApprove("denied")}
              variant="outline"
              className="w-full border-red-300 text-red-700 hover:bg-red-50"
            >
              Deny
            </Button>
          </div>

          <div className="text-xs text-gray-400 text-center">
            Tool Call ID: {request.toolCallId.slice(0, 8)}...
          </div>
        </div>
      </Card>
    </div>
  );
}; 