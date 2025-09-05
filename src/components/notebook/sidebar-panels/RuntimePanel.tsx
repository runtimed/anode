import React from "react";
import { RuntimeHealthIndicator } from "@/components/notebook/RuntimeHealthIndicator";
import { useRuntimeHealth } from "@/hooks/useRuntimeHealth";
import type { SidebarPanelProps } from "./types";

export const RuntimePanel: React.FC<SidebarPanelProps> = () => {
  const { hasActiveRuntime, activeRuntime } = useRuntimeHealth();

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
          </div>
        </div>
      )}

      {!hasActiveRuntime && (
        <div className="border-t pt-4">
          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              Start a runtime to execute code cells.
            </p>
            <p className="text-xs text-gray-500">
              Setup instructions will be available here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
