import React from "react";
import { Button } from "@/components/ui/button";
import { Square, Play } from "lucide-react";
// import { TerminalPlay } from "../../ui/TerminalPlay.js";
import { tables } from "@runt/schema";

interface PlayButtonProps {
  cell: typeof tables.cells.Type;
  autoFocus?: boolean;
  onExecute: () => void;
  onInterrupt: () => void;
  className?: string;
  size?: "sm" | "default";
  primaryColor?: string;
}

export const PlayButton: React.FC<PlayButtonProps> = ({
  cell,
  autoFocus = false,
  onExecute,
  onInterrupt,
  className = "",
  size = "sm",
  primaryColor = "text-foreground",
}) => {
  const isRunning =
    cell.executionState === "running" || cell.executionState === "queued";

  const getExecuteTitle = () => {
    if (cell.executionState === "running" || cell.executionState === "queued") {
      return "Stop execution";
    }
    return `Execute ${cell.cellType} cell`;
  };

  const getPlayButtonContent = () => {
    if (cell.executionState === "running") {
      return <Square className="h-3 w-3" />;
    }
    if (cell.executionState === "queued") {
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
