import { SidebarSwitch } from "@/components/ui/SidebarSwitch";
import {
  AutoLaunchConfig,
  AutoLaunchStatus,
} from "@/hooks/useAutoLaunchRuntime";
import { SidebarGroupLabel } from "./components";

export const AutoLaunchSection = ({
  autoLaunchConfig,
  updateAutoLaunchConfig,
  autoLaunchStatus,
}: {
  autoLaunchConfig: AutoLaunchConfig;
  updateAutoLaunchConfig: (updates: Partial<AutoLaunchConfig>) => void;
  autoLaunchStatus: AutoLaunchStatus;
}) => {
  return (
    <div>
      <SidebarSwitch
        title={
          <SidebarGroupLabel>Launch runtime automatically</SidebarGroupLabel>
        }
        description="When enabled, executing a cell will automatically launch the runtime."
        enabled={autoLaunchConfig.enabled}
        onEnabledChange={() =>
          updateAutoLaunchConfig({ enabled: !autoLaunchConfig.enabled })
        }
      />
      {autoLaunchStatus.launchCount > 0 && (
        <p className="text-xs text-gray-400">
          Launched {autoLaunchStatus.launchCount} time
          {autoLaunchStatus.launchCount === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
};
