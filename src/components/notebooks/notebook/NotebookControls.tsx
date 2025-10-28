import { useTrpc } from "@/components/TrpcProvider";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDuplicateNotebook } from "@/hooks/useDuplicateNotebook";
import { useMutation } from "@tanstack/react-query";
import { CopyPlus, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCreateNotebookAndNavigate } from "../dashboard/helpers";
import type { NotebookProcessed } from "../types";

import { useAuthenticatedUser } from "@/auth/index.js";
import { Spinner } from "@/components/ui/Spinner";
import { useRuntimeHealth } from "@/hooks/useRuntimeHealth";
import { generateQueueId } from "@/util/queue-id";
import { useQuery, useStore } from "@livestore/react";
import { events, queries, queryDb, tables } from "@runtimed/schema";
import { Eraser, Play, Square, Undo2 } from "lucide-react";
import { useCallback } from "react";
import { useDebug } from "@/components/debug/debug-mode";

export function NotebookControls({
  notebook,
}: {
  notebook: NotebookProcessed;
}) {
  const { confirm } = useConfirm();
  const { store } = useStore();
  const userId = useAuthenticatedUser();
  const debug = useDebug();

  const cellQueue = useQuery(
    queryDb(
      tables.cells
        .select()
        .where({ executionState: { op: "IN", value: ["running", "queued"] } })
        .orderBy("fractionalIndex", "asc")
    )
  );

  const { runAllCells } = useRunAllCells();
  const { deleteAllCells } = useDeleteAllCells();
  const { restartAndRunAllCells } = useRestartAndRunAllCells();

  const handleCancelAll = useCallback(() => {
    if (cellQueue.length === 0) {
      toast.info("No cells to stop");
      return;
    }
    store.commit(events.allExecutionsCancelled());
    toast.info("Cancelled all executions");
  }, [store, cellQueue]);

  const handleClearAll = useCallback(() => {
    store.commit(events.allOutputsCleared({ clearedBy: userId }));
  }, [store, userId]);

  return (
    <div className="flex items-center gap-2">
      {cellQueue.length > 0 && (
        <>
          <span className="flex items-center gap-1">
            <Spinner size="md" />
            <span className="text-muted-foreground text-sm">
              Running {cellQueue.length} cells
            </span>
          </span>
          <Button variant="outline" size="sm" onClick={handleCancelAll}>
            <Square />
            Stop All
          </Button>
        </>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {cellQueue.length > 0 ? (
            <DropdownMenuItem onClick={handleCancelAll}>
              <Square />
              Stop All
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem onClick={runAllCells}>
                <Play />
                Run All Code Cells
              </DropdownMenuItem>
              <DropdownMenuItem onClick={restartAndRunAllCells}>
                <span className="relative">
                  <Play className="h-4 w-4" />
                  <Undo2
                    className="absolute bottom-0 left-0 size-3 -translate-x-[3px] translate-y-[3px] rounded-full bg-white p-[1px] text-gray-700"
                    strokeWidth={3}
                  />
                </span>
                Restart and Run All Code Cells
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem onClick={handleClearAll}>
            <Eraser />
            Clear All Outputs
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <CreateNotebookAction />
          <DuplicateAction notebook={notebook} />
          <DropdownMenuSeparator />
          {debug.enabled && (
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                confirm({
                  title: "Delete All Cells",
                  description: "Are you sure you want to delete all cells?",
                  onConfirm: deleteAllCells,
                  actionButtonText: "Delete All Cells",
                })
              }
            >
              <Trash2 />
              DEBUG: Delete All Cells
            </DropdownMenuItem>
          )}
          <DeleteAction notebook={notebook} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function CreateNotebookAction() {
  const createNotebookAndNavigate = useCreateNotebookAndNavigate();

  return (
    <DropdownMenuItem onSelect={createNotebookAndNavigate}>
      <Plus />
      Create New Notebook
    </DropdownMenuItem>
  );
}

function DuplicateAction({ notebook }: { notebook: NotebookProcessed }) {
  const { duplicateNotebook, isDuplicating } = useDuplicateNotebook();
  const { confirm } = useConfirm();

  const handleDuplicateNotebook = async () => {
    confirm({
      title: "Duplicate Notebook",
      description: `Please confirm that you want to duplicate "${notebook.title || "Untitled Notebook"}".`,
      onConfirm: handleDuplicateNotebookConfirm,
      nonDestructive: true,
    });
  };

  const handleDuplicateNotebookConfirm = async () => {
    try {
      await duplicateNotebook(notebook.title || "Untitled Notebook");
    } catch (error) {
      toast.error("Failed to duplicate notebook");
    }
  };

  return (
    <DropdownMenuItem
      onSelect={handleDuplicateNotebook}
      disabled={isDuplicating}
    >
      <CopyPlus />
      {isDuplicating ? "Duplicating..." : "Duplicate Notebook"}
    </DropdownMenuItem>
  );
}

function DeleteAction({ notebook }: { notebook: NotebookProcessed }) {
  const trpc = useTrpc();
  const { confirm } = useConfirm();

  const navigate = useNavigate();

  // Delete notebook mutation
  const deleteNotebookMutation = useMutation(
    trpc.deleteNotebook.mutationOptions()
  );

  const handleDeleteNotebook = async () => {
    confirm({
      title: "Delete Notebook",
      description: `Please confirm that you want to delete "${notebook.title || "Untitled Notebook"}".`,
      onConfirm: handleDeleteConfirm,
    });
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteNotebookMutation.mutateAsync({
        nbId: notebook.id,
      });

      toast.success("Notebook deleted successfully");
      navigate("/nb");

      // Call onUpdate to refresh the notebook list
      // onUpdate?.();
    } catch (error) {
      console.error("Failed to delete notebook:", error);
      toast.error("Failed to delete notebook");
    }
  };

  return (
    <DropdownMenuItem variant="destructive" onSelect={handleDeleteNotebook}>
      <Trash2 />
      Delete Notebook
    </DropdownMenuItem>
  );
}

function useDeleteAllCells() {
  const { store } = useStore();
  const cells = useQuery(queries.cellsWithIndices$);
  const userId = useAuthenticatedUser();

  const deleteAllCells = useCallback(() => {
    cells.forEach((cell) => {
      store.commit(events.cellDeleted({ id: cell.id, actorId: userId }));
    });
  }, [cells, store, userId]);

  return { deleteAllCells };
}

function useRunAllCells() {
  const { store } = useStore();
  const cells = useQuery(queries.runnableCellsWithIndices$);
  const userId = useAuthenticatedUser();

  const runAllCells = useCallback(() => {
    store.commit(
      events.multipleExecutionRequested({
        requestedBy: userId,
        cellsInfo: [
          ...cells.map((cell) => ({
            id: cell.id,
            executionCount: (cell.executionCount || 0) + 1,
            queueId: generateQueueId(),
          })),
        ],
      })
    );
  }, [store, userId, cells]);

  return { runAllCells };
}

function useRestartAndRunAllCells() {
  const { hasActiveRuntime } = useRuntimeHealth();

  const restartAndRunAllCells = useCallback(() => {
    if (hasActiveRuntime) {
      toast.info("Restart your runtime manually and run all cells");
    } else {
      toast.error("No active runtime found");
    }
  }, [hasActiveRuntime]);

  return { restartAndRunAllCells };
}
