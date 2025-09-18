/**
 * Runtime Panel V2
 *
 * Registry-based runtime management panel.
 * Uses the runtime registry system for clean separation of concerns.
 */

import React, { useCallback } from "react";
import { Copy, Play, Square, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery } from "@livestore/react";
import { tables, queryDb } from "@runtimed/schema";

import { getRuntimeCommand } from "@/util/runtime-command";
import {
  useRuntimeRegistry,
  useRuntimeOperations,
  type Runtime,
} from "@/runtime/registry";
import type { SidebarPanelProps } from "./types";

export const RuntimePanelV2: React.FC<SidebarPanelProps> = ({ notebook }) => {
  const { availableRuntimes, canStartRuntime } = useRuntimeRegistry();

  const { startRuntime, stopRuntime, stopAllRuntimes, isLoading, error } =
    useRuntimeOperations();

  // Query LiveStore directly for all active runtime sessions across tabs
  const allRuntimeSessions = useQuery(
    queryDb(tables.runtimeSessions.select().where({ isActive: true }))
  );

  const externalRuntimeSessions = allRuntimeSessions.filter(
    (session) => session.runtimeType !== "html"
  );

  const htmlRuntimeSessions = allRuntimeSessions.filter(
    (session) => session.runtimeType === "html"
  );

  const hasExternalRuntime = externalRuntimeSessions.length > 0;
  const hasHtmlRuntime = htmlRuntimeSessions.length > 0;
  const activeHtmlSession = htmlRuntimeSessions[0]; // Get the first active HTML session
  const runtimeCommand = getRuntimeCommand(notebook.id);

  const copyRuntimeCommand = useCallback(() => {
    navigator.clipboard.writeText(runtimeCommand);
  }, [runtimeCommand]);

  const handleStartRuntime = useCallback(
    async (runtimeId: string) => {
      await startRuntime(runtimeId, notebook.id);
    },
    [startRuntime, notebook.id]
  );

  const handleStopRuntime = useCallback(
    async (runtimeId: string) => {
      await stopRuntime(runtimeId);
    },
    [stopRuntime]
  );

  const handleStopAllRuntimes = useCallback(async () => {
    console.log("🧹 Stopping all runtimes and flushing execution queue...");
    await stopAllRuntimes();
  }, [stopAllRuntimes]);

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

      {/* Error Display */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <div className="text-sm text-red-800">Error: {error}</div>
        </div>
      )}

      {/* Runtime Cards */}
      <div className="space-y-3">
        {availableRuntimes.map((runtime) => {
          // Determine if this specific runtime type is active based on LiveStore data
          let isRuntimeActive = false;
          let activeSession = null;

          if (runtime.metadata.type === "html") {
            isRuntimeActive = hasHtmlRuntime;
            activeSession = activeHtmlSession;
          } else if (runtime.metadata.type === "external") {
            isRuntimeActive = hasExternalRuntime;
            activeSession = externalRuntimeSessions[0];
          }

          const hasOtherActiveRuntime = allRuntimeSessions.some(
            (session) => session.runtimeType !== runtime.metadata.type
          );

          return (
            <RuntimeCard
              key={runtime.metadata.id}
              runtime={runtime}
              isActive={isRuntimeActive}
              activeSession={activeSession}
              hasOtherActiveRuntime={hasOtherActiveRuntime}
              canStart={canStartRuntime()}
              onStart={() => handleStartRuntime(runtime.metadata.id)}
              onStop={() => handleStopRuntime(runtime.metadata.id)}
              isLoading={isLoading}
              runtimeCommand={
                runtime.metadata.type === "external"
                  ? runtimeCommand
                  : undefined
              }
              onCopyCommand={
                runtime.metadata.type === "external"
                  ? copyRuntimeCommand
                  : undefined
              }
              hasExternalRuntime={hasExternalRuntime}
            />
          );
        })}
      </div>

      {/* Management Section */}
      {allRuntimeSessions.length > 0 && (
        <div className="border-t pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              Runtime Management
            </h4>
            <div className="text-xs text-gray-500">
              {allRuntimeSessions.length} active session
              {allRuntimeSessions.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              Clear all active runtimes and flush the execution queue
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleStopAllRuntimes}
              disabled={isLoading}
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

interface RuntimeCardProps {
  runtime: Runtime;
  isActive: boolean;
  activeSession?: any; // LiveStore session data
  hasOtherActiveRuntime: boolean;
  canStart: boolean;
  onStart: () => void;
  onStop: () => void;
  isLoading: boolean;
  runtimeCommand?: string;
  onCopyCommand?: () => void;
  hasExternalRuntime: boolean;
}

const RuntimeCard: React.FC<RuntimeCardProps> = ({
  runtime,
  isActive,
  activeSession,
  hasOtherActiveRuntime,
  canStart,
  onStart,
  onStop,
  isLoading,
  runtimeCommand,
  onCopyCommand,
  hasExternalRuntime,
}) => {
  const state = runtime.getState();
  const isAvailable = runtime.metadata.isAvailable;
  const isLocal = runtime.metadata.isLocal;

  // Determine card styling based on runtime state
  const getCardClassName = () => {
    if (!isAvailable) {
      return "border-gray-200 bg-gray-50 opacity-60";
    }

    if (isActive) {
      const statusColor = getRuntimeStatusColor(runtime);
      switch (statusColor) {
        case "green":
          return "border-green-200 bg-green-50 shadow-sm";
        case "blue":
          return "border-blue-200 bg-blue-50 shadow-sm";
        case "red":
          return "border-red-200 bg-red-50 shadow-sm";
        default:
          return "border-yellow-200 bg-yellow-50 shadow-sm";
      }
    }

    if (hasOtherActiveRuntime && !isLocal) {
      return "border-gray-200 bg-gray-50 opacity-60";
    }

    return "border-gray-200 hover:border-gray-300 hover:shadow-sm";
  };

  // Determine icon styling
  const getIconClassName = () => {
    if (!isAvailable) {
      return "bg-gray-100 text-gray-400";
    }

    if (isActive) {
      const statusColor = getRuntimeStatusColor(runtime);
      switch (statusColor) {
        case "green":
          return "bg-green-100 text-green-600";
        case "blue":
          return "bg-blue-100 text-blue-600";
        case "red":
          return "bg-red-100 text-red-600";
        default:
          return "bg-yellow-100 text-yellow-600";
      }
    }

    return "bg-gray-100 text-gray-500";
  };

  const setupInstructions = runtime.getSetupInstructions?.();
  const showExternalRuntimeSetup =
    runtime.metadata.type === "external" &&
    !hasExternalRuntime &&
    !isActive &&
    runtimeCommand;

  return (
    <Card className={`p-4 transition-all duration-200 ${getCardClassName()}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div
            className={`mt-1 flex h-8 w-8 items-center justify-center rounded-lg ${getIconClassName()}`}
          >
            {runtime.metadata.icon}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900">
              {runtime.metadata.name}
            </h4>
            <p className="mt-1 text-xs text-gray-500">
              {runtime.metadata.description}
            </p>

            {/* Status Information */}
            {isActive && (
              <div className="mt-2 flex items-center space-x-2 text-xs">
                <div className="flex items-center space-x-1">
                  <div className={`h-2 w-2 rounded-full bg-green-500`} />
                  <span className="text-green-700">Active</span>
                </div>
                {activeSession?.sessionId && (
                  <>
                    <span className="text-gray-400">•</span>
                    <code className="rounded bg-green-100 px-1 text-green-700">
                      {activeSession.sessionId.slice(-6)}
                    </code>
                  </>
                )}
              </div>
            )}

            {state.error && !isActive && (
              <div className="mt-2 text-xs text-red-600">
                Error: {state.error}
              </div>
            )}

            {/* Setup instructions for unavailable runtimes */}
            {!isAvailable && setupInstructions && (
              <div className="mt-2 text-xs text-gray-400">
                {setupInstructions}
              </div>
            )}

            {/* External runtime command */}
            {showExternalRuntimeSetup && (
              <div className="mt-3 rounded bg-gray-900 p-2">
                <code className="block text-xs break-all text-gray-100">
                  {runtimeCommand}
                </code>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {renderActionButtons()}
        </div>
      </div>

      {/* Additional Information */}
      {renderAdditionalInfo()}
    </Card>
  );

  function renderActionButtons() {
    if (!isAvailable) {
      return (
        <Button size="sm" variant="outline" disabled className="h-7 px-2">
          Coming Soon
        </Button>
      );
    }

    if (
      runtime.metadata.type === "external" &&
      !hasExternalRuntime &&
      !isActive &&
      onCopyCommand
    ) {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={onCopyCommand}
          className="h-7 px-2"
          title="Copy command"
        >
          <Copy className="mr-1 h-3 w-3" />
          Copy
        </Button>
      );
    }

    if (isActive) {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={onStop}
          disabled={state.isStopping || isLoading}
          className="h-7 px-2"
        >
          <Square className="mr-1 h-3 w-3" />
          {state.isStopping ? "Stopping..." : "Stop"}
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        onClick={onStart}
        disabled={
          !canStart || hasOtherActiveRuntime || state.isStarting || isLoading
        }
        className="h-7 px-2"
      >
        <Play className="mr-1 h-3 w-3" />
        {state.isStarting ? "Starting..." : "Start"}
      </Button>
    );
  }

  function renderAdditionalInfo() {
    if (runtime.metadata.type === "external") {
      if (hasOtherActiveRuntime && !isActive) {
        return (
          <div className="mt-2 text-xs text-amber-600">
            External runtime disabled - another runtime is active
          </div>
        );
      }

      if (showExternalRuntimeSetup) {
        return (
          <div className="mt-3 border-t border-gray-200 pt-3">
            <p className="mb-2 text-xs text-gray-500">
              <strong>Setup:</strong> Set RUNT_API_KEY in your environment, then
              run the command above
            </p>
            <div className="flex items-center space-x-2">
              <ExternalLink className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-500">
                Each notebook needs its own runtime instance
              </span>
            </div>
          </div>
        );
      }
    }

    return null;
  }

  function getRuntimeStatusColor(runtime: Runtime): string {
    const state = runtime.getState();

    if (!state.isActive) return "gray";

    switch (state.status) {
      case "ready":
        return "green";
      case "busy":
        return "blue";
      case "starting":
      case "stopping":
        return "yellow";
      case "error":
        return "red";
      default:
        return "gray";
    }
  }
};
