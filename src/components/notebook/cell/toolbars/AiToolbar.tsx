import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import {
  useAvailableAiModels,
  getNotebookAiModels,
  getProviderBadgeColor,
  getModelSizeDisplay,
} from "@/util/ai-models.js";

interface AiToolbarProps {
  provider: string;
  model: string;
  onProviderChange: (provider: string, model: string) => void;
}

export const AiToolbar: React.FC<AiToolbarProps> = ({
  provider,
  model,
  onProviderChange,
}) => {
  const { models: availableModels } = useAvailableAiModels();
  const notebookModels = getNotebookAiModels(availableModels);

  // Group models by provider
  const providerGroups = Object.entries(
    notebookModels.reduce(
      (acc, model) => {
        if (!acc[model.provider]) {
          acc[model.provider] = [];
        }
        acc[model.provider].push(model);
        return acc;
      },
      {} as Record<string, typeof notebookModels>
    )
  );

  const getProviderBadge = () => {
    const currentModel = availableModels.find(
      (m) => m.name === model && m.provider === provider
    );

    const displayName =
      provider === "ollama" ? "Ollama" : provider.toUpperCase();
    const modelDisplay = currentModel ? currentModel.displayName : model;
    const colorClass = getProviderBadgeColor(provider);

    return (
      <Badge
        variant="outline"
        className={`h-5 cursor-pointer text-xs hover:opacity-80 ${colorClass}`}
        title={`Provider: ${displayName}, Model: ${modelDisplay}`}
      >
        {displayName} • {modelDisplay}
      </Badge>
    );
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center gap-1">
            {getProviderBadge()}
            <ChevronDown className="text-muted-foreground h-3 w-3" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {notebookModels.length > 0 ? (
            providerGroups.map(([provider, models], providerIndex) => (
              <React.Fragment key={provider}>
                {providerIndex > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel className="px-2 py-1 text-xs font-medium text-gray-600">
                  {provider.toUpperCase()}
                </DropdownMenuLabel>
                {models.map((model) => (
                  <DropdownMenuItem
                    key={`${model.provider}-${model.name}`}
                    onClick={() => onProviderChange(model.provider, model.name)}
                  >
                    {model.displayName}
                    {model.provider === "ollama" && getModelSizeDisplay(model)}
                  </DropdownMenuItem>
                ))}
              </React.Fragment>
            ))
          ) : (
            <DropdownMenuItem disabled>No models available</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
