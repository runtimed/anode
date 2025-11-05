import { ContextSelectionModeButton } from "@/components/notebook/ContextSelectionModeButton";
import { Slider } from "@/components/ui/slider";
import { useChatMode } from "@/hooks/useChatMode";
import { useMaxIterations } from "@/hooks/useMaxIterations";
import React, { useEffect } from "react";
import type { SidebarPanelProps } from "./types";

export const AiPanel: React.FC<SidebarPanelProps> = () => {
  const userSavedPromptEnabled = useFeatureFlag("user-saved-prompt");
  const chatMode = useChatMode();
  const { setMaxIterations, localMaxIterations, setLocalMaxIterations } =
    useMaxIterations();

  return (
    <div className="space-y-3">
        <SidebarGroupLabel>Context Selection</SidebarGroupLabel>
        <ContextSelectionModeButton />

      {userSavedPromptEnabled && (
        <>
          <Separator />
          <SidebarGroupLabel>Saved Prompt</SidebarGroupLabel>
          <SavedPromptEditor />
        </>
      )}

      <Separator />

      <>
        <SidebarGroupLabel>AI Settings</SidebarGroupLabel>
        <div className="space-y-4">
          <SidebarSwitch
            title="Chat Mode"
            description="Enable chat mode"
            enabled={chatMode.enabled}
            onEnabledChange={chatMode.setEnabled}
          />

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
      </>
    </div>
  );
};

import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { SidebarSwitch } from "@/components/ui/SidebarSwitch";
import { Textarea } from "@/components/ui/textarea";
import { useFeatureFlag } from "@/contexts/FeatureFlagContext";
import { trpcQueryClient, useTRPCClient } from "@/lib/trpc-client";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SidebarGroupLabel } from "./runtime/components";

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

  // Set the prompt to the current saved prompt when it changes
  useEffect(() => {
    if (currentSavedPrompt) {
      setPrompt(currentSavedPrompt.prompt);
    }
  }, [currentSavedPrompt]);

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
                    <Kbd variant="dark">⌘</Kbd>
                    <Kbd variant="dark">⏎</Kbd>
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
