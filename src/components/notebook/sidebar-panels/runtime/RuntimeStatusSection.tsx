import { RuntimeSessionData } from "@runtimed/schema";
import { RuntimeHealthIndicator } from "../../RuntimeHealthIndicator";
import { AutoLaunchStatus } from "@/hooks/useAutoLaunchRuntime";
import { SidebarGroupLabel } from "./components";

export const RuntimeStatusSection = ({
  activeRuntime,
  autoLaunchStatus,
}: {
  activeRuntime: RuntimeSessionData | undefined;
  autoLaunchStatus: AutoLaunchStatus;
}) => {
  return (
    <>
      <SidebarGroupLabel>Runtime Status</SidebarGroupLabel>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Connection</span>
          <RuntimeHealthIndicator showStatus />
        </div>

        {/* Auto-launch status indicators */}
        {autoLaunchStatus.isLaunching && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Auto-launch</span>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
              <span className="text-xs text-blue-600">Starting...</span>
            </div>
          </div>
        )}

        {autoLaunchStatus.lastError && !autoLaunchStatus.isLaunching && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Auto-launch</span>
            <span
              className="text-xs text-red-600"
              title={autoLaunchStatus.lastError}
            >
              Failed
            </span>
          </div>
        )}

        {activeRuntime && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Type</span>
            <span className="font-mono text-xs">
              {activeRuntime?.runtimeType ?? "unknown"}
            </span>
          </div>
        )}
      </div>
    </>
  );
};
