import React from "react";
import { cn } from "@/lib/utils";

interface GitCommitHashProps {
  className?: string;
}

export const GitCommitHash: React.FC<GitCommitHashProps> = ({ className }) => {
  const commitHash = import.meta.env.VITE_GIT_COMMIT_HASH;

  if (!commitHash) {
    return null;
  }

  return (
    <span
      className={cn(
        "text-muted-foreground/60 font-mono text-[10px]",
        className
      )}
    >
      {commitHash}
    </span>
  );
};
