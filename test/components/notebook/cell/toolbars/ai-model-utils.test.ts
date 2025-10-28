import { describe, it, expect, vi, beforeEach } from "vitest";
import { Store } from "@livestore/livestore";
import { findBestAiModelForCell } from "../../../../../src/components/notebook/cell/toolbars/ai-model-utils";
import { type AiModel, type ModelCapability } from "@runtimed/agent-core";
import {
  lastUsedAiModel$,
  lastUsedAiProvider$,
} from "../../../../../src/queries";

// Mock the queries
vi.mock("@/queries", () => ({
  lastUsedAiModel$: Symbol("lastUsedAiModel$"),
  lastUsedAiProvider$: Symbol("lastUsedAiProvider$"),
}));

describe("findBestAiModelForCell", () => {
  let mockStore: Store;
  let availableModels: AiModel[];

  beforeEach(() => {
    // Create a mock store
    mockStore = {
      query: vi.fn(),
    } as unknown as Store;

    // Default available models for testing
    availableModels = [
      {
        provider: "anaconda",
        name: "moonshotai/kimi-k2-instruct-0905",
        displayName: "Kimi K2 Instruct",
        capabilities: ["completion", "tools"],
        metadata: {},
        decomissioned: false,
      },
      {
        provider: "openai",
        name: "gpt-4o-mini",
        displayName: "GPT-4o Mini",
        capabilities: ["completion", "tools", "vision"],
        metadata: {},
        decomissioned: false,
      },
      {
        provider: "groq",
        name: "moonshot/kimi-k2-instruct-0905",
        displayName: "Kimi K2 Instruct (Groq)",
        capabilities: ["completion", "tools"],
        metadata: {},
        decomissioned: false,
      },
      {
        provider: "ollama",
        name: "llama3.1",
        displayName: "Llama 3.1",
        capabilities: ["completion"],
        metadata: {},
        decomissioned: false,
      },
      {
        provider: "openai",
        name: "gpt-3.5-turbo",
        displayName: "GPT-3.5 Turbo",
        capabilities: ["completion"],
        metadata: {},
        decomissioned: false,
      },
    ];
  });

  describe("when cell has valid provider and model", () => {
    it("should return the matching model from available models", () => {
      const cellAiSettings = {
        provider: "openai",
        model: "gpt-4o-mini",
      };

      const result = findBestAiModelForCell(
        mockStore,
        cellAiSettings,
        availableModels
      );

      expect(result).toEqual({
        provider: "openai",
        name: "gpt-4o-mini",
        displayName: "GPT-4o Mini",
        capabilities: ["completion", "tools", "vision"],
        metadata: {},
        decomissioned: false,
      });
    });

    it("should return a fallback model object when model not found in available models", () => {
      const cellAiSettings = {
        provider: "openai",
        model: "gpt-4o",
      };

      const result = findBestAiModelForCell(
        mockStore,
        cellAiSettings,
        availableModels
      );

      expect(result).toEqual({
        provider: "openai",
        name: "gpt-4o",
        displayName: "gpt-4o",
        capabilities: [],
        metadata: {},
        decomissioned: false,
      });
    });
  });

  describe("when cell has valid provider but no model", () => {
    console.log("availableModels", availableModels);
    it("should return default model for the provider", () => {
      const cellAiSettings = {
        provider: "anaconda",
        model: null,
      };

      const result = findBestAiModelForCell(
        mockStore,
        cellAiSettings,
        availableModels
      );

      expect(result).toEqual({
        provider: "anaconda",
        name: "moonshotai/kimi-k2-instruct-0905",
        displayName: "Kimi K2 Instruct",
        capabilities: ["completion", "tools"],
        metadata: {},
        decomissioned: false,
      });
    });
  });

  describe("when cell has model but no provider", () => {
    it("should find model across providers in order of preference", () => {
      const cellAiSettings = {
        provider: null,
        model: "gpt-4o-mini",
      };

      const result = findBestAiModelForCell(
        mockStore,
        cellAiSettings,
        availableModels
      );

      expect(result).toEqual({
        provider: "openai",
        name: "gpt-4o-mini",
        displayName: "GPT-4o Mini",
        capabilities: ["completion", "tools", "vision"],
        metadata: {},
        decomissioned: false,
      });
    });

    it("should fallback to default behavior when model not found in any provider", () => {
      const cellAiSettings = {
        provider: null,
        model: "nonexistent-model",
      };

      vi.mocked(mockStore.query).mockReturnValue({ value: null });

      const result = findBestAiModelForCell(
        mockStore,
        cellAiSettings,
        availableModels
      );

      // Should fallback to default model from first available provider
      expect(result).toEqual({
        provider: "anaconda",
        name: "moonshotai/kimi-k2-instruct-0905",
        displayName: "Kimi K2 Instruct",
        capabilities: ["completion", "tools"],
        metadata: {},
        decomissioned: false,
      });
    });
  });

  describe("when using last used AI model/provider", () => {
    it("should return last used model when available", () => {
      const cellAiSettings = {
        provider: null,
        model: null,
      };

      // Mock store to return last used values
      vi.mocked(mockStore.query).mockImplementation((query) => {
        if (query === lastUsedAiModel$) {
          return { value: "gpt-4o-mini" };
        }
        if (query === lastUsedAiProvider$) {
          return { value: "openai" };
        }
        return { value: null };
      });

      const result = findBestAiModelForCell(
        mockStore,
        cellAiSettings,
        availableModels
      );

      expect(result).toEqual({
        provider: "openai",
        name: "gpt-4o-mini",
        displayName: "GPT-4o Mini",
        capabilities: ["completion", "tools", "vision"],
        metadata: {},
        decomissioned: false,
      });
    });

    it("should fallback to default behavior when last used model is not found", () => {
      const cellAiSettings = {
        provider: null,
        model: null,
      };

      vi.mocked(mockStore.query).mockImplementation((query) => {
        if (query === lastUsedAiModel$) {
          return { value: "nonexistent-model" };
        }
        if (query === lastUsedAiProvider$) {
          return { value: "openai" };
        }
        return { value: null };
      });

      const result = findBestAiModelForCell(
        mockStore,
        cellAiSettings,
        availableModels
      );

      // Should fallback to default model from first available provider
      expect(result).toEqual({
        provider: "anaconda",
        name: "moonshotai/kimi-k2-instruct-0905",
        displayName: "Kimi K2 Instruct",
        capabilities: ["completion", "tools"],
        metadata: {},
        decomissioned: false,
      });
    });
  });

  describe("when no cell settings and no last used model", () => {
    it("should return default model from order of preference", () => {
      const cellAiSettings = {
        provider: null,
        model: null,
      };

      vi.mocked(mockStore.query).mockReturnValue({ value: null });

      const result = findBestAiModelForCell(
        mockStore,
        cellAiSettings,
        availableModels
      );

      expect(result).toEqual({
        provider: "anaconda",
        name: "moonshotai/kimi-k2-instruct-0905",
        displayName: "Kimi K2 Instruct",
        capabilities: ["completion", "tools"],
        metadata: {},
        decomissioned: false,
      });
    });

    it("should fallback through providers when default models not available", () => {
      const limitedModels = availableModels.filter(
        (m) => m.provider !== "anaconda" && m.provider !== "groq"
      );
      const cellAiSettings = {
        provider: null,
        model: null,
      };

      vi.mocked(mockStore.query).mockReturnValue({ value: null });

      const result = findBestAiModelForCell(
        mockStore,
        cellAiSettings,
        limitedModels
      );

      expect(result).toEqual({
        provider: "openai",
        name: "gpt-4o-mini",
        displayName: "GPT-4o Mini",
        capabilities: ["completion", "tools", "vision"],
        metadata: {},
        decomissioned: false,
      });
    });
  });

  describe("fallback scenarios", () => {
    it("should return first tool-capable model when no other options", () => {
      const toolOnlyModels = [
        {
          provider: "custom",
          name: "completion-model",
          displayName: "Completion Model",
          capabilities: ["completion"],
          metadata: {},
          decomissioned: false,
        },
        {
          provider: "custom",
          name: "tool-model",
          displayName: "Tool Model",
          capabilities: ["tools"],
          metadata: {},
          decomissioned: false,
        },
      ] as const satisfies AiModel[];

      const cellAiSettings = {
        provider: null,
        model: null,
      };

      vi.mocked(mockStore.query).mockReturnValue({ value: null });

      const result = findBestAiModelForCell(
        mockStore,
        cellAiSettings,
        toolOnlyModels
      );

      expect(result).toEqual({
        provider: "custom",
        name: "tool-model",
        displayName: "Tool Model",
        capabilities: ["tools"],
        metadata: {},
        decomissioned: false,
      });
    });

    it("should return first available model when no tool-capable models", () => {
      const completionOnlyModels = [
        {
          provider: "custom",
          name: "completion-model-1",
          displayName: "Completion Model 1",
          capabilities: ["completion"],
          metadata: {},
          decomissioned: false,
        },
        {
          provider: "custom",
          name: "completion-model-2",
          displayName: "Completion Model 2",
          capabilities: ["completion"],
          metadata: {},
          decomissioned: false,
        },
      ] as const satisfies AiModel[];

      const cellAiSettings = {
        provider: null,
        model: null,
      };

      vi.mocked(mockStore.query).mockReturnValue({ value: null });

      const result = findBestAiModelForCell(
        mockStore,
        cellAiSettings,
        completionOnlyModels
      );

      expect(result).toEqual({
        provider: "custom",
        name: "completion-model-1",
        displayName: "Completion Model 1",
        capabilities: ["completion"],
        metadata: {},
        decomissioned: false,
      });
    });

    it("should return null when no models available", () => {
      const cellAiSettings = {
        provider: null,
        model: null,
      };

      vi.mocked(mockStore.query).mockReturnValue({ value: null });

      const result = findBestAiModelForCell(mockStore, cellAiSettings, []);

      expect(result).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("should handle empty string provider and model", () => {
      const cellAiSettings = {
        provider: "",
        model: "",
      };

      vi.mocked(mockStore.query).mockReturnValue({ value: null });

      const result = findBestAiModelForCell(
        mockStore,
        cellAiSettings,
        availableModels
      );

      expect(result).toEqual({
        provider: "anaconda",
        name: "moonshotai/kimi-k2-instruct-0905",
        displayName: "Kimi K2 Instruct",
        capabilities: ["completion", "tools"],
        metadata: {},
        decomissioned: false,
      });
    });

    it("should handle decomissioned models", () => {
      const decomissionedModels = [
        {
          provider: "anaconda",
          name: "moonshotai/kimi-k2-instruct-0905",
          displayName: "Kimi K2 Instruct",
          capabilities: ["completion", "tools"],
          metadata: {},
          decomissioned: true,
        },
        {
          provider: "openai",
          name: "gpt-4o-mini",
          displayName: "GPT-4o Mini",
          capabilities: ["completion", "tools", "vision"],
          metadata: {},
          decomissioned: false,
        },
      ] as const satisfies AiModel[];

      const cellAiSettings = {
        provider: "anaconda",
        model: "moonshotai/kimi-k2-instruct-0905",
      };

      const result = findBestAiModelForCell(
        mockStore,
        cellAiSettings,
        decomissionedModels
      );

      // Should still return the decomissioned model if it matches exactly
      expect(result).toEqual({
        provider: "anaconda",
        name: "moonshotai/kimi-k2-instruct-0905",
        displayName: "Kimi K2 Instruct",
        capabilities: ["completion", "tools"],
        metadata: {},
        decomissioned: true,
      });
    });
  });
});
