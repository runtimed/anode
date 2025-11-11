import {
  getHealthColor,
  getStatusColor,
  getStatusText,
} from "@/components/notebook/RuntimeHealthIndicator";
import { Button } from "@/components/ui/button";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { useSidebarItem } from "@/contexts/SidebarItemContext";
import { useRuntimeHealth } from "@/hooks/useRuntimeHealth";
import { Circle, Plug } from "lucide-react";

export function RuntimeStateButton() {
  const { activeRuntime, runtimeHealth, runtimeStatus } = useRuntimeHealth();

  const { setActiveSection } = useSidebarItem();

  if (!activeRuntime) {
    return (
      <SimpleTooltip content="Open runtime panel">
        <Button
          size="sm"
          variant="ghost"
          className="text-xs"
          onClick={() => setActiveSection("runtime")}
        >
          <Plug className="h-3 w-3" />
          Connect Runtime
        </Button>
      </SimpleTooltip>
    );
  }

  // if (isLaunchingPyodide && activeRuntime) {
  //   return (
  //     <span className="text-muted-foreground flex items-center gap-1 text-xs">
  //       <Spinner /> Starting{" "}
  //       {runtimeTypeToTitle(activeRuntime?.runtimeType ?? "unknown")} Runtime...
  //     </span>
  //   );
  // }

  return (
    <SimpleTooltip content="Open runtime panel">
      <Button
        size="sm"
        variant="ghost"
        className="text-xs"
        onClick={() => setActiveSection("runtime")}
      >
        <Circle
          className={`size-2 fill-current ${getHealthColor(runtimeHealth)}`}
        />
        <span
          className={`text-xs ${getStatusColor(runtimeHealth, runtimeStatus)}`}
        >
          <span className="hidden sm:inline">
            {runtimeTypeToTitle(activeRuntime.runtimeType)}
          </span>{" "}
          {getStatusText(runtimeHealth, runtimeStatus)}
        </span>
      </Button>
    </SimpleTooltip>
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
