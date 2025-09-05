import { Button } from "@/components/ui/button";
import { useRuntimeHealth } from "@/hooks/useRuntimeHealth.js";
import { events, tables } from "@/schema";
import { getRuntimeCommand } from "@/util/runtime-command.js";
import { queryDb } from "@livestore/livestore";
import { useQuery, useStore } from "@livestore/react";
import { Copy, Square } from "lucide-react";
import React, { useCallback } from "react";
import { useAuthenticatedUser } from "../../auth/index.js";
import { RuntimeHealthIndicator } from "./RuntimeHealthIndicator.js";

interface RuntimeHelperProps {
  showRuntimeHelper: boolean;
  onClose: () => void;
  notebookId: string;
}

export const RuntimeHelper: React.FC<RuntimeHelperProps> = ({
  showRuntimeHelper,
  onClose,
  notebookId,
}) => {
  const { store } = useStore();
  const userId = useAuthenticatedUser();
  const { activeRuntime, hasActiveRuntime, runningExecutions } =
    useRuntimeHealth();

  const runtimeSessions = useQuery(
    queryDb(tables.runtimeSessions.select().where({ isActive: true }))
  );

  const runtimeCommand = getRuntimeCommand(notebookId);

  const copyRuntimeCommand = useCallback(() => {
    navigator.clipboard.writeText(runtimeCommand);
    // Could add a toast notification here
  }, [runtimeCommand]);

  const interruptAllExecutions = useCallback(async () => {
    // Cancel each running execution (already filtered by SQL query)
    for (const execution of runningExecutions) {
      store.commit(
        events.executionCancelled({
          queueId: execution.id,
          cellId: execution.cellId,
          cancelledBy: userId,
          reason: "User interrupted all executions from runtime UI",
        })
      );
    }
  }, [runningExecutions, store, userId]);

  // Only show when explicitly requested
  if (!showRuntimeHelper) return null;

  return (
    <div className="bg-card border-t">
      <div className="w-full px-3 py-3">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-xs font-medium">
            Runtime Details
            <RuntimeHealthIndicator showStatus />
          </h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-5 w-5 p-0"
          >
            ×
          </Button>
        </div>

        {!hasActiveRuntime && (
          <>
            <p className="text-muted-foreground mb-2 text-xs">
              Set RUNT_API_KEY in your environment, then run:
            </p>
            <div className="mb-2 rounded bg-slate-900 p-2">
              <div className="flex items-center gap-1">
                <code className="flex-1 overflow-x-auto font-mono text-xs text-slate-100">
                  {runtimeCommand}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyRuntimeCommand}
                  className="h-6 w-6 p-0 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              Each notebook needs its own runtime instance.
            </p>
          </>
        )}

        {hasActiveRuntime && activeRuntime && (
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Session:</span>
              <code className="bg-muted rounded px-1 text-xs">
                {activeRuntime.sessionId.slice(-8)}
              </code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-mono">{activeRuntime.runtimeType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span
                className={`text-xs font-medium ${
                  activeRuntime.status === "ready"
                    ? "text-green-600"
                    : activeRuntime.status === "busy"
                      ? "text-amber-600"
                      : "text-red-600"
                }`}
              >
                {activeRuntime.status === "ready"
                  ? "Ready"
                  : activeRuntime.status === "busy"
                    ? "Busy"
                    : activeRuntime.status.charAt(0).toUpperCase() +
                      activeRuntime.status.slice(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Capabilities:</span>
              <div className="flex gap-1">
                {activeRuntime.canExecuteCode && (
                  <span className="rounded bg-blue-100 px-1 text-xs text-blue-800">
                    Code
                  </span>
                )}
                {activeRuntime.canExecuteSql && (
                  <span className="rounded bg-purple-100 px-1 text-xs text-purple-800">
                    SQL
                  </span>
                )}
                {activeRuntime.canExecuteAi && (
                  <span className="rounded bg-green-100 px-1 text-xs text-green-800">
                    AI
                  </span>
                )}
              </div>
            </div>

            {/* Interrupt Button */}
            {runningExecutions.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Running Executions: {runningExecutions.length}
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={interruptAllExecutions}
                    className="flex items-center gap-1"
                  >
                    <Square className="h-3 w-3" />
                    <span>Interrupt All</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Show all runtime sessions for debugging */}
        {runtimeSessions.length > 1 && (
          <div className="mt-4 border-t pt-4">
            <h5 className="text-muted-foreground mb-2 text-xs font-medium">
              All Sessions:
            </h5>
            <div className="space-y-1">
              {runtimeSessions.map((session: any) => (
                <div
                  key={session.sessionId}
                  className="flex items-center justify-between text-xs"
                >
                  <code className="bg-muted rounded px-1">
                    {session.sessionId.slice(-8)}
                  </code>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1 ${
                        session.status === "ready"
                          ? "bg-green-100 text-green-800"
                          : session.status === "busy"
                            ? "bg-amber-100 text-amber-800"
                            : session.status === "terminated"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {session.status}
                    </span>
                    {session.status && (
                      <span className="text-muted-foreground">
                        Status: {session.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
