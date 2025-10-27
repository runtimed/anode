import { lastUsedAiModel$, lastUsedAiProvider$ } from "@/queries";
import { type AiModel } from "@runtimed/agent-core";
import { Store } from "@livestore/livestore";
import { arrayIncludes } from "ts-extras";

type Provider = "anaconda" | "openai" | "groq" | "ollama";

// Default models for each provider
const DEFAULT_MODELS = {
  anaconda: "moonshotai/kimi-k2-instruct-0905",
  openai: "gpt-4o-mini",
  groq: "moonshot/kimi-k2-instruct-0905",
  ollama: "llama3.1",
} as const satisfies Record<Provider, string>;

const providerPreferenceOrder = [
  "anaconda",
  "groq",
  "openai",
  "ollama",
] as const satisfies Provider[];

function findModel(
  provider: Provider,
  model: string,
  availableModels: AiModel[]
): AiModel | null {
  const matchingModel = availableModels.find(
    (m) => m.provider === provider && m.name === model
  );

  return matchingModel || null;
}

export function findBestAiModelForCell(
  store: Store,
  cellAiSettings: {
    provider: string | null;
    model: string | null;
  },
  availableModels: AiModel[]
): AiModel | null {
  // Has valid cell provider and cell model
  if (
    cellAiSettings.provider &&
    arrayIncludes(providerPreferenceOrder, cellAiSettings.provider) &&
    cellAiSettings.model
  ) {
    const model = findModel(
      cellAiSettings.provider,
      cellAiSettings.model,
      availableModels
    );
    if (model) return model;
  }

  if (cellAiSettings.provider && cellAiSettings.model) {
    return {
      provider: cellAiSettings.provider,
      name: cellAiSettings.model,
      displayName: cellAiSettings.model,
      capabilities: [],
      metadata: {},
      decomissioned: false,
    };
  }

  // Has valid cell provider but no cell model
  else if (
    cellAiSettings.provider &&
    arrayIncludes(providerPreferenceOrder, cellAiSettings.provider) &&
    !cellAiSettings.model
  ) {
    let modelName = DEFAULT_MODELS[cellAiSettings.provider];
    let model = findModel(cellAiSettings.provider, modelName, availableModels);
    while (!model) {
      const nextProvider = providerPreferenceOrder.find(
        (p) => p !== cellAiSettings.provider
      );
      if (!nextProvider) continue;
      modelName = DEFAULT_MODELS[nextProvider];
      model = findModel(nextProvider, modelName, availableModels);
      if (model) return model;
    }
  }

  // Has cell model but no cell provider
  // Iterate through providers to find the model
  else if (!cellAiSettings.provider && cellAiSettings.model) {
    for (const provider of providerPreferenceOrder) {
      const model = findModel(provider, cellAiSettings.model, availableModels);
      if (model) return model;
    }
  }

  // No cell model or cell provider found
  // Use last used AI model and provider
  const lastUsedAiModel = store.query(lastUsedAiModel$)?.value;
  const lastUsedAiProvider = store.query(lastUsedAiProvider$)?.value;
  if (arrayIncludes(providerPreferenceOrder, lastUsedAiProvider)) {
    if (lastUsedAiModel && lastUsedAiProvider) {
      const model = findModel(
        lastUsedAiProvider,
        lastUsedAiModel,
        availableModels
      );
      if (model) return model;
    }
  }

  // Has available models but no cell provider or cell model
  // Use provider preference order to determine the default model
  // TODO: order preference should be configurable, and based on the model rather than the provider
  if (!cellAiSettings.provider && !cellAiSettings.model) {
    for (const provider of providerPreferenceOrder) {
      const modelName = DEFAULT_MODELS[provider];
      const model = findModel(provider, modelName, availableModels);
      if (model) return model;
    }
  }

  // Pick the first tool capable model if we can't find a better one
  const model = availableModels.find((model) =>
    model.capabilities.includes("tools")
  );
  if (model) return model;

  // Just pick the first model if we can't find a better one
  return availableModels[0] || null;
}
