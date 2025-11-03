import {
  getHealthButtonClassNames,
  getHealthColor,
  getStatusColor,
  getStatusText,
} from "@/components/notebook/RuntimeHealthIndicator";
import { Button } from "@/components/ui/button";
import {
  ButtonGroup,
  ButtonGroupSeparator,
} from "@/components/ui/button-group";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/Spinner";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { useSidebarItem } from "@/contexts/SidebarItemContext";
import { useRuntimeHealth } from "@/hooks/useRuntimeHealth";
import { getRuntimeCommand } from "@/util/runtime-command";
import { useStore } from "@livestore/react";
import {
  Braces,
  ChevronDown,
  Circle,
  Code2,
  Copy,
  PanelLeftOpen,
  Play,
  PlayIcon,
  Sidebar,
  Square,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { NotebookProcessed } from "../types";
import {
  PythonIcon,
  PythonTerminalIcon,
  PythonWasmIcon,
} from "@/runtime/runtime-icons";
import { cn } from "@/lib/utils";

export function RuntimeActions({ notebook }: { notebook: NotebookProcessed }) {
  const { store } = useStore();
  const { hasActiveRuntime, activeRuntime, runtimeHealth, runtimeStatus } =
    useRuntimeHealth();

  const { activeSection, setActiveSection } = useSidebarItem();
  const [isLaunchingLocal, setIsLaunchingLocal] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLaunchingPyodide, setIsLaunchingPyodide] = useState(false);
  const [pyodideError, setPyodideError] = useState<string | null>(null);

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
  }, [store]);

  return (
    <>
      {/* {isLaunchingPyodide && <Spinner />} */}
      {/* {!isLaunchingPyodide && (
        <Circle
          className={`size-2 fill-current ${getHealthColor(runtimeHealth)}`}
        />
      )} */}
      {!hasActiveRuntime ? (
        <>
          <ButtonGroup>
            <SimpleTooltip content="Start browser-based Python runtime (Pyodide)">
              <Button
                size="sm"
                variant="secondary"
                className="text-xs"
                onClick={launchLocalPyodideRuntime}
                disabled={isLaunchingPyodide}
              >
                {!isLaunchingPyodide && <Play />}
                Start Python Runtime
              </Button>
            </SimpleTooltip>
            {/* <Popover>
              <PopoverTrigger asChild> */}
            <ButtonGroupSeparator />
            <SimpleTooltip content="Open runtime panel">
              <Button
                size="sm"
                variant="secondary"
                className="group gap-0 text-xs hover:gap-2"
                onClick={() => setActiveSection("runtime")}
              >
                <PanelLeftOpen />
              </Button>
            </SimpleTooltip>
            {/* </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <StartRuntime
                  localError={localError}
                  notebook={notebook}
                  launchLocalHtmlRuntime={launchLocalHtmlRuntime}
                  launchLocalPyodideRuntime={launchLocalPyodideRuntime}
                  isLaunchingLocal={isLaunchingLocal}
                  isLaunchingPyodide={isLaunchingPyodide}
                  pyodideError={pyodideError}
                />
              </PopoverContent>
            </Popover> */}
          </ButtonGroup>
        </>
      ) : (
        hasActiveRuntime &&
        activeRuntime && (
          <SimpleTooltip content="Open runtime panel">
            <Button
              size="sm"
              variant="secondary"
              className={cn(
                "group gap-0 text-xs hover:gap-2",
                getHealthButtonClassNames(runtimeHealth)
              )}
              onClick={() => setActiveSection("runtime")}
            >
              {/* <PanelLeftOpen className="!w-0 opacity-0 transition-[transform,width,opacity] duration-200 group-hover:!w-4 group-hover:!opacity-100" /> */}
              {isLaunchingPyodide ? (
                <span className="text-muted-foreground">
                  Starting {runtimeTypeToTitle(activeRuntime.runtimeType)}...
                </span>
              ) : (
                <span>
                  {runtimeTypeToTitle(activeRuntime.runtimeType)}{" "}
                  {getStatusText(runtimeHealth, runtimeStatus)}
                </span>
              )}
              {/* <LogoForRuntimeType runtimeType={activeRuntime.runtimeType} /> */}
            </Button>
          </SimpleTooltip>
        )
      )}
    </>
  );
}

const runtimeTypeToTitle = (runtimeType: string) => {
  switch (runtimeType) {
    case "html":
      return "HTML";
    case "python":
      return "Python";
    case "python3-pyodide":
      return "Python";
    default:
      return "Unknown";
  }
};

function LogoForRuntimeType({ runtimeType }: { runtimeType: string }) {
  switch (runtimeType) {
    case "html":
      return <Code2 />;
    case "python":
      return <PythonWasmIcon />;
    case "python3-pyodide":
      return <PythonTerminalIcon />;
    default:
      return <Braces />;
  }
}

function StartRuntime({
  notebook,
  launchLocalHtmlRuntime,
  launchLocalPyodideRuntime,
  isLaunchingLocal,
  isLaunchingPyodide,
  pyodideError,
  localError,
}: {
  notebook: NotebookProcessed;
  launchLocalHtmlRuntime: () => void;
  launchLocalPyodideRuntime: () => void;
  isLaunchingLocal: boolean;
  isLaunchingPyodide: boolean;
  pyodideError: string | null;
  localError: string | null;
}) {
  return (
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
            <Code2 className="h-3 w-3" />
            {isLaunchingLocal ? "Starting..." : "Start HTML Runtime"}
          </Button>

          <Button
            onClick={launchLocalPyodideRuntime}
            disabled={isLaunchingPyodide}
            size="sm"
            className="flex w-full items-center gap-1"
          >
            <PythonWasmIcon className="h-3 w-3" />
            {isLaunchingPyodide ? "Starting..." : "Start Python Runtime"}
          </Button>

          {localError && (
            <p className="mt-1 text-xs text-red-600">{localError}</p>
          )}

          {pyodideError && (
            <p className="text-xs text-red-600">{pyodideError}</p>
          )}

          <p className="text-xs text-gray-400">
            Limited capabilities. Other users will see "Local (You)".
          </p>
        </div>
      </div>
    </div>
  );
}

function RuntimeDetails({
  localError,
  onLocalError,
  onPyodideError,
}: {
  localError: string | null;
  onLocalError: (error: string | null) => void;
  onPyodideError: (error: string | null) => void;
}) {
  const { activeRuntime } = useRuntimeHealth();

  useEffect(() => {
    if (!activeRuntime || !window.__RUNT_LAUNCHER__) {
      return;
    }
    window.__RUNT_LAUNCHER__.getStatus();
  }, [activeRuntime]);

  const isLocalRuntime = useCallback(() => {
    if (!activeRuntime || !window.__RUNT_LAUNCHER__) {
      return false;
    }
    const status = window.__RUNT_LAUNCHER__.getStatus();
    return status.hasAgent && status.sessionId === activeRuntime.sessionId;
  }, [activeRuntime]);

  const stopLocalRuntime = useCallback(async () => {
    try {
      onLocalError(null);
      onPyodideError(null);

      if (!window.__RUNT_LAUNCHER__) {
        throw new Error("Console launcher not available");
      }

      await window.__RUNT_LAUNCHER__.shutdown();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to stop runtime";
      onLocalError(message);
      onPyodideError(message);
      console.error("Local runtime stop failed:", err);
    }
  }, [onLocalError, onPyodideError]);

  if (!activeRuntime) {
    return null;
  }
  return (
    <div className="space-y-2 text-xs">
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
        <>
          <Separator />
          <Button
            onClick={stopLocalRuntime}
            size="sm"
            variant="destructiveSecondary"
            className="w-full text-xs"
          >
            <Square />
            Stop Python Runtime
          </Button>
          {localError && (
            <p className="mt-1 text-xs text-red-600">{localError}</p>
          )}
        </>
      )}
    </div>
  );
}

const RuntimeCodeBlock = ({ notebookId }: { notebookId: string }) => {
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

const SeparatorLine = () => {
  return <span className="mx-0 h-4 rotate-12 border-l border-gray-300"></span>;
};
