import React from "react";
import { GitCommitHash } from "@/components/notebook/GitCommitHash";
import type { SidebarPanelProps } from "./types";

import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
// Icons
import { Star, Bug, ExternalLink } from "lucide-react";
import { getOS } from "@/util/os";
import { SidebarGroupLabel } from "./runtime/components";

const os = getOS();

export const HelpPanel: React.FC<SidebarPanelProps> = () => {
  return (
    <div className="space-y-4">
      <SidebarGroupLabel size="sm">Keyboard Shortcuts</SidebarGroupLabel>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Navigate cells</span>
          <KbdGroup>
            <Kbd aria-label="Arrow Up">↑</Kbd>
            <span className="text-xs opacity-70">or</span>
            <Kbd aria-label="Arrow Down" className="ml-1">
              ↓
            </Kbd>
          </KbdGroup>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Run & next</span>
          <KbdGroup>
            <Kbd>Shift</Kbd>
            <Kbd>Enter</Kbd>
          </KbdGroup>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Run cell</span>
          <KbdGroup>
            {os === "mac" ? <Kbd>⌘</Kbd> : <Kbd>Ctrl</Kbd>}
            <Kbd>Enter</Kbd>
          </KbdGroup>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-gray-600">Cycle cell type</div>
            <span className="text-xs text-gray-600">
              (when at start of cell)
            </span>
          </div>
          <KbdGroup>
            <Kbd>Shift</Kbd>
            <Kbd>Tab</Kbd>
          </KbdGroup>
        </div>
      </div>

      <Separator />

      <SidebarGroupLabel size="sm">Getting Started</SidebarGroupLabel>
      <p className="text-xs text-gray-500">
        Pick a cell type above to start experimenting with real-time
        collaborative computing.
      </p>

      <Separator />

      <SidebarGroupLabel size="sm">About In the Loop</SidebarGroupLabel>
      <div className="space-y-3">
        <div className="flex flex-col space-y-2">
          <a
            href="https://github.com/runtimed/intheloop"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-gray-100"
          >
            <Star className="h-3 w-3" />
            <span>Star us on GitHub</span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
          <a
            href="https://github.com/runtimed/intheloop/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-gray-100"
          >
            <Bug className="h-3 w-3" />
            <span>Report a bug</span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
        </div>
        <Separator />
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Build:</span>
          <GitCommitHash />
        </div>
      </div>
    </div>
  );
};
