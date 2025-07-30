import React from "react";
import { Circle } from "lucide-react";
import { useRuntimeHealth, RuntimeHealth } from "@/hooks/useRuntimeHealth.js";

interface RuntimeHealthIndicatorProps {
  showStatus?: boolean;
  className?: string;
}

export const RuntimeHealthIndicator: React.FC<RuntimeHealthIndicatorProps> = ({
  showStatus = false,
  className = "",
}) => {
  const { runtimeHealth, runtimeStatus } = useRuntimeHealth();

  const getHealthColor = (health: RuntimeHealth): string => {
    switch (health) {
      case "healthy":
        return "text-green-500";
      case "warning":
        return "text-amber-500";
      case "connecting":
        return "text-blue-500";
      case "disconnected":
      case "unknown":
      default:
        return "text-red-500";
    }
  };

  const getStatusText = (health: RuntimeHealth, status: string): string => {
    if (health === "healthy") return "Connected";
    if (health === "warning") return "Connected (Slow)";
    if (health === "connecting") return "Connecting...";
    if (status === "starting") return "Starting";
    return "Disconnected";
  };

  const getStatusColor = (health: RuntimeHealth, status: string): string => {
    if (health === "healthy") return "text-green-600";
    if (health === "warning") return "text-amber-600";
    if (health === "connecting") return "text-blue-600";
    if (status === "starting") return "text-blue-600";
    return "text-red-600";
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Circle
        className={`h-2 w-2 fill-current ${getHealthColor(runtimeHealth)}`}
      />
      {showStatus && (
        <span
          className={`text-xs ${getStatusColor(runtimeHealth, runtimeStatus)}`}
        >
          {getStatusText(runtimeHealth, runtimeStatus)}
        </span>
      )}
    </div>
  );
};
