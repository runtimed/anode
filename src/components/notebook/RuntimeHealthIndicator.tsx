import React from "react";
import { Circle } from "lucide-react";
import { useRuntimeHealth, RuntimeHealth } from "@/hooks/useRuntimeHealth.js";

interface RuntimeHealthIndicatorProps {
  showStatus?: boolean;
  className?: string;
}

export function getHealthColor(health: RuntimeHealth): string {
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
}

export function getHealthButtonClassNames(health: RuntimeHealth): string {
  switch (health) {
    case "healthy":
      return "bg-green-100 shadow-none text-green-600 border-transparent hover:border-green-300 border-1 hover:border-green-300 hover:bg-green-100";
    case "warning":
      return "bg-amber-50 border-amber-300 hover:border-amber-400 hover:bg-amber-100";
    case "connecting":
      return "bg-blue-50 border-blue-300 hover:border-blue-400 hover:bg-blue-100";
    case "disconnected":
    case "unknown":
    default:
      return "bg-red-50 border-red-300 hover:border-red-400 hover:bg-red-100";
  }
}

export function getStatusText(health: RuntimeHealth, status: string) {
  if (health === "healthy") return "Connected";
  if (health === "warning") return "Connected (Slow)";
  if (health === "connecting") return "Connecting...";
  if (status === "starting") return "Starting";
  return "Disconnected";
}

export function getStatusColor(health: RuntimeHealth, status: string): string {
  if (health === "healthy") return "text-green-600";
  if (health === "warning") return "text-amber-600";
  if (health === "connecting") return "text-blue-600";
  if (status === "starting") return "text-blue-600";
  return "text-red-600";
}

export const RuntimeHealthIndicator: React.FC<RuntimeHealthIndicatorProps> = ({
  showStatus = false,
  className = "",
}) => {
  const { runtimeHealth, runtimeStatus } = useRuntimeHealth();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Circle
        className={`size-2 fill-current ${getHealthColor(runtimeHealth)}`}
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
