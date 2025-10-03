import {
  lastUsedAiModel$,
  lastUsedAiProvider$,
} from "@/components/notebook/signals/ai-context.js";
import { focusedCellSignal$ } from "@/components/notebook/signals/focus.js";
import { getDefaultAiModel, useAvailableAiModels } from "@/util/ai-models.js";
import { useStore } from "@livestore/react";
import { CellType, createCellBetween, events, queries } from "@runtimed/schema";
import { useCallback } from "react";
import { useAuthenticatedUser } from "../auth/index.js";

export const useAddCell = () => {
  const { store } = useStore();
  const userId = useAuthenticatedUser();
  const { models } = useAvailableAiModels();

  const addCell = useCallback(
    (
      cellId?: string,
      cellType: CellType = "code",
      position: "before" | "after" = "after",
      source?: string
    ) => {
      const cellReferences = store.query(queries.cellsWithIndices$);
      const newCellId = `cell-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

      // Get default AI model if creating an AI cell
      let aiProvider, aiModel;
      if (cellType === "ai") {
        const lastUsedAiModel = store.query(lastUsedAiModel$);
        const lastUsedAiProvider = store.query(lastUsedAiProvider$);
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

      if (source) {
        // set cell source
        store.commit(
          events.cellSourceChanged({
            id: newCellId,
            source,
            modifiedBy: userId,
          })
        );

        // hide cell input
        store.commit(
          events.cellSourceVisibilityToggled({
            id: newCellId,
            sourceVisible: false,
            actorId: userId,
          })
        );

        // run cell
        store.commit(
          events.executionRequested({
            cellId: newCellId,
            actorId: userId,
            requestedBy: userId,
            queueId: `exec-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            executionCount:
              store.query(queries.cellQuery.byId(newCellId))?.executionCount ||
              0 + 1,
          })
        );
      }

      // Focus the new cell after creation
      setTimeout(() => store.setSignal(focusedCellSignal$, newCellId), 0);

      return newCellId;
    },
    [store, userId, models]
  );

  return { addCell };
};
