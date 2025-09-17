/**
 * HTML Runtime Controls
 *
 * Simple controls for managing the HTML runtime agent from the RuntimePanel.
 */

import React from "react";
import { Button } from "../ui/button.js";
import { useHtmlRuntime } from "../../runtime/managers/HtmlRuntimeManager.js";
import { Spinner } from "../ui/Spinner.js";
import { Play, Square, RotateCcw } from "lucide-react";

export const HtmlRuntimeControls: React.FC = () => {
  const { runtimeState, startRuntime, stopRuntime, restartRuntime } =
    useHtmlRuntime();

  const getStatusColor = () => {
    if (runtimeState.error) return "text-red-600";
    if (runtimeState.isActive) return "text-green-600";
    if (runtimeState.isStarting || runtimeState.isStopping)
      return "text-yellow-600";
    return "text-gray-500";
  };

  const getStatusText = () => {
    if (runtimeState.error) return "Error";
    if (runtimeState.isStarting) return "Starting...";
    if (runtimeState.isStopping) return "Stopping...";
    if (runtimeState.isActive) return "Running";
    return "Stopped";
  };

  const isLoading = runtimeState.isStarting || runtimeState.isStopping;

  return (
    <div className="space-y-3">
      <div>
        <h4 className="mb-2 text-xs font-medium text-gray-700">HTML Runtime</h4>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-gray-600">Status</span>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                runtimeState.error
                  ? "bg-red-500"
                  : runtimeState.isActive
                    ? "bg-green-500"
                    : runtimeState.isStarting || runtimeState.isStopping
                      ? "bg-yellow-500"
                      : "bg-gray-400"
              }`}
            />
            <span className={`text-xs ${getStatusColor()}`}>
              {getStatusText()}
            </span>
            {isLoading && <Spinner className="h-3 w-3" />}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {runtimeState.error && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-600">
          <strong>Error:</strong> {runtimeState.error}
        </div>
      )}

      {/* Runtime Details */}
      {runtimeState.isActive && runtimeState.runtimeId && (
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">Runtime ID:</span>
            <code className="rounded bg-gray-100 px-1 text-xs">
              {runtimeState.runtimeId.slice(-8)}
            </code>
          </div>
          {runtimeState.sessionId && (
            <div className="flex justify-between">
              <span className="text-gray-600">Session:</span>
              <code className="rounded bg-gray-100 px-1 text-xs">
                {runtimeState.sessionId.slice(-8)}
              </code>
            </div>
          )}
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        {!runtimeState.isActive ? (
          <Button
            onClick={() => startRuntime()}
            disabled={isLoading}
            size="sm"
            variant="outline"
            className="flex items-center gap-1"
          >
            <Play className="h-3 w-3" />
            <span>
              {runtimeState.isStarting ? "Starting..." : "Start HTML"}
            </span>
          </Button>
        ) : (
          <>
            <Button
              onClick={() => stopRuntime()}
              disabled={isLoading}
              size="sm"
              variant="outline"
              className="flex items-center gap-1"
            >
              <Square className="h-3 w-3" />
              <span>{runtimeState.isStopping ? "Stopping..." : "Stop"}</span>
            </Button>
            <Button
              onClick={() => restartRuntime()}
              disabled={isLoading}
              size="sm"
              variant="outline"
              className="flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Restart</span>
            </Button>
          </>
        )}
      </div>

      {/* Description */}
      <div className="text-xs text-gray-500">
        {runtimeState.isActive ? (
          <p>
            HTML runtime processes code cells and renders their content as HTML
            output.
          </p>
        ) : (
          <p>
            Start the HTML runtime to execute code cells as HTML. This runs
            entirely in your browser.
          </p>
        )}
      </div>
    </div>
  );
};

export default HtmlRuntimeControls;
