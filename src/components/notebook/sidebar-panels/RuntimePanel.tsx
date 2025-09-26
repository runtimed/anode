import React, { useCallback, useState } from "react";
import { RuntimeHealthIndicator } from "@/components/notebook/RuntimeHealthIndicator";
import { useRuntimeHealth } from "@/hooks/useRuntimeHealth";
import { getRuntimeCommand } from "@/util/runtime-command";
import { Button } from "@/components/ui/button";
import { Copy, Trash2, Globe } from "lucide-react";
import { events, tables } from "@runtimed/schema";
import { queryDb } from "@runtimed/schema";
import { useQuery, useStore } from "@livestore/react";
import type { SidebarPanelProps } from "./types";
import { useAuthenticatedUser } from "@/auth";

export const RuntimePanel: React.FC<SidebarPanelProps> = ({ notebook }) => {
  const { store } = useStore();
  const { hasActiveRuntime, activeRuntime } = useRuntimeHealth();
  const userId = useAuthenticatedUser();
  const [isLaunchingLocal, setIsLaunchingLocal] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const activeRuntimeSessions = useQuery(
    queryDb(tables.runtimeSessions.select().where("isActive", "=", true))
  );

  const clearAllRuntimes = useCallback(() => {
    const activeExecutions = store.query(
      queryDb(
        tables.executionQueue
          .select("id", "cellId")
          // We need to select for status IN pending, assigned, executing
          // but LiveStore only supports AND for where clauses with this ORM
          // so we'll look for the other events
          .where("status", "!=", "completed")
          .where("status", "!=", "cancelled")
          .where("status", "!=", "failed")
      )
    );

    activeExecutions.forEach((execution) => {
      store.commit(
        events.executionCancelled({
          queueId: execution.id,
          cellId: execution.cellId,
          cancelledBy: userId,
          reason: "Cleared via UI",
        })
      );
    });

    // Terminate all active runtime sessions
    activeRuntimeSessions.forEach((session) => {
      store.commit(
        events.runtimeSessionTerminated({
          sessionId: session.sessionId,
          // TODO: perhaps we should have another reason for this kind...
          reason: "displaced",
        })
      );
    });
  }, [activeRuntimeSessions, store, userId]);

  const launchLocalHtmlRuntime = useCallback(async () => {
    try {
      setIsLaunchingLocal(true);
      setLocalError(null);

      if (!window.__RUNT_LAUNCHER__) {
        throw new Error("Console launcher not available");
      }

      // Use existing store connection
      window.__RUNT_LAUNCHER__.useExistingStore(store);

      // Launch the HTML runtime
      await window.__RUNT_LAUNCHER__.launchHtmlAgent();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to launch runtime";
      setLocalError(message);
      console.error("Local runtime launch failed:", err);
    } finally {
      setIsLaunchingLocal(false);
    }
  }, [store]);

  const stopLocalRuntime = useCallback(async () => {
    try {
      setLocalError(null);

      if (!window.__RUNT_LAUNCHER__) {
        throw new Error("Console launcher not available");
      }

      await window.__RUNT_LAUNCHER__.shutdown();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to stop runtime";
      setLocalError(message);
      console.error("Local runtime stop failed:", err);
    }
  }, []);

  const isLocalRuntime = useCallback(() => {
    if (!activeRuntime || !window.__RUNT_LAUNCHER__) {
      return false;
    }
    const status = window.__RUNT_LAUNCHER__.getStatus();
    return status.hasAgent && status.sessionId === activeRuntime.sessionId;
  }, [activeRuntime]);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-3 text-sm font-medium text-gray-700">
          Runtime Status
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Connection</span>
            <RuntimeHealthIndicator showStatus />
          </div>
          {hasActiveRuntime && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Type</span>
              <span className="font-mono text-xs">
                {activeRuntime?.runtimeType ?? "unknown"}
              </span>
            </div>
          )}
        </div>
      </div>

      {hasActiveRuntime && activeRuntime && (
        <div className="border-t pt-4">
          <h4 className="mb-2 text-xs font-medium text-gray-700">
            Runtime Details
          </h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Session:</span>
              <code className="rounded bg-gray-100 px-1 text-xs">
                {activeRuntime.sessionId.slice(-8)}
              </code>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
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
            {isLocalRuntime() && (
              <div className="mt-2 border-t pt-2">
                <Button
                  onClick={stopLocalRuntime}
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                >
                  Stop Local Runtime
                </Button>
                {localError && (
                  <p className="mt-1 text-xs text-red-600">{localError}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!hasActiveRuntime && (
        <div className="border-t pt-4">
          <div className="space-y-3">
            <div>
              <h4 className="mb-2 text-xs font-medium text-gray-700">
                Start Runtime
              </h4>
              <p className="mb-2 text-xs text-gray-500">
                Set RUNT_API_KEY in your environment, then run:
              </p>
            </div>

            <RuntimeCodeBlock notebookId={notebook.id} />

            <p className="text-xs text-gray-500">
              Each notebook needs its own runtime instance.
            </p>
          </div>

          <div className="mt-3 border-t pt-3">
            <div className="space-y-3">
              <div>
                <h4 className="mb-2 text-xs font-medium text-gray-700">
                  Local Runtime
                </h4>
                <p className="mb-2 text-xs text-gray-500">
                  Run HTML directly in your browser
                </p>
              </div>

              <Button
                onClick={launchLocalHtmlRuntime}
                disabled={isLaunchingLocal}
                size="sm"
                className="flex w-full items-center gap-1"
              >
                <Globe className="h-3 w-3" />
                {isLaunchingLocal ? "Starting..." : "Launch HTML Runtime"}
              </Button>

              {localError && (
                <p className="text-xs text-red-600">{localError}</p>
              )}

              <p className="text-xs text-gray-400">
                Limited capabilities. Other users will see "Local (You)".
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Show clear all button if there are any runtime sessions */}
      {activeRuntimeSessions.length > 0 && (
        <div className="border-t pt-4">
          <div className="space-y-3">
            <div>
              <h4 className="mb-2 text-xs font-medium text-gray-700">
                Runtime Management
              </h4>
              <p className="mb-2 text-xs text-gray-500">
                {activeRuntimeSessions.length} active runtime session
                {activeRuntimeSessions.length !== 1 ? "s" : ""}
              </p>
              <p className="mb-2 text-xs text-gray-400">
                This will terminate all runtimes and cancel any running
                executions.
              </p>
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={clearAllRuntimes}
              className="flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              <span>Clear All Runtimes</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export const RuntimeCodeBlock = ({ notebookId }: { notebookId: string }) => {
  const runtimeCommand = getRuntimeCommand(notebookId);

  const copyRuntimeCommand = useCallback(() => {
    navigator.clipboard.writeText(runtimeCommand);
  }, [runtimeCommand]);

  return (
    <div className="rounded bg-slate-900 p-2">
      <div className="flex items-start gap-2">
        <code className="flex-1 overflow-x-auto font-mono text-xs break-all whitespace-pre-wrap text-slate-100">
          {runtimeCommand}
        </code>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyRuntimeCommand}
          className="h-6 w-6 shrink-0 p-0 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
          title="Copy command"
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};
