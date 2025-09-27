import { ContextSelectionModeButton } from "@/components/notebook/ContextSelectionModeButton";
import { Switch } from "@/components/ui/switch";
import { useChatMode } from "@/hooks/useChatMode";
import React from "react";
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

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTRPCClient } from "@/lib/trpc-client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

export const SystemPromptEditor: React.FC = () => {
  const trpc = useTRPCClient();

  // Fetch current system prompt
  const { data: currentSystemPrompt } = useQuery(
    trpc.getSystemPrompt.queryOptions()
  );

  // Update system prompt mutation
  const updateSystemPromptMutation = useMutation(
    trpc.upsertSystemPrompt.mutationOptions({
      onSuccess: (data) => {
        setIsEditing(false);
        setSystemPrompt(data.system_prompt);
      },
    })
  );

  // Delete system prompt mutation
  const deleteSystemPromptMutation = useMutation(
    trpc.deleteSystemPrompt.mutationOptions({
      onSuccess: () => {
        setSystemPrompt("");
        setIsEditing(false);
      },
    })
  );

  const [isEditing, setIsEditing] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(
    !isEditing ? currentSystemPrompt?.system_prompt || "" : ""
  );

  const handleSave = () => {
    updateSystemPromptMutation.mutate({
      system_prompt: systemPrompt,
      ai_model: null, // Default to null for now
    });
  };

  const handleDelete = async () => {
    deleteSystemPromptMutation.mutate();
  };

  const handleCancel = () => {
    setSystemPrompt(currentSystemPrompt?.system_prompt || "");
    setIsEditing(false);
  };

  return (
    <div className="space-y-3">
      <Textarea
        value={systemPrompt}
        onChange={(e) => setSystemPrompt(e.target.value)}
        placeholder="Enter your system prompt here..."
        className="min-h-24 resize-y"
        disabled={!isEditing}
      />

      <div className="flex gap-2">
        {isEditing ? (
          <>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateSystemPromptMutation.isPending}
            >
              {updateSystemPromptMutation.isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={updateSystemPromptMutation.isPending}
            >
              Cancel
            </Button>
            {currentSystemPrompt && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteSystemPromptMutation.isPending}
              >
                {deleteSystemPromptMutation.isPending
                  ? "Deleting..."
                  : "Delete"}
              </Button>
            )}
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
        )}
      </div>
    </div>
  );
};
