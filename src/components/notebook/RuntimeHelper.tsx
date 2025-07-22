import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useRuntimeHealth } from "@/hooks/useRuntimeHealth.js";
import { useStore } from "@livestore/react";
import { events } from "@runt/schema";
import { useCurrentUserId } from "@/hooks/useCurrentUser.js";
import { getRuntimeCommand } from "@/util/runtime-command.js";
import { getCurrentNotebookId } from "@/util/store-id.js";
import { Copy, Square } from "lucide-react";
import { RuntimeHealthIndicator } from "./RuntimeHealthIndicator.js";

interface RuntimeHelperProps {
  showRuntimeHelper: boolean;
  onClose: () => void;
  runtimeSessions: any[];
}

export const RuntimeHelper: React.FC<RuntimeHelperProps> = ({
  showRuntimeHelper,
  onClose,
  runtimeSessions,
}) => {
  const { store } = useStore();
  const currentUserId = useCurrentUserId();
  const { activeRuntime, hasActiveRuntime, runningExecutions } =
    useRuntimeHealth();

  const currentNotebookId = getCurrentNotebookId();
  const runtimeCommand = getRuntimeCommand(currentNotebookId);

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
          cancelledBy: currentUserId,
          reason: "User interrupted all executions from runtime UI",
        })
      );
    }
  }, [runningExecutions, store, currentUserId]);

  if (!showRuntimeHelper) return null;

  return (
    <div className="bg-card border-t">
      <div className="w-full px-3 py-4 sm:mx-auto sm:max-w-6xl sm:px-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-medium">
            Runtime Status
            <RuntimeHealthIndicator showStatus />
          </h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            ×
          </Button>
        </div>

        {!hasActiveRuntime && (
          <>
            <p className="text-muted-foreground mb-3 text-sm">
              Run this command in your terminal to start a runtime for notebook{" "}
              <code className="bg-muted rounded px-1">{currentNotebookId}</code>
              :
            </p>
            <div className="flex items-center gap-2 rounded bg-slate-900 p-3 font-mono text-sm text-slate-100">
              <span className="flex-1">{runtimeCommand}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyRuntimeCommand}
                className="h-8 w-8 p-0 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-muted-foreground mt-2 text-xs">
              Note: Each notebook requires its own runtime instance. The runtime
              will connect automatically once started.
            </p>
          </>
        )}

        {hasActiveRuntime && activeRuntime && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Session ID:</span>
              <code className="bg-muted rounded px-1 text-xs">
                {activeRuntime.sessionId}
              </code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Runtime Type:</span>
              <span>{activeRuntime.runtimeType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span
                className={`font-medium ${
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
            {activeRuntime.status && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Heartbeat:</span>
                <span className="flex items-center gap-1 text-xs">
                  Status: {activeRuntime.status}
                </span>
              </div>
            )}
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
