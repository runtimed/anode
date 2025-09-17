import React, { useCallback } from "react";
import { Copy, Play, Square, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { events, tables, queryDb } from "@runtimed/schema";
import { useQuery, useStore } from "@livestore/react";
import { useAuthenticatedUser } from "@/auth";
import { useHtmlRuntime } from "@/runtime/managers/HtmlRuntimeManager";
import { useRuntimeHealth } from "@/hooks/useRuntimeHealth";
import { getRuntimeCommand } from "@/util/runtime-command";
import type { SidebarPanelProps } from "./types";

export const RuntimePanel: React.FC<SidebarPanelProps> = ({ notebook }) => {
  const { store } = useStore();
  const userId = useAuthenticatedUser();
  const {
    runtimeState: htmlRuntimeState,
    startRuntime,
    stopRuntime,
  } = useHtmlRuntime();
  const { hasActiveRuntime, activeRuntime } = useRuntimeHealth();

  const activeRuntimeSessions = useQuery(
    queryDb(tables.runtimeSessions.select().where({ isActive: true }))
  );

  // Filter for external (non-HTML) runtime sessions
  const externalRuntimeSessions = activeRuntimeSessions.filter(
    (session) => session.runtimeType !== "html"
  );
  const hasExternalRuntime = externalRuntimeSessions.length > 0;
  const activeExternalRuntime = externalRuntimeSessions.find(
    (session) => session.status === "ready" || session.status === "busy"
  );

  const runtimeCommand = getRuntimeCommand(notebook.id);

  const copyRuntimeCommand = useCallback(() => {
    navigator.clipboard.writeText(runtimeCommand);
  }, [runtimeCommand]);

  const clearAllRuntimes = useCallback(async () => {
    console.log("🧹 Starting complete runtime and queue flush...");

    // Get all execution queue entries (regardless of status)
    const allExecutions = store.query(queryDb(tables.executionQueue.select()));
    console.log(`📊 Found ${allExecutions.length} total executions in queue`);

    // Cancel all non-completed executions
    const activeExecutions = allExecutions.filter(
      (exec) =>
        exec.status === "pending" ||
        exec.status === "assigned" ||
        exec.status === "executing"
    );

    console.log(`❌ Cancelling ${activeExecutions.length} active executions`);

    activeExecutions.forEach((execution) => {
      console.log(
        `  📝 Cancelling execution ${execution.id} (cell: ${execution.cellId}, status: ${execution.status})`
      );
      store.commit(
        events.executionCancelled({
          queueId: execution.id,
          cellId: execution.cellId,
          cancelledBy: userId,
          reason: "Queue flushed via UI",
        })
      );
    });

    // Stop HTML runtime if active
    if (htmlRuntimeState.isActive) {
      console.log("🛑 Stopping HTML runtime...");
      await stopRuntime();
    }

    // Terminate all runtime sessions
    console.log(
      `🔌 Terminating ${activeRuntimeSessions.length} runtime sessions`
    );
    activeRuntimeSessions.forEach((session) => {
      console.log(
        `  📡 Terminating session ${session.sessionId} (${session.runtimeType})`
      );
      store.commit(
        events.runtimeSessionTerminated({
          sessionId: session.sessionId,
          reason: "shutdown",
        })
      );
    });

    console.log("✅ Runtime and queue flush complete");
  }, [store, activeRuntimeSessions, userId, htmlRuntimeState, stopRuntime]);

  // Calculate total active runtimes (HTML runtime is already in activeRuntimeSessions)
  const totalRuntimes = activeRuntimeSessions.length;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          Runtime Selection
        </h3>
        <p className="mb-4 text-xs text-gray-500">
          Choose a runtime to execute your notebook cells
        </p>
      </div>

      {/* Runtime Cards */}
      <div className="space-y-3">
        {/* HTML Agent Card */}
        <Card
          className={`p-4 transition-all duration-200 ${
            htmlRuntimeState.isActive
              ? "border-green-200 bg-green-50 shadow-sm"
              : hasActiveRuntime
                ? "border-gray-200 bg-gray-50 opacity-60"
                : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div
                className={`mt-1 flex h-8 w-8 items-center justify-center rounded-lg ${
                  htmlRuntimeState.isActive
                    ? "bg-green-100 text-green-600"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                🌐
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900">
                  HTML Agent
                </h4>
                <p className="mt-1 text-xs text-gray-500">
                  Browser-based HTML rendering
                </p>
                {htmlRuntimeState.isActive && (
                  <div className="mt-2 flex items-center space-x-2 text-xs">
                    <div className="flex items-center space-x-1">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="text-green-700">Active</span>
                    </div>
                    <span className="text-gray-400">•</span>
                    <code className="rounded bg-green-100 px-1 text-green-700">
                      {htmlRuntimeState.runtimeId?.slice(-6)}
                    </code>
                  </div>
                )}
                {htmlRuntimeState.error && (
                  <div className="mt-2 text-xs text-red-600">
                    Error: {htmlRuntimeState.error}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {htmlRuntimeState.isActive ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={stopRuntime}
                  disabled={htmlRuntimeState.isStopping}
                  className="h-7 px-2"
                >
                  <Square className="mr-1 h-3 w-3" />
                  {htmlRuntimeState.isStopping ? "Stopping..." : "Stop"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={startRuntime}
                  disabled={hasActiveRuntime || htmlRuntimeState.isStarting}
                  className="h-7 px-2"
                >
                  <Play className="mr-1 h-3 w-3" />
                  {htmlRuntimeState.isStarting ? "Starting..." : "Start"}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Pyodide Agent Card (Future) */}
        <Card className="border-gray-200 bg-gray-50 p-4 opacity-60">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                🐍
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-500">
                  Pyodide Agent
                </h4>
                <p className="mt-1 text-xs text-gray-400">
                  Python in the browser (coming soon)
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" disabled className="h-7 px-2">
              Coming Soon
            </Button>
          </div>
        </Card>

        {/* External Agent Card */}
        <Card
          className={`p-4 transition-all duration-200 ${
            hasExternalRuntime
              ? "border-blue-200 bg-blue-50 shadow-sm"
              : htmlRuntimeState.isActive
                ? "border-gray-200 bg-gray-50 opacity-60"
                : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div
                className={`mt-1 flex h-8 w-8 items-center justify-center rounded-lg ${
                  hasExternalRuntime
                    ? "bg-blue-100 text-blue-600"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                🔌
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900">
                  External Agent
                </h4>
                <p className="mt-1 text-xs text-gray-500">
                  Full Python + AI capabilities
                </p>
                {hasExternalRuntime && activeExternalRuntime && (
                  <div className="mt-2 flex items-center space-x-2 text-xs">
                    <div className="flex items-center space-x-1">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      <span className="text-blue-700">Connected</span>
                    </div>
                    <span className="text-gray-400">•</span>
                    <code className="rounded bg-blue-100 px-1 text-blue-700">
                      {activeExternalRuntime.sessionId.slice(-6)}
                    </code>
                  </div>
                )}
                {!hasExternalRuntime && !htmlRuntimeState.isActive && (
                  <div className="mt-3 rounded bg-gray-900 p-2">
                    <code className="block text-xs break-all text-gray-100">
                      {runtimeCommand}
                    </code>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {!hasExternalRuntime && !htmlRuntimeState.isActive && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyRuntimeCommand}
                  className="h-7 px-2"
                  title="Copy command"
                >
                  <Copy className="mr-1 h-3 w-3" />
                  Copy
                </Button>
              )}
              {hasExternalRuntime && (
                <div className="text-xs font-medium text-blue-600">
                  {activeExternalRuntime?.status === "ready"
                    ? "Ready"
                    : activeExternalRuntime?.status === "busy"
                      ? "Busy"
                      : "Connected"}
                </div>
              )}
            </div>
          </div>

          {htmlRuntimeState.isActive && (
            <div className="mt-2 text-xs text-amber-600">
              External runtime disabled - HTML runtime is active
            </div>
          )}

          {!hasExternalRuntime && !htmlRuntimeState.isActive && (
            <div className="mt-3 border-t border-gray-200 pt-3">
              <p className="mb-2 text-xs text-gray-500">
                <strong>Setup:</strong> Set RUNT_API_KEY in your environment,
                then run the command above
              </p>
              <div className="flex items-center space-x-2">
                <ExternalLink className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-500">
                  Each notebook needs its own runtime instance
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Management Section */}
      {totalRuntimes > 0 && (
        <div className="border-t pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              Runtime Management
            </h4>
            <div className="text-xs text-gray-500">
              {totalRuntimes} active session{totalRuntimes !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              Clear all active runtimes and flush the execution queue
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={clearAllRuntimes}
              className="w-full"
            >
              <Trash2 className="mr-2 h-3 w-3" />
              Flush Queue & Clear Runtimes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
