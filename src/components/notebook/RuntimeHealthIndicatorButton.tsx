import { useRuntimeHealth } from "@/hooks/useRuntimeHealth.js";
import { Terminal } from "lucide-react";
import React from "react";
import { Button } from "../ui/button";
import { RuntimeHealthIndicator } from "./RuntimeHealthIndicator";

interface RuntimeHealthIndicatorProps {
  onToggleClick: () => void;
}

export const RuntimeHealthIndicatorButton: React.FC<
  RuntimeHealthIndicatorProps
> = ({ onToggleClick }) => {
  const { activeRuntime } = useRuntimeHealth();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onToggleClick}
      className="flex items-center gap-1 sm:gap-2"
    >
      <Terminal className="h-3 w-3 sm:h-4 sm:w-4" />

      <span className="hidden text-xs sm:block sm:text-sm">
        {activeRuntime?.runtimeType ?? "unknown"}
      </span>

      <RuntimeHealthIndicator />
    </Button>
  );
};
