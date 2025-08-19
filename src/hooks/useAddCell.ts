import { useCallback } from "react";
import { useStore, useQuery } from "@livestore/react";
import { useAuthenticatedUser } from "../components/auth/AuthProvider.js";
import { useAvailableAiModels } from "@/util/ai-models.js";
import { events, queries, createCellBetween } from "@/schema";
import { focusedCellSignal$ } from "@/components/notebook/signals/focus.js";
import {
  lastUsedAiModel$,
  lastUsedAiProvider$,
} from "@/components/notebook/signals/ai-context.js";
import { getDefaultAiModel } from "@/util/ai-models.js";

export const useAddCell = () => {
  const { store } = useStore();
  const {
    user: { sub: userId },
  } = useAuthenticatedUser();
  const { models } = useAvailableAiModels();
  const cellReferences = useQuery(queries.cellsWithIndices$);
  const lastUsedAiModel = useQuery(lastUsedAiModel$);
  const lastUsedAiProvider = useQuery(lastUsedAiProvider$);

  const addCell = useCallback(
    (
      cellId?: string,
      cellType: "code" | "markdown" | "sql" | "ai" = "code",
      position: "before" | "after" = "after"
    ) => {
      const newCellId = `cell-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

      // Get default AI model if creating an AI cell
      let aiProvider, aiModel;
      if (cellType === "ai") {
        const defaultModel = getDefaultAiModel(
          models,
          lastUsedAiProvider,
          lastUsedAiModel
        );
        if (defaultModel) {
          aiProvider = defaultModel.provider;
          aiModel = defaultModel.model;
        }
      }

      let cellBefore = null;
      let cellAfter = null;

      if (cellId) {
        const targetIndex = cellReferences.findIndex((c) => c.id === cellId);
        if (targetIndex >= 0) {
          if (position === "before") {
            // Insert before the target cell
            cellAfter = cellReferences[targetIndex];
            cellBefore =
              targetIndex > 0 ? cellReferences[targetIndex - 1] : null;
          } else {
            // Insert after the target cell
            cellBefore = cellReferences[targetIndex];
            cellAfter =
              targetIndex < cellReferences.length - 1
                ? cellReferences[targetIndex + 1]
                : null;
          }
        }
      } else if (position === "after") {
        // No cellId specified, insert at the end
        cellBefore =
          cellReferences.length > 0
            ? cellReferences[cellReferences.length - 1]
            : null;
      }

      // Create cell using the schema API for fractional index calculation
      const cellCreationResult = createCellBetween(
        {
          id: newCellId,
          cellType,
          createdBy: userId,
        },
        cellBefore,
        cellAfter,
        cellReferences // Pass current cell state for rebalancing context
      );

      // Commit all events (may include automatic rebalancing)
      cellCreationResult.events.forEach((event) => store.commit(event));

      // Set default AI model for AI cells based on last used model
      if (cellType === "ai" && aiProvider && aiModel) {
        store.commit(
          events.aiSettingsChanged({
            cellId: newCellId,
            provider: aiProvider,
            model: aiModel,
            settings: {
              temperature: 0.7,
              maxTokens: 1000,
            },
          })
        );
      }

      // Focus the new cell after creation
      setTimeout(() => store.setSignal(focusedCellSignal$, newCellId), 0);

      return newCellId;
    },
    [cellReferences, store, userId, models, lastUsedAiModel, lastUsedAiProvider]
  );

  return { addCell };
};
