import React from "react";
import { ContextSelectionModeButton } from "@/components/notebook/ContextSelectionModeButton";
import type { SidebarPanelProps } from "./types";

export const AiPanel: React.FC<SidebarPanelProps> = () => {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="mb-3 text-sm font-medium text-gray-700">
          Context Selection
        </h4>
        <p className="mb-3 text-xs text-gray-500">
          Control which cells are included in AI context
        </p>
        <ContextSelectionModeButton />
      </div>

      <div className="border-t pt-4">
        <h4 className="mb-3 text-sm font-medium text-gray-700">AI Settings</h4>
        <p className="text-xs text-gray-500">
          Additional AI configuration options will be added here
        </p>
      </div>
    </div>
  );
};
