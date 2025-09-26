import { cn } from "@/lib/utils";
import { Play, Square } from "lucide-react";
import React from "react";

interface PlayButtonProps {
  executionState: "idle" | "queued" | "running" | "completed" | "error";
  cellType: string;
  isFocused?: boolean;
  onExecute: () => void;
  onInterrupt: () => void;
  className?: string;
  focusedClass?: string;
}

export const PlayButton: React.FC<PlayButtonProps> = ({
  executionState,
  cellType,
  isFocused = false,
  onExecute,
  onInterrupt,
  className = "",
  focusedClass = "text-foreground",
}) => {
  const isRunning = executionState === "running" || executionState === "queued";
  const title = isRunning ? "Stop execution" : `Execute ${cellType} cell`;

  return (
    <button
      onClick={isRunning ? onInterrupt : onExecute}
      className={cn(
        "hover:bg-muted/80 flex items-center justify-center rounded-sm bg-white p-1 transition-colors",
        isFocused
          ? focusedClass
          : "text-muted-foreground/40 hover:text-foreground group-hover:text-foreground",
        className
      )}
      title={title}
    >
      {isRunning ? (
        <Square fill="white" className="size-4" />
      ) : (
        <Play fill="white" className="size-4" />
      )}
    </button>
  );
};
