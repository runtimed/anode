import { Switch } from "./switch";

export function SidebarSwitch({
  title,
  description,
  enabled,
  onEnabledChange,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}) {
  return (
    <div
      className="-m-2 cursor-default space-y-3 rounded-md p-2 transition-colors hover:bg-gray-100"
      onClick={() => onEnabledChange(!enabled)}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">{title}</p>
          {description && (
            <p className="text-xs text-gray-500">{description}</p>
          )}
        </div>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </div>
    </div>
  );
}
