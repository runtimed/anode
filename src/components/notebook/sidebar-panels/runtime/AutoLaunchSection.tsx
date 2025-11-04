import {
  AutoLaunchConfig,
  AutoLaunchStatus,
} from "@/hooks/useAutoLaunchRuntime";

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
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700">Auto-launch</span>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={autoLaunchConfig.enabled}
            onChange={(e) =>
              updateAutoLaunchConfig({ enabled: e.target.checked })
            }
            className="peer sr-only"
          />
          <div className="peer h-5 w-9 rounded-full bg-gray-200 peer-checked:bg-blue-600 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
        </label>
      </div>
      <p className="text-xs text-pretty text-gray-500">
        {autoLaunchConfig.enabled
          ? "Runtime will start automatically when you execute cells"
          : "You'll need to start runtime manually"}
      </p>
      {autoLaunchStatus.launchCount > 0 && (
        <p className="mt-1 text-xs text-gray-400">
          Launched {autoLaunchStatus.launchCount} time
          {autoLaunchStatus.launchCount === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
};
