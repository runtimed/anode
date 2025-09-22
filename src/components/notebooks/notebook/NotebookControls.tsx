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
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function NotebookControls() {
  const { confirm } = useConfirm();

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
  const { stopAllExecution } = useStopAllExecution();
  const { clearAllOutputs } = useClearAllOutputs();
  const { restartAndRunAllCells } = useRestartAndRunAllCells();
  const [showAICells, setShowAICells] = useState(false);

  const handleStopAll = useCallback(
    () => stopAllExecution(cellQueue.map((cell) => cell.id)),
    [stopAllExecution, cellQueue]
  );

  return (
    <div className="flex items-center gap-1">
      {cellQueue.length > 0 && (
        <Button variant="outline" size="sm" onClick={handleStopAll}>
          <Square className="mr-2 h-4 w-4" />
          Stop All
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {cellQueue.length > 0 ? (
            <DropdownMenuItem onClick={handleStopAll}>
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
              <div className="flex flex-grow items-center gap-2">
                Hide AI Cells
              </div>
              <Switch
                checked={showAICells}
                onCheckedChange={() => setShowAICells(!showAICells)}
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
  const cells = useQuery(queries.cellsWithIndices$);
  const userId = useAuthenticatedUser();

  const runAllCells = useCallback(() => {
    cells
      // We especially don't want to run AI cells
      .filter((cell) => cell.cellType === "code")
      .forEach((cell) => {
        store.commit(
          events.executionRequested({
            cellId: cell.id,
            executionCount: (cell.executionCount || 0) + 1,
            requestedBy: userId,
            actorId: userId,
            queueId: `exec-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          })
        );
      });
  }, [cells, store, userId]);

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

function useStopAllExecution() {
  const { store } = useStore();

  const userId = useAuthenticatedUser();

  const stopAllExecution = useCallback(
    (cellIds: string[]) => {
      for (const cellId of cellIds) {
        store.commit(
          events.executionCancelled({
            queueId: cellId,
            cellId: cellId,
            cancelledBy: userId,
            reason: "User interrupted execution",
          })
        );
      }
    },
    [store, userId]
  );

  return { stopAllExecution };
}

function useClearAllOutputs() {
  const { store } = useStore();
  const cells = useQuery(queries.cellsWithIndices$);
  const userId = useAuthenticatedUser();

  const clearAllOutputs = useCallback(() => {
    cells.forEach((cell) => {
      store.commit(
        events.cellOutputsCleared({
          cellId: cell.id,
          clearedBy: userId,
          wait: false,
        })
      );
    });
  }, [cells, store, userId]);

  return { clearAllOutputs };
}
