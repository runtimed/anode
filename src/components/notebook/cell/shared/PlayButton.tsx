import React from "react";
import { Button } from "@/components/ui/button";
import { Square, Play } from "lucide-react";

interface PlayButtonProps {
  executionState: "idle" | "queued" | "running" | "completed" | "error";
  cellType: string;
  autoFocus?: boolean;
  onExecute: () => void;
  onInterrupt: () => void;
  className?: string;
  size?: "sm" | "default";
  primaryColor?: string;
}

export const PlayButton: React.FC<PlayButtonProps> = ({
  executionState,
  cellType,
  autoFocus = false,
  onExecute,
  onInterrupt,
  className = "",
  size = "sm",
  primaryColor = "text-foreground",
}) => {
  const isRunning = executionState === "running" || executionState === "queued";

  const getExecuteTitle = () => {
    if (executionState === "running" || executionState === "queued") {
      return "Stop execution";
    }
    return `Execute ${cellType} cell`;
  };

  const getPlayButtonContent = () => {
    if (executionState === "running") {
      return <Square className="h-3 w-3" />;
    }
    if (executionState === "queued") {
      return <Square className="h-3 w-3" />;
    }
    return <Play className="h-4 w-4" />;
  };

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={isRunning ? onInterrupt : onExecute}
      className={`${
        size === "sm" ? "h-8 w-8 p-0 sm:hidden" : "h-6 w-6 p-0"
      } hover:bg-muted/80 ${
        autoFocus
          ? primaryColor
          : "text-muted-foreground/40 hover:text-foreground group-hover:text-foreground"
      } ${className}`}
      title={getExecuteTitle()}
    >
      {getPlayButtonContent()}
    </Button>
  );
};
