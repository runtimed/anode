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
import { useDebug } from "@/components/debug/debug-mode";
import { Spinner } from "@/components/ui/Spinner";
import { useFeatureFlag } from "@/contexts/FeatureFlagContext";
import { useRuntimeHealth } from "@/hooks/useRuntimeHealth";
import { runningCells$ } from "@/queries";
import { generateQueueId } from "@/util/queue-id";
import { useQuery, useStore } from "@livestore/react";
import { CellData, events, queries } from "@runtimed/schema";
import { Eraser, Play, Square, Undo2 } from "lucide-react";
import { useCallback } from "react";

export function NotebookControls({
  notebook,
}: {
  notebook: NotebookProcessed;
}) {
  const allowBulkNotebookControls = useFeatureFlag("bulk-notebook-controls");
  const { store } = useStore();
  const userId = useAuthenticatedUser();
  const debug = useDebug();

  const cellQueue = useQuery(runningCells$);

  const handleCancelAll = useCallback(() => {
    if (cellQueue.length === 0) {
      toast.info("No cells to stop");
      return;
    }
    store.commit(events.allExecutionsCancelled());
    toast.info("Cancelled all executions");
  }, [store, cellQueue]);

  const handleClearAllOutputs = useCallback(() => {
    store.commit(events.allOutputsCleared({ clearedBy: userId }));
  }, [store, userId]);

  return (
    <div className="flex items-center gap-2">
      {allowBulkNotebookControls && (
        <ActiveBulkNotebookActions
          cellQueue={cellQueue}
          onCancelAll={handleCancelAll}
        />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {allowBulkNotebookControls && (
            <BulkNotebookActions
              cellQueue={cellQueue}
              onCancelAll={handleCancelAll}
              onClearAllOutputs={handleClearAllOutputs}
            />
          )}
          <CreateNotebookAction />
          <DuplicateAction notebook={notebook} />
          <DropdownMenuSeparator />
          {debug.enabled && <DeleteAllCellsAction />}
          <DeleteAction notebook={notebook} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ActiveBulkNotebookActions({
  cellQueue,
  onCancelAll,
}: {
  cellQueue: readonly CellData[];
  onCancelAll: () => void;
}) {
  if (cellQueue.length === 0) {
    return null;
  }

  return (
    <>
      <span className="flex items-center gap-1">
        <Spinner size="md" />
        <span className="text-muted-foreground text-sm">
          Running {cellQueue.length} cells
        </span>
      </span>
      <Button variant="outline" size="sm" onClick={onCancelAll}>
        <Square />
        Stop All
      </Button>
    </>
  );
}

function BulkNotebookActions({
  cellQueue,
  onCancelAll,
  onClearAllOutputs,
}: {
  cellQueue: readonly CellData[];
  onCancelAll: () => void;
  onClearAllOutputs: () => void;
}) {
  const { runAllCells } = useRunAllCells();
  const { restartAndRunAllCells } = useRestartAndRunAllCells();

  return (
    <>
      {cellQueue.length > 0 ? (
        <DropdownMenuItem onClick={onCancelAll}>
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
      <DropdownMenuItem onClick={onClearAllOutputs}>
        <Eraser />
        Clear All Outputs
      </DropdownMenuItem>
      <DropdownMenuSeparator />
    </>
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

function DeleteAllCellsAction() {
  const { deleteAllCells } = useDeleteAllCells();
  const { confirm } = useConfirm();

  const handleDeleteAllCells = async () => {
    confirm({
      title: "Delete All Cells",
      description: "Are you sure you want to delete all cells?",
      onConfirm: deleteAllCells,
      actionButtonText: "Delete All Cells",
    });
  };
  return (
    <DropdownMenuItem variant="destructive" onSelect={handleDeleteAllCells}>
      <Trash2 />
      DEBUG: Delete All Cells
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
