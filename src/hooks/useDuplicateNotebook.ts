import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useStore } from "@livestore/react";
import {
  createCellBetween,
  events,
  tables,
  type CellData,
  type CellReference,
} from "@runtimed/schema";
import {
  createStorePromise,
  createRuntimeSyncPayload,
} from "@runtimed/agent-core";
import { useTrpc } from "../components/TrpcProvider.js";
import { getNotebookVanityUrl } from "../util/url-utils.js";
import { useAuthenticatedUser } from "../auth/index.js";
import { sharedLiveStoreAdapter } from "../livestore/adapter.js";
import { useAuth } from "../auth/index.js";
import { toast } from "sonner";

/**
 * Hook for duplicating a notebook with all its cells and outputs
 *
 * This hook:
 * 1. Creates a new notebook via the backend API
 * 2. Queries all cells from the source notebook
 * 3. Creates corresponding cells in the new notebook with the same content
 * 4. Copies outputs, preserving artifact references
 * 5. Navigates to the new notebook
 */
export function useDuplicateNotebook() {
  const { store: sourceStore } = useStore();
  const navigate = useNavigate();
  const trpc = useTrpc();
  const userId = useAuthenticatedUser();
  const { accessToken } = useAuth();

  // Create notebook mutation
  const createNotebookMutation = useMutation(
    trpc.createNotebook.mutationOptions()
  );

  const duplicateNotebook = useCallback(
    async (sourceTitle: string) => {
      try {
        // Step 1: Create new notebook
        const newNotebookTitle = `${sourceTitle} (Copy)`;
        const result = await createNotebookMutation.mutateAsync({
          title: newNotebookTitle,
        });

        if (!result) {
          throw new Error("Failed to create new notebook");
        }

        // Step 2: Get all cells from source notebook
        const sourceCells = sourceStore.query(
          tables.cells.select().orderBy("fractionalIndex", "asc")
        );

        if (sourceCells.length === 0) {
          // No cells to duplicate, just navigate to the new notebook
          navigate(getNotebookVanityUrl(result.id, result.title), {
            state: { initialNotebook: result },
          });
          return;
        }

        // Step 3: Create a new store for the duplicated notebook
        const runtimeId = `duplicate-${crypto.randomUUID()}`;
        const sessionId = `${runtimeId}-${Date.now()}`;

        const syncPayload = createRuntimeSyncPayload({
          authToken: accessToken || "",
          runtimeId,
          sessionId,
          userId,
        });

        const newStore = await createStorePromise({
          adapter: sharedLiveStoreAdapter,
          notebookId: result.id,
          syncPayload,
        });

        // Step 4: Create cells in the new store
        const cellIdMapping = new Map<string, string>();
        const newCells: Array<{ cell: CellData; outputs: any[] }> = [];

        // First pass: collect all cell data and outputs
        for (const sourceCell of sourceCells) {
          const newCellId = `cell-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          cellIdMapping.set(sourceCell.id, newCellId);

          // Get outputs for this cell
          const outputs = sourceStore.query(
            tables.outputs
              .select()
              .where({ cellId: sourceCell.id })
              .orderBy("position", "asc")
          );

          newCells.push({
            cell: {
              ...sourceCell,
              id: newCellId,
              createdBy: userId,
              // Reset execution-related fields
              executionCount: 0,
            },
            outputs: [...outputs],
          });
        }

        // Second pass: create cells in the new store
        let cellBefore: CellReference | null = null;

        for (const { cell, outputs } of newCells) {
          // Create the cell using the fractional indexing system
          const cellCreationResult = createCellBetween(
            {
              id: cell.id,
              cellType: cell.cellType,
              createdBy: userId,
            },
            cellBefore,
            null, // Insert at end for now
            [] // Empty cell list for initial creation
          );

          // Commit the cell creation event to the new store
          cellCreationResult.events.forEach((event) => newStore.commit(event));

          // Set the cell source if it exists
          if (cell.source && cell.source.trim()) {
            newStore.commit(
              events.cellSourceChanged({
                id: cell.id,
                source: cell.source,
                modifiedBy: userId,
              })
            );
          }

          // Copy outputs, preserving artifact references
          for (const output of outputs) {
            const newOutputId = `output-${Date.now()}-${Math.random().toString(36).slice(2)}`;

            // Commit the appropriate output event based on output type
            switch (output.outputType) {
              case "terminal_output":
                newStore.commit(
                  events.terminalOutputAdded({
                    id: newOutputId,
                    cellId: cell.id,
                    position: output.position,
                    content: output.data,
                    streamName: output.streamName,
                  })
                );
                break;

              case "multimedia_display":
                newStore.commit(
                  events.multimediaDisplayOutputAdded({
                    id: newOutputId,
                    cellId: cell.id,
                    position: output.position,
                    representations: output.representations || {},
                    displayId: output.displayId,
                  })
                );
                break;

              case "multimedia_result":
                newStore.commit(
                  events.multimediaResultOutputAdded({
                    id: newOutputId,
                    cellId: cell.id,
                    position: output.position,
                    representations: output.representations || {},
                    executionCount: 0, // Reset execution count
                  })
                );
                break;

              case "markdown_output":
                newStore.commit(
                  events.markdownOutputAdded({
                    id: newOutputId,
                    cellId: cell.id,
                    position: output.position,
                    content: output.data,
                  })
                );
                break;

              case "error_output":
                newStore.commit(
                  events.errorOutputAdded({
                    id: newOutputId,
                    cellId: cell.id,
                    position: output.position,
                    content: output.data,
                  })
                );
                break;

              default:
                console.warn(`Unknown output type: ${output.outputType}`);
            }
          }

          // Update cellBefore for next iteration
          cellBefore = {
            id: cell.id,
            fractionalIndex: cell.fractionalIndex,
            cellType: cell.cellType,
          };
        }

        // Step 5: Navigate to the new notebook
        window.location.assign(getNotebookVanityUrl(result.id, result.title));
      } catch (error) {
        console.error("Failed to duplicate notebook:", error);
        toast.error("Failed to duplicate notebook");
        throw error;
      }
    },
    [sourceStore, navigate, userId, accessToken, createNotebookMutation]
  );

  return {
    duplicateNotebook,
    isDuplicating: createNotebookMutation.isPending,
  };
}
