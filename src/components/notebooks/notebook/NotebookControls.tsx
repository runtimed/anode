import { useAuthenticatedUser } from "@/auth/index.js";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useRuntimeHealth } from "@/hooks/useRuntimeHealth";
import { useHideAiCells } from "@/hooks/useHideAiCells";
import { useQuery, useStore } from "@livestore/react";
import { events, queries, queryDb, tables } from "@runtimed/schema";
import {
  Bot,
  Eraser,
  MoreHorizontal,
  Play,
  Square,
  Trash,
  Undo2,
} from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";
import { generateQueueId } from "@/util/queue-id";

export function NotebookControls() {
  const { confirm } = useConfirm();
  const { store } = useStore();

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
  const { clearAllOutputs } = useClearAllOutputs();
  const { restartAndRunAllCells } = useRestartAndRunAllCells();
  const { hideAiCells, toggleHideAiCells } = useHideAiCells();

  const handleCancelAll = useCallback(() => {
    if (cellQueue.length === 0) {
      toast.info("No cells to stop");
      return;
    }
    toast.info("Cancelling all executions");
    store.commit(events.cancelAllExecutions());
  }, [store, cellQueue]);

  const showBadge = cellQueue.length > 0 || hideAiCells;

  return (
    <div className="flex items-center gap-1">
      {cellQueue.length > 0 && (
        <Button variant="outline" size="sm" onClick={handleCancelAll}>
          <Square className="mr-2 h-4 w-4" />
          Stop All
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <MoreHorizontal className="h-4 w-4" />
            {showBadge && (
              <div className="absolute top-1 right-1 size-2 rounded-full bg-blue-500 text-white" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {cellQueue.length > 0 ? (
            <DropdownMenuItem onClick={handleCancelAll}>
              <Square className="mr-2 h-4 w-4" />
              Stop All
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem onClick={runAllCells}>
                <Play className="mr-2 h-4 w-4" />
                Run All Cells
              </DropdownMenuItem>
              <DropdownMenuItem onClick={restartAndRunAllCells}>
                <span className="relative mr-2">
                  <Play className="h-4 w-4" />
                  <Undo2
                    className="absolute bottom-0 left-0 size-3 -translate-x-[3px] translate-y-[3px] rounded-full bg-white p-[1px] text-gray-700"
                    strokeWidth={3}
                  />
                </span>
                Restart and Run All Cells
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
            <label>
              <Bot className="mr-2 h-4 w-4" />
              <div className="flex flex-grow flex-col">
                Hide AI Cells (experimental)
                <div className="text-xs text-gray-500">
                  Some features may not work as expected
                </div>
              </div>
              <Switch
                checked={hideAiCells}
                onCheckedChange={toggleHideAiCells}
              />
            </label>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={clearAllOutputs}>
            <Eraser className="mr-2 h-4 w-4" />
            Clear All Outputs
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              confirm({
                title: "Delete All Cells",
                description: "Are you sure you want to delete all cells?",
                onConfirm: deleteAllCells,
                actionButtonText: "Delete All Cells",
              })
            }
            className="text-red-600 focus:text-red-600"
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete All Cells
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
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

function useClearAllOutputs() {
  const { store } = useStore();
  const cells = useQuery(queries.cellsWithIndices$);
  const userId = useAuthenticatedUser();

  const clearAllOutputs = useCallback(() => {
    store.commit(
      events.multipleCellOutputsCleared({
        clearedBy: userId,
        cellsInfo: cells.map((cell) => ({
          cellId: cell.id,
        })),
        wait: false,
      })
    );
  }, [store, userId, cells]);

  return { clearAllOutputs };
}
