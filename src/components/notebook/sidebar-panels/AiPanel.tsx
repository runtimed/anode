import { ContextSelectionModeButton } from "@/components/notebook/ContextSelectionModeButton";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useChatMode } from "@/hooks/useChatMode";
import React from "react";
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
        <h4 className="mb-3 text-sm font-medium text-gray-700">
          System Prompt
        </h4>
        <p className="mb-3 text-xs text-gray-500">
          Customize the AI's behavior and personality
        </p>
        <SystemPromptEditor />
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

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpcQueryClient, useTRPCClient } from "@/lib/trpc-client";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export const SystemPromptEditor: React.FC = () => {
  const trpc = useTRPCClient();

  // Fetch current system prompt
  const { data: currentSystemPrompt, isFetching } = useQuery(
    trpc.getSystemPrompt.queryOptions()
  );

  // Update system prompt mutation
  const updateSystemPromptMutation = useMutation(
    trpc.upsertSystemPrompt.mutationOptions({
      onSuccess: (data) => {
        toast.success("System prompt updated");
        setSystemPrompt(data.system_prompt || "");
        trpcQueryClient.invalidateQueries(trpc.getSystemPrompt.queryOptions());
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  // Delete system prompt mutation
  const deleteSystemPromptMutation = useMutation(
    trpc.deleteSystemPrompt.mutationOptions({
      onSuccess: () => {
        setSystemPrompt("");
        trpcQueryClient.invalidateQueries(trpc.getSystemPrompt.queryOptions());
      },
    })
  );

  const [systemPrompt, setSystemPrompt] = useState(
    currentSystemPrompt?.system_prompt || ""
  );

  const handleSave = () => {
    const isEmpty = systemPrompt.trim() === "";
    if (isEmpty) {
      deleteSystemPromptMutation.mutate();
    } else {
      updateSystemPromptMutation.mutate({
        system_prompt: systemPrompt,
        ai_model: null, // Default to null for now
      });
    }
  };

  const handleCancel = () => {
    setSystemPrompt(currentSystemPrompt?.system_prompt || "");
  };

  const isEditing = systemPrompt !== (currentSystemPrompt?.system_prompt ?? "");

  const isLoading =
    isFetching ||
    updateSystemPromptMutation.isPending ||
    deleteSystemPromptMutation.isPending;

  return (
    <div className="space-y-3">
      <Textarea
        value={systemPrompt}
        onChange={(e) => setSystemPrompt(e.target.value)}
        placeholder="Enter your system prompt here..."
        className="min-h-24 resize-y"
        readOnly={isLoading}
        disabled={isLoading}
        onKeyDown={(e) => {
          // Ctrl+Enter: Save system prompt
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !isLoading) {
            e.preventDefault();
            handleSave();
          }
        }}
      />

      <div className={cn("gap-2", isEditing ? "flex" : "hidden")}>
        {isEditing && (
          <>
            <Button size="sm" onClick={handleSave} disabled={isLoading}>
              {updateSystemPromptMutation.isPending ||
              deleteSystemPromptMutation.isPending
                ? "Saving..."
                : "Save"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
