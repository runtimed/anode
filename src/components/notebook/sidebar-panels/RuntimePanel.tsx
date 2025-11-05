import { useAuthenticatedUser } from "@/auth";
import { Button } from "@/components/ui/button";
import { useFeatureFlag } from "@/contexts/FeatureFlagContext";
import { useAutoLaunchRuntime } from "@/hooks/useAutoLaunchRuntime";
import { useRuntimeHealth } from "@/hooks/useRuntimeHealth";
import { PythonIcon } from "@/icons/python-icon";
import { useQuery, useStore } from "@livestore/react";
import { events, queryDb, RuntimeSessionData, tables } from "@runtimed/schema";
import { BrushCleaning, Code2 } from "lucide-react";
import React, { useCallback, useState } from "react";
import { AutoLaunchSection } from "./runtime/AutoLaunchSection";
import { RuntimeDetailsSection } from "./runtime/RuntimeDetailsSection";
import { RuntimeStatusSection } from "./runtime/RuntimeStatusSection";
import type { SidebarPanelProps } from "./types";
import { SystemRuntimeSection } from "./runtime/SystemRuntimeSection";
import { SidebarGroupLabel } from "./runtime/components";
import { Separator } from "@/components/ui/separator";

export const RuntimePanel: React.FC<SidebarPanelProps> = ({ notebook }) => {
  const { hasActiveRuntime, activeRuntime } = useRuntimeHealth();

  const [localError, setLocalError] = useState<string | null>(null);
  const [pyodideError, setPyodideError] = useState<string | null>(null);

  const {
    status: autoLaunchStatus,
    config: autoLaunchConfig,
    updateConfig: updateAutoLaunchConfig,
  } = useAutoLaunchRuntime();

  const activeRuntimeSessions = useQuery(
    queryDb(tables.runtimeSessions.select().where("isActive", "=", true))
  );

  const stopLocalRuntime = useCallback(async () => {
    try {
      setLocalError(null);
      setPyodideError(null);

      if (!window.__RUNT_LAUNCHER__) {
        throw new Error("Console launcher not available");
      }

      await window.__RUNT_LAUNCHER__.shutdown();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to stop runtime";
      setLocalError(message);
      setPyodideError(message);
      console.error("Local runtime stop failed:", err);
    }
  }, []);

  return (
    <div className="space-y-3">
      <RuntimeStatusSection
        activeRuntime={activeRuntime}
        autoLaunchStatus={autoLaunchStatus}
      />
      {hasActiveRuntime && activeRuntime && (
        <RuntimeDetailsSection
          activeRuntime={activeRuntime}
          stopLocalRuntime={stopLocalRuntime}
          localError={localError}
        />
      )}
      {!hasActiveRuntime && <Separator />}
      {!hasActiveRuntime && (
        <>
          <BrowserRuntimeSection
            localError={localError}
            setLocalError={setLocalError}
            pyodideError={pyodideError}
            setPyodideError={setPyodideError}
          />
          <Separator />
          <SystemRuntimeSection notebookId={notebook.id} />
          <Separator />
          {/* Auto-launch Configuration */}
          <AutoLaunchSection
            autoLaunchConfig={autoLaunchConfig}
            updateAutoLaunchConfig={updateAutoLaunchConfig}
            autoLaunchStatus={autoLaunchStatus}
          />
        </>
      )}
      {/* Show clear all button if there are any runtime sessions */}
      {activeRuntimeSessions.length > 0 && (
        <>
          <Separator />
          <ClearAllRuntimesSection
            activeRuntimeSessions={activeRuntimeSessions}
          />
        </>
      )}
    </div>
  );
};

function BrowserRuntimeSection({
  localError,
  setLocalError,
  pyodideError,
  setPyodideError,
}: {
  localError: string | null;
  setLocalError: (error: string | null) => void;
  pyodideError: string | null;
  setPyodideError: (error: string | null) => void;
}) {
  const { store } = useStore();
  const enableHtmlRuntime = useFeatureFlag("html-runtime");

  const [isLaunchingLocal, setIsLaunchingLocal] = useState(false);
  const [isLaunchingPyodide, setIsLaunchingPyodide] = useState(false);

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
  }, [store, setLocalError]);

  const launchLocalPyodideRuntime = useCallback(async () => {
    try {
      setIsLaunchingPyodide(true);
      setPyodideError(null);

      if (!window.__RUNT_LAUNCHER__) {
        throw new Error("Console launcher not available");
      }

      // Use existing store connection
      window.__RUNT_LAUNCHER__.useExistingStore(store);

      // Launch the Pyodide runtime
      await window.__RUNT_LAUNCHER__.launchPythonAgent();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to launch runtime";
      setPyodideError(message);
      console.error("Pyodide runtime launch failed:", err);
    } finally {
      setIsLaunchingPyodide(false);
    }
  }, [store, setPyodideError]);

  return (
    <>
      <SidebarGroupLabel>Browser-based Runtime</SidebarGroupLabel>

      <div className="space-y-1">
        <Button
          onClick={launchLocalPyodideRuntime}
          disabled={isLaunchingPyodide}
          size="sm"
          className="w-full"
        >
          <PythonIcon />
          {isLaunchingPyodide ? "Starting..." : "Launch Python Runtime"}
        </Button>
        <p className="text-xs leading-tight text-pretty text-gray-500">
          Limited capabilities. Other users will see "Local (You)".
        </p>
      </div>

      {pyodideError && <p className="text-xs text-red-600">{pyodideError}</p>}

      {enableHtmlRuntime && (
        <>
          <Button
            onClick={launchLocalHtmlRuntime}
            disabled={isLaunchingLocal}
            size="sm"
            className="w-full"
          >
            <Code2 />
            {isLaunchingLocal ? "Starting..." : "Launch HTML Runtime"}
          </Button>

          {localError && <p className="text-xs text-red-600">{localError}</p>}
        </>
      )}
    </>
  );
}

function ClearAllRuntimesSection({
  activeRuntimeSessions,
}: {
  activeRuntimeSessions: readonly RuntimeSessionData[];
}) {
  const { store } = useStore();
  const userId = useAuthenticatedUser();

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

  return (
    <>
      <SidebarGroupLabel>Runtime Management</SidebarGroupLabel>
      <div>
        <p className="mb-2 text-xs text-gray-500">
          {activeRuntimeSessions.length} active runtime session
          {activeRuntimeSessions.length !== 1 ? "s" : ""}
        </p>
        <p className="mb-2 text-xs text-gray-400">
          This will terminate all runtimes and cancel any running executions.
        </p>
      </div>

      <Button
        variant="destructive"
        size="sm"
        onClick={clearAllRuntimes}
        className="flex w-full items-center gap-1"
      >
        <BrushCleaning className="h-3 w-3" />
        <span>Clear All Runtimes</span>
      </Button>
    </>
  );
}
