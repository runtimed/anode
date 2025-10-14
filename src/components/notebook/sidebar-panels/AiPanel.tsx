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
        <h4 className="mb-3 text-sm font-medium text-gray-700">Saved Prompt</h4>
        <p className="mb-3 text-xs text-gray-500">
          Customize the AI's behavior and personality
        </p>
        <SavedPromptEditor />
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
import { Kbd, KbdGroup } from "@/components/ui/kbd";

export const SavedPromptEditor: React.FC = () => {
  const trpc = useTRPCClient();

  // Fetch current saved prompt
  const { data: currentSavedPrompt, isFetching } = useQuery(
    trpc.getSavedPrompt.queryOptions()
  );

  // Update saved prompt mutation
  const updateSavedPromptMutation = useMutation(
    trpc.upsertSavedPrompt.mutationOptions({
      onSuccess: (data) => {
        toast.success("Saved prompt updated");
        setPrompt(data.prompt || "");
        trpcQueryClient.invalidateQueries(trpc.getSavedPrompt.queryOptions());
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  // Delete saved prompt mutation
  const deleteSavePromptMutation = useMutation(
    trpc.deleteSavedPrompt.mutationOptions({
      onSuccess: () => {
        setPrompt("");
        trpcQueryClient.invalidateQueries(trpc.getSavedPrompt.queryOptions());
      },
    })
  );

  const [prompt, setPrompt] = useState(currentSavedPrompt?.prompt || "");

  const handleSave = () => {
    const isEmpty = prompt.trim() === "";
    if (isEmpty) {
      deleteSavePromptMutation.mutate();
    } else {
      updateSavedPromptMutation.mutate({
        prompt,
        ai_model: null, // Default to null for now
      });
    }
  };

  const handleCancel = () => {
    setPrompt(currentSavedPrompt?.prompt || "");
  };

  const isEditing = prompt !== (currentSavedPrompt?.prompt ?? "");

  const isLoading =
    isFetching ||
    updateSavedPromptMutation.isPending ||
    deleteSavePromptMutation.isPending;

  return (
    <div className="space-y-3">
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your saved prompt here..."
        className="min-h-24 resize-y"
        readOnly={isLoading}
        disabled={isLoading}
        onKeyDown={(e) => {
          // Ctrl+Enter: Save the user's prompt
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !isLoading) {
            e.preventDefault();
            handleSave();
          }
          if (e.key === "Escape" && !isLoading) {
            e.preventDefault();
            handleCancel();
          }
        }}
      />

      <div className={cn("gap-2", isEditing ? "flex" : "hidden")}>
        {isEditing && (
          <>
            <Button size="sm" onClick={handleSave} disabled={isLoading}>
              {updateSavedPromptMutation.isPending ||
              deleteSavePromptMutation.isPending ? (
                "Saving..."
              ) : (
                <>
                  Save{" "}
                  <KbdGroup>
                    <Kbd>⌘</Kbd>
                    <Kbd>⏎</Kbd>
                  </KbdGroup>
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
              <KbdGroup>
                <Kbd>Esc</Kbd>
              </KbdGroup>
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
