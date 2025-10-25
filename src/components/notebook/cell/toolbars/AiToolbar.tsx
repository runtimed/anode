import { AiCapabilityIcon } from "@/components/ai/AiCapabilityIcon";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  SimpleTooltip,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRuntimeHealth } from "@/hooks/useRuntimeHealth";
import { cn } from "@/lib/utils";
import { getModelSizeDisplay, useAvailableAiModels } from "@/util/ai-models.js";
import { useStore } from "@livestore/react";
import { Ban, Brain, Check, ChevronDown, Eye, Wrench } from "lucide-react";
import { ModelCapability } from "node_modules/@runtimed/agent-core/src/types";
import React from "react";
import { useSet } from "react-use";
import { findBestAiModelForCell } from "./ai-model-utils";
import { useFeatureFlag } from "@/contexts/FeatureFlagContext";

interface AiToolbarProps {
  cellProvider: string | null;
  cellModel: string | null;
  onModelChange: (provider: string, model: string) => void;
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

// Based on: https://craft.mxkaske.dev/post/fancy-box

// TODO: Make this work on mobile by using a bottom sheet, and no search input to avoid Safari bugs
export const AiToolbar: React.FC<AiToolbarProps> = ({
  cellProvider,
  cellModel,
  onModelChange,
  open,
  onOpenChange,
}) => {
  const { store } = useStore();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = React.useState<string>("");
  const showAiCapabilities = useFeatureFlag("show-ai-capabilities");

  const { models: availableModels } = useAvailableAiModels();
  // Filters for models that support tool calling
  const notebookModels = availableModels.filter(
    (model) => !model.decomissioned && model.capabilities.includes("tools")
  );

  const isDisabled = !availableModels || availableModels.length === 0;

  // Filter models based on search input
  const filteredModels = React.useMemo(() => {
    if (!inputValue) return notebookModels;
    return notebookModels.filter(
      (model) =>
        model.displayName.toLowerCase().includes(inputValue.toLowerCase()) ||
        model.provider.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [notebookModels, inputValue]);

  const [abilities, { toggle }] = useSet<ModelCapability>(new Set([]));

  const filteredModelsByAbilities = React.useMemo(() => {
    return filteredModels.filter((model) => {
      return Array.from(abilities).every((ability) =>
        model.capabilities.includes(ability)
      );
    });
  }, [filteredModels, abilities]);

  // Group filtered models by provider
  const providerGroups = Object.entries(
    filteredModelsByAbilities.reduce(
      (acc, model) => {
        if (!acc[model.provider]) {
          acc[model.provider] = [];
        }
        acc[model.provider].push(model);
        return acc;
      },
      {} as Record<string, typeof filteredModelsByAbilities>
    )
  );

  const selectModel = (selectedProvider: string, selectedModel: string) => {
    onModelChange(selectedProvider, selectedModel);
    setInputValue(""); // Clear input text
    onOpenChange(false);
  };

  const { hasActiveRuntime } = useRuntimeHealth();

  const currentModel = findBestAiModelForCell(
    store,
    {
      provider: cellProvider,
      model: cellModel,
    },
    // Send all models rather than accepted models (with tools) because we could have cells created with a model we don't support anymore
    // But we still want to show this model as the selected model
    availableModels
  );

  const modelFound = availableModels.find(
    (model) =>
      model.provider === currentModel?.provider &&
      model.name === currentModel?.name
  );

  if (!currentModel) {
    return (
      <SimpleTooltip
        content={
          <>
            No models available.{" "}
            {!hasActiveRuntime && "Start a runtime to use AI models."}
          </>
        }
      >
        <Button
          variant="outline"
          className={cn(aiDropdownClassName, "cursor-not-allowed opacity-50")}
        >
          No models available{" "}
          {availableModels.length > 0 ? `(${availableModels.length})` : ""}
          <AiDropdownChevron />
        </Button>
      </SimpleTooltip>
    );
  }

  const currentProvider = currentModel?.provider;

  const displayName =
    currentProvider === "ollama" ? "Ollama" : currentProvider.toUpperCase();
  const modelDisplay = currentModel ? currentModel.displayName : cellModel;

  if (isDisabled) {
    return (
      <SimpleTooltip
        content={
          <>
            No models available.{" "}
            {!hasActiveRuntime && "Start a runtime to use AI models."}
          </>
        }
      >
        <Button
          variant="outline"
          className={cn(aiDropdownClassName, "cursor-not-allowed opacity-50")}
        >
          <span className="flex items-center gap-1 truncate">
            {!modelFound && <Ban className="size-3" />}
            {displayName} • {modelDisplay} {currentModel.decomissioned && "💀"}
          </span>
          <AiDropdownChevron />
        </Button>
      </SimpleTooltip>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={onOpenChange}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                // Allow the button to be clickable even if the model is not found
                className={cn(aiDropdownClassName)}
              >
                <span className="flex items-center gap-1 truncate">
                  {!modelFound && <Ban className="size-3" />}
                  {displayName} • {modelDisplay}{" "}
                  {currentModel.decomissioned && "💀"}
                </span>
                <AiDropdownChevron />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <span>
              Select an AI model with{" "}
              <KbdGroup>
                <Kbd variant="dark">Ctrl</Kbd>
                <Kbd variant="dark">Shift</Kbd>
                <Kbd variant="dark">M</Kbd>
              </KbdGroup>
            </span>
            {currentModel.decomissioned && (
              <div className="text-red-300">
                💀 This model is decomissioned and is no longer supported.
              </div>
            )}
            {!modelFound && (
              <div className="flex items-center gap-1 text-red-300">
                <Ban className="size-3" /> This model is not available in this
                runtime.
              </div>
            )}
          </TooltipContent>
        </Tooltip>
        <PopoverContent
          className="w-[300px] p-0"
          align="start"
          // Allows closing the popover when clicking on iframe
          // onBlur={() => onOpenChange(false)}
          // onPointerDownOutside={() => onOpenChange(false)}
        >
          <Command loop>
            <CommandInput
              ref={inputRef}
              placeholder="Search models..."
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              <div className="text-muted-foreground sticky top-0 z-10 flex items-center gap-1 bg-white px-3 pt-1 text-xs">
                {showAiCapabilities && (
                  <>
                    Filter:
                    <Button
                      size="xs"
                      className="h-5 gap-1 rounded-sm px-1.5 py-0 text-xs font-normal"
                      variant={
                        abilities.has("thinking") ? "default" : "outline"
                      }
                      onClick={() => {
                        toggle("thinking");
                        inputRef.current?.focus();
                      }}
                    >
                      <Brain className="size-2.5" />
                      Thinking
                      {abilities.has("thinking") && (
                        <Check className="size-2.5" />
                      )}
                    </Button>
                    <Button
                      size="xs"
                      className="h-5 gap-1 rounded-sm px-1.5 py-0 text-xs font-normal"
                      variant={abilities.has("vision") ? "default" : "outline"}
                      onClick={() => {
                        toggle("vision");
                        inputRef.current?.focus();
                      }}
                    >
                      <Eye className="size-2.5" />
                      Vision
                      {abilities.has("vision") && (
                        <Check className="size-2.5" />
                      )}
                    </Button>
                    <Button
                      size="xs"
                      className="h-5 gap-1 rounded-sm px-1.5 py-0 text-xs font-normal"
                      variant={abilities.has("tools") ? "default" : "outline"}
                      onClick={() => {
                        toggle("tools");
                        inputRef.current?.focus();
                      }}
                    >
                      <Wrench className="size-2.5" />
                      Tools
                      {abilities.has("tools") && <Check className="size-2.5" />}
                    </Button>
                  </>
                )}
              </div>
              {filteredModels.length > 0 &&
                providerGroups.map(([providerName, models]) => (
                  <CommandGroup
                    key={providerName}
                    heading={providerName.toUpperCase()}
                  >
                    {models.map((modelItem) => (
                      <CommandItem
                        key={`${modelItem.provider}-${modelItem.name}`}
                        value={`${modelItem.provider}-${modelItem.name}`}
                        onSelect={() =>
                          selectModel(modelItem.provider, modelItem.name)
                        }
                        className={cn(
                          "flex items-center justify-between transition-colors",
                          modelItem.name === currentModel?.name &&
                            modelItem.provider === currentModel?.provider &&
                            "bg-purple-700 text-white"
                        )}
                        disabled={!modelItem.capabilities.includes("tools")}
                      >
                        <div className="flex items-center gap-2">
                          <span>{modelItem.displayName}</span>
                          {modelItem.provider === "ollama" &&
                            getModelSizeDisplay(modelItem)}
                        </div>
                        {showAiCapabilities && (
                          <div className="flex items-center gap-1 opacity-60">
                            {/* Not showing icon for completion capabilities because it's not special enough to call out */}
                            <AiCapabilityIcon
                              model={modelItem}
                              capability="vision"
                              iconClassName="size-3"
                            />
                            <AiCapabilityIcon
                              model={modelItem}
                              capability="thinking"
                              iconClassName="size-3"
                            />
                            <AiCapabilityIcon
                              model={modelItem}
                              capability="tools"
                              iconClassName="size-3"
                            />
                          </div>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
            </CommandList>
            <CommandEmpty>
              <span className="text-muted-foreground text-center text-xs">
                No models found
              </span>
            </CommandEmpty>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

const aiDropdownClassName =
  "h-7 min-w-0 justify-between gap-0 !pr-1.5 text-xs sm:h-6";

const AiDropdownChevron = () => {
  return (
    <ChevronDown
      strokeWidth={1.5}
      className="ml-1 h-3 w-3 shrink-0 opacity-40"
    />
  );
};
