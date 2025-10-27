import { useQuery } from "@livestore/react";
import { queryDb } from "@runtimed/schema";
import { tables } from "@runtimed/schema";
import { type AiModel, type ModelCapability } from "@runtimed/agent-core";
import { useMemo } from "react";

export type AiProviderGroup = {
  provider: string;
  models: AiModel[];
};

/**
 * Hook to get available AI models from runtime capabilities
 */
export function useAvailableAiModels(): {
  models: AiModel[];
  providerGroups: AiProviderGroup[];
  isLoading: boolean;
  hasToolCapableModels: boolean;
  hasVisionCapableModels: boolean;
} {
  // Get active runtime sessions
  const runtimeSessions = useQuery(
    queryDb(tables.runtimeSessions.select().where({ isActive: true }))
  ) as any[];

  const result = useMemo(() => {
    // If no active runtime, return empty state
    if (!runtimeSessions.length) {
      return {
        models: [],
        providerGroups: [],
        isLoading: false,
        hasToolCapableModels: false,
        hasVisionCapableModels: false,
      };
    }

    // Get the first active runtime session
    const activeRuntime = runtimeSessions[0];
    const availableModels = activeRuntime.availableAiModels || [];

    // Convert to our interface format
    const models: AiModel[] = availableModels.map((model: any) => ({
      name: model.name,
      displayName: model.displayName,
      provider: model.provider,
      capabilities: model.capabilities || [],
      metadata: model.metadata,
    }));

    // Group by provider
    const providerMap = new Map<string, AiModel[]>();
    for (const model of models) {
      if (!providerMap.has(model.provider)) {
        providerMap.set(model.provider, []);
      }
      providerMap.get(model.provider)!.push(model);
    }

    // Create provider groups
    const providerGroups: AiProviderGroup[] = Array.from(providerMap.entries())
      .map(([provider, models]) => ({
        provider,
        models: models.sort((a, b) =>
          a.displayName.localeCompare(b.displayName)
        ),
      }))
      .sort((a, b) => a.provider.localeCompare(b.provider));

    // Check capabilities
    const hasToolCapableModels = models.some((model) =>
      model.capabilities.includes("tools")
    );
    const hasVisionCapableModels = models.some((model) =>
      model.capabilities.includes("vision")
    );

    return {
      models,
      providerGroups,
      isLoading: false,
      hasToolCapableModels,
      hasVisionCapableModels,
    };
  }, [runtimeSessions]);

  return result;
}

/**
 * Filter models by required capabilities
 */
export function filterModelsByCapabilities(
  models: AiModel[],
  requiredCapabilities: ModelCapability[]
): AiModel[] {
  return models.filter((model) =>
    requiredCapabilities.every((capability) =>
      model.capabilities.includes(capability)
    )
  );
}

/**
 * Get models suitable for notebook AI cells (requires tool calling)
 */
export function getNotebookAiModels(models: AiModel[]): AiModel[] {
  return filterModelsByCapabilities(models, ["tools"]);
}

/**
 * Get models suitable for vision tasks
 */
export function getVisionCapableModels(models: AiModel[]): AiModel[] {
  return filterModelsByCapabilities(models, ["vision"]);
}

/**
 * Get default model for a provider
 */
export function getDefaultModelForProvider(
  models: AiModel[],
  provider: string
): AiModel | undefined {
  const providerModels = models.filter((model) => model.provider === provider);

  if (providerModels.length === 0) {
    return undefined;
  }

  // For Groq, prefer Kimi K2 Instruct
  if (provider === "groq") {
    return (
      providerModels.find(
        (model) => model.name === "moonshotai/kimi-k2-instruct"
      ) || providerModels[0]
    );
  }

  // For OpenAI, prefer gpt-4o-mini
  if (provider === "openai") {
    return (
      providerModels.find((model) => model.name === "gpt-4o-mini") ||
      providerModels[0]
    );
  }

  // For Ollama, prefer llama3.1
  if (provider === "ollama") {
    return (
      providerModels.find((model) => model.name.includes("llama3.1")) ||
      providerModels[0]
    );
  }

  // For other providers, return the first model
  return providerModels[0];
}

/**
 * Get default AI model using fallback hierarchy: Groq -> OpenAI -> others
 * If lastUsed is provided and valid, use that instead
 */
export function getDefaultAiModel(
  models: AiModel[],
  lastUsedProvider?: string | null,
  lastUsedModel?: string | null
): { provider: string; model: string } | null {
  // If we have valid last used settings, use those
  if (lastUsedProvider && lastUsedModel) {
    const isValid = models.some(
      (m) => m.provider === lastUsedProvider && m.name === lastUsedModel
    );
    if (isValid) {
      return { provider: lastUsedProvider, model: lastUsedModel };
    }
  }

  // Fallback hierarchy: Groq -> OpenAI -> others
  const fallbackProviders = ["groq", "openai"];

  for (const provider of fallbackProviders) {
    const defaultModel = getDefaultModelForProvider(models, provider);
    if (defaultModel) {
      return { provider: defaultModel.provider, model: defaultModel.name };
    }
  }

  // If no preferred providers available, use first available model
  const firstModel = models[0];
  if (firstModel) {
    return { provider: firstModel.provider, model: firstModel.name };
  }

  return null;
}

/**
 * Create display name with provider prefix
 */
export function createProviderDisplayName(model: AiModel): string {
  const providerPrefix =
    model.provider.charAt(0).toUpperCase() + model.provider.slice(1);
  return `${providerPrefix} ${model.displayName}`;
}

/**
 * Get model size display string
 */
export function getModelSizeDisplay(model: AiModel): string {
  const parameterSize = model.metadata?.parameterSize;
  if (!parameterSize) return "";

  // Format parameter size for display
  if (parameterSize.includes("B") || parameterSize.includes("M")) {
    return `(${parameterSize})`;
  }

  return parameterSize ? `(${parameterSize})` : "";
}

/**
 * Provider badge color configurations
 */
const PROVIDER_COLORS = {
  openai: "text-green-700 bg-green-50 border-green-200",
  ollama: "text-blue-700 bg-blue-50 border-blue-200",
  anthropic: "text-orange-700 bg-orange-50 border-orange-200",
  groq: "text-orange-700 bg-orange-50 border-orange-200",
  local: "text-purple-700 bg-purple-50 border-purple-200",
} as const;

/**
 * Get provider badge color class
 */
export function getProviderBadgeColor(provider: string): string {
  return (
    PROVIDER_COLORS[provider as keyof typeof PROVIDER_COLORS] ||
    "text-gray-700 bg-gray-50 border-gray-200"
  );
}
