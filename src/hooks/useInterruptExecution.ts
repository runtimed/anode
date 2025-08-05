import { useCallback } from "react";
import { useStore, useQuery } from "@livestore/react";
import { queryDb } from "@livestore/livestore";
import { events, tables } from "@runt/schema";

interface UseInterruptExecutionOptions {
  cellId: string;
  userId: string;
  reason?: string;
}

export function useInterruptExecution({
  cellId,
  userId,
  reason = "User interrupted execution",
}: UseInterruptExecutionOptions) {
  const { store } = useStore();

  // Query execution queue for this cell
  const executionQueue = useQuery(
    queryDb(tables.executionQueue.select().where({ cellId }))
  );

  const interruptExecution = useCallback(() => {
    // Find the current execution in the queue for this cell
    const currentExecution = executionQueue.find(
      (exec: any) =>
        exec.status === "executing" ||
        exec.status === "pending" ||
        exec.status === "assigned"
    );

    if (currentExecution) {
      store.commit(
        events.executionCancelled({
          queueId: currentExecution.id,
          cellId,
          cancelledBy: userId,
          reason,
        })
      );
    }
  }, [cellId, store, userId, executionQueue, reason]);

  return {
    interruptExecution,
    hasActiveExecution: executionQueue.some(
      (exec: any) =>
        exec.status === "executing" ||
        exec.status === "pending" ||
        exec.status === "assigned"
    ),
  };
}
