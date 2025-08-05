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
    <span className={cn("text-muted-foreground font-mono text-xs", className)}>
      {commitHash}
    </span>
  );
};
