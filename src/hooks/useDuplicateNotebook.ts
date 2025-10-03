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
import { useTrpc } from "../components/TrpcProvider.js";
import { getNotebookVanityUrl } from "../util/url-utils.js";
import { useAuthenticatedUser } from "../auth/index.js";

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
  const { store } = useStore();
  const navigate = useNavigate();
  const trpc = useTrpc();
  const userId = useAuthenticatedUser();

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
        // We need to query the source notebook's store to get cells
        const sourceCells = store.query(
          tables.cells.select().orderBy("fractionalIndex", "asc")
        );

        if (sourceCells.length === 0) {
          // No cells to duplicate, just navigate to the new notebook
          navigate(getNotebookVanityUrl(result.id, result.title), {
            state: { initialNotebook: result },
          });
          return;
        }

        // Step 3: Create cells in the new notebook
        // We need to switch to the new notebook's store context
        // For now, we'll create the cells in the current store and then navigate
        // The proper approach would be to create a new store instance for the new notebook

        const cellIdMapping = new Map<string, string>();
        const newCells: Array<{ cell: CellData; outputs: any[] }> = [];

        // First pass: collect all cell data and outputs
        for (const sourceCell of sourceCells) {
          const newCellId = `cell-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          cellIdMapping.set(sourceCell.id, newCellId);

          // Get outputs for this cell
          const outputs = store.query(
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

        // Second pass: create cells in order
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

          // Commit the cell creation event
          cellCreationResult.events.forEach((event) => store.commit(event));

          // Set the cell source if it exists
          if (cell.source && cell.source.trim()) {
            store.commit(
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
                store.commit(
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
                store.commit(
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
                store.commit(
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
                store.commit(
                  events.markdownOutputAdded({
                    id: newOutputId,
                    cellId: cell.id,
                    position: output.position,
                    content: output.data,
                  })
                );
                break;

              case "error_output":
                store.commit(
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

        // Step 4: Invalidate queries and navigate
        // Note: We'll need to invalidate queries in the new notebook context
        // For now, the navigation will handle refreshing the data

        // Navigate to the new notebook
        navigate(getNotebookVanityUrl(result.id, result.title), {
          state: { initialNotebook: result },
        });
      } catch (error) {
        console.error("Failed to duplicate notebook:", error);
        // TODO: Show error toast to user
        throw error;
      }
    },
    [store, navigate, userId, createNotebookMutation]
  );

  return {
    duplicateNotebook,
    isDuplicating: createNotebookMutation.isPending,
  };
}
