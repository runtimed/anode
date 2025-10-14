import { Button } from "@/components/ui/button";
import {
  Command,
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getModelSizeDisplay,
  getNotebookAiModels,
  useAvailableAiModels,
} from "@/util/ai-models.js";
import { Brain, ChevronDown, Eye, Wrench } from "lucide-react";
import React from "react";

interface AiToolbarProps {
  provider: string;
  model: string;
  onProviderChange: (provider: string, model: string) => void;
}

// Based on: https://craft.mxkaske.dev/post/fancy-box

// TODO: Make this work on mobile by using a bottom sheet, and no search input to avoid Safari bugs
export const AiToolbar: React.FC<AiToolbarProps> = ({
  provider,
  model,
  onProviderChange,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [openCombobox, setOpenCombobox] = React.useState(false);
  const [inputValue, setInputValue] = React.useState<string>("");

  const { models: availableModels } = useAvailableAiModels();
  const notebookModels = getNotebookAiModels(availableModels);

  // Filter models based on search input
  const filteredModels = React.useMemo(() => {
    if (!inputValue) return notebookModels;
    return notebookModels.filter(
      (model) =>
        model.displayName.toLowerCase().includes(inputValue.toLowerCase()) ||
        model.provider.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [notebookModels, inputValue]);

  // Group filtered models by provider
  const providerGroups = Object.entries(
    filteredModels.reduce(
      (acc, model) => {
        if (!acc[model.provider]) {
          acc[model.provider] = [];
        }
        acc[model.provider].push(model);
        return acc;
      },
      {} as Record<string, typeof filteredModels>
    )
  );

  const selectModel = (selectedProvider: string, selectedModel: string) => {
    onProviderChange(selectedProvider, selectedModel);
    setOpenCombobox(false);
  };

  const onComboboxOpenChange = (value: boolean) => {
    inputRef.current?.blur();
    setOpenCombobox(value);
    if (value) {
      setInputValue(""); // Clear input text when opening menu
    }
  };

  const getCurrentModel = () => {
    return availableModels.find(
      (m) => m.name === model && m.provider === provider
    );
  };

  const currentModel = getCurrentModel();
  const displayName = provider === "ollama" ? "Ollama" : provider.toUpperCase();
  const modelDisplay = currentModel ? currentModel.displayName : model;

  return (
    <div className="flex items-center gap-2">
      <Popover open={openCombobox} onOpenChange={onComboboxOpenChange}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openCombobox}
                className="h-7 min-w-0 justify-between gap-0 !pr-1.5 text-xs sm:h-6"
              >
                <span className="truncate">
                  {displayName} • {modelDisplay}
                </span>
                <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <span>
              Select an AI model with{" "}
              <KbdGroup>
                <Kbd>^</Kbd>
                <Kbd>Shift</Kbd>
                <Kbd>M</Kbd>
              </KbdGroup>
            </span>
          </TooltipContent>
        </Tooltip>
        <PopoverContent
          className="w-[300px] p-0"
          align="start"
          // Allows closing the popover when clicking on iframe
          onBlur={() => setOpenCombobox(false)}
        >
          <Command loop>
            <CommandInput
              ref={inputRef}
              placeholder="Search models..."
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              {filteredModels.length > 0 ? (
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
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span>{modelItem.displayName}</span>
                          {modelItem.provider === "ollama" &&
                            getModelSizeDisplay(modelItem)}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1">
                          {/* Not showing icon for completion capabilities because it's not special enough to call out */}
                          {modelItem.capabilities.includes("thinking") && (
                            <Brain />
                          )}
                          {modelItem.capabilities.includes("tools") && (
                            <Wrench />
                          )}
                          {modelItem.capabilities.includes("vision") && <Eye />}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))
              ) : (
                <CommandGroup>
                  <CommandItem disabled>No models found</CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
