import { Switch } from "@/components/ui/switch";
import {
  FeatureFlagKey,
  useFeatureFlag,
  useFeatureFlagContext,
} from "../contexts/FeatureFlagContext";

export function FeatureFlagDemoPage() {
  const { allFlagKeys } = useFeatureFlagContext();

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Feature Flag Demo</h1>
        <p className="text-muted-foreground">
          This page demonstrates the feature flag system. Toggle flags below to
          see them in action. Flags are stored in sessionStorage and persist
          across page reloads.
        </p>
      </div>

      <div className="grid gap-x-4 gap-y-1 md:grid-cols-2 lg:grid-cols-3">
        {allFlagKeys.map((flagKey) => (
          <FeatureFlagToggle key={flagKey} flagKey={flagKey} />
        ))}
      </div>
    </div>
  );
}

interface FeatureFlagToggleProps {
  flagKey: FeatureFlagKey;
}

export function FeatureFlagToggle({ flagKey }: FeatureFlagToggleProps) {
  const isEnabled = useFeatureFlag(flagKey);
  const { setFlag } = useFeatureFlagContext();

  const toggleFlag = () => {
    setFlag(flagKey, !isEnabled);
  };

  return (
    <div
      className="cursor-default space-y-3 rounded-md border border-1 border-gray-200 p-2 transition-colors hover:bg-gray-100"
      onClick={toggleFlag}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">{flagKey}</p>
        </div>
        <Switch checked={isEnabled} onCheckedChange={toggleFlag} />
      </div>
    </div>
  );
}
