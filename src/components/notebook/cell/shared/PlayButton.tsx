import { cn } from "@/lib/utils";
import { Play, Square, Loader2 } from "lucide-react";
import React from "react";

interface PlayButtonProps {
  executionState: "idle" | "queued" | "running" | "completed" | "error";
  cellType: string;
  isFocused?: boolean;
  onExecute: () => void;
  onInterrupt: () => void;
  className?: string;
  focusedClass?: string;
  isAutoLaunching?: boolean;
}

export const PlayButton: React.FC<PlayButtonProps> = ({
  executionState,
  cellType,
  isFocused = false,
  onExecute,
  onInterrupt,
  className = "",
  focusedClass = "text-foreground",
  isAutoLaunching = false,
}) => {
  const isRunning = executionState === "running" || executionState === "queued";
  const title = isAutoLaunching
    ? "Starting runtime..."
    : isRunning
      ? "Stop execution"
      : `Execute ${cellType} cell`;

  return (
    <button
      onClick={isRunning ? onInterrupt : onExecute}
      disabled={isAutoLaunching}
      className={cn(
        "hover:bg-muted/80 flex items-center justify-center rounded-sm bg-white p-1 transition-colors",
        isFocused
          ? focusedClass
          : "text-muted-foreground/40 hover:text-foreground group-hover:text-foreground",
        isAutoLaunching && "cursor-wait opacity-75",
        className
      )}
      title={title}
    >
      {isAutoLaunching ? (
        <Loader2 className="size-4 animate-spin" />
      ) : isRunning ? (
        <Square fill="white" className="size-4" />
      ) : (
        <Play fill="white" className="size-4" />
      )}
    </button>
  );
};
