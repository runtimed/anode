import { signal } from "@livestore/livestore";

/**
 * Signal tracking whether AI context selection mode is active
 * Used for managing which cells are visible to AI during conversations
 */
export const contextSelectionMode$ = signal<boolean>(false, {
  label: "contextSelectionMode$",
});

/**
 * Signal tracking the last used AI model for new AI cells
 * Helps maintain user preference across cell creations
 */
export const lastUsedAiModel$ = signal<string | null>(null, {
  label: "lastUsedAiModel$",
});

/**
 * Signal tracking the last used AI provider for new AI cells
 * Helps maintain user preference across cell creations
 */
export const lastUsedAiProvider$ = signal<string | null>(null, {
  label: "lastUsedAiProvider$",
});
