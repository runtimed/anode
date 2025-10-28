import React from "react";
import { ContextSelectionModeButton } from "@/components/notebook/ContextSelectionModeButton";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useChatMode } from "@/hooks/useChatMode";
import { useMaxIterations } from "@/hooks/useMaxIterations";
import type { SidebarPanelProps } from "./types";

export const AiPanel: React.FC<SidebarPanelProps> = () => {
  const chatMode = useChatMode();
  const { setMaxIterations, localMaxIterations, setLocalMaxIterations } =
    useMaxIterations();

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
        <div className="space-y-4">
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

          <div className="-m-2 space-y-3 rounded-md p-2">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  Max Iterations
                </p>
                <span className="text-sm text-gray-500">
                  {localMaxIterations}
                </span>
              </div>
              <p className="mb-3 text-xs text-gray-500">
                Number of AI conversation iterations (1-100)
              </p>
              <Slider
                min={1}
                max={100}
                step={1}
                value={[localMaxIterations]}
                onValueChange={(values) => setLocalMaxIterations(values[0])}
                onBlur={() => setMaxIterations(localMaxIterations)}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
