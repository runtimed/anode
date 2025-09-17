import React from "react";
import { ContextSelectionModeButton } from "@/components/notebook/ContextSelectionModeButton";
import { Switch } from "@/components/ui/switch";
import { useChatMode } from "@/hooks/useChatMode";
import type { SidebarPanelProps } from "./types";

export const AiPanel: React.FC<SidebarPanelProps> = () => {
  const chatMode = useChatMode();

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
        <div
          className="-m-2 cursor-default space-y-3 rounded-md p-2 transition-colors hover:bg-gray-100"
          onClick={() => chatMode.setEnabled(!chatMode.enabled)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Chat Mode</p>
              <p className="text-xs text-gray-500">Enable chat mode</p>
            </div>
            <Switch
              checked={chatMode.enabled}
              onCheckedChange={chatMode.setEnabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
