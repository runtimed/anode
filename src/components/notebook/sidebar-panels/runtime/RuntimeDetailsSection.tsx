import { Button } from "@/components/ui/button";
import { RuntimeSessionData } from "@runtimed/schema";
import { Square } from "lucide-react";
import { SidebarGroupLabel } from "./components";

export const RuntimeDetailsSection = ({
  activeRuntime,
  isLocalRuntime,
  stopLocalRuntime,
  localError,
}: {
  activeRuntime: RuntimeSessionData;
  isLocalRuntime: () => boolean;
  stopLocalRuntime: () => void;
  localError: string | null;
}) => {
  return (
    <>
      <SidebarGroupLabel>Runtime Details</SidebarGroupLabel>
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
      {isLocalRuntime() && (
        <>
          <div>
            <Button
              onClick={stopLocalRuntime}
              size="sm"
              variant="outline"
              className="text-destructive w-full text-xs"
            >
              <Square />
              Stop Local Runtime
            </Button>
            {localError && (
              <p className="mt-1 text-xs text-red-600">{localError}</p>
            )}
          </div>
        </>
      )}
    </>
  );
};
