import React, { useState, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Button } from "@/components/ui/button";
import { TagBadge } from "@/components/notebooks/TagBadge";
import { TagSelectionDialog } from "@/components/notebooks/TagSelectionDialog";
import { ContextSelectionModeButton } from "@/components/notebook/ContextSelectionModeButton";

import { RuntimeHealthIndicator } from "@/components/notebook/RuntimeHealthIndicator";
import { useRuntimeHealth } from "@/hooks/useRuntimeHealth";
import type { NotebookProcessed } from "@/components/notebooks/types";
import { RuntSidebarLogo } from "@/components/logo/RuntSidebarLogo";
import { GitCommitHash } from "@/components/notebook/GitCommitHash";
import { Link } from "react-router-dom";

// Icons
import {
  Tag,
  ListChecks,
  MonitorCheck,
  MonitorOff,
  DatabaseZap,
  X,
  ArrowLeft,
  HelpCircle,
  Star,
  Bug,
  ExternalLink,
} from "lucide-react";

// Lazy import DebugPanel only in development
const LazyDebugPanel = React.lazy(() =>
  import("@/components/debug/DebugPanel").then((module) => ({
    default: module.DebugPanel,
  }))
);

interface NotebookSidebarProps {
  notebook: NotebookProcessed;
  onUpdate: () => void;
  onAiPanelToggle: (isOpen: boolean) => void;
}

type SidebarSection = "metadata" | "ai" | "runtime" | "debug" | "help";

export const NotebookSidebar: React.FC<NotebookSidebarProps> = ({
  notebook,
  onUpdate,
  onAiPanelToggle,
}) => {
  const [activeSection, setActiveSection] = useState<SidebarSection | null>(
    null
  );
  const [isTagSelectionOpen, setIsTagSelectionOpen] = useState(false);
  const { hasActiveRuntime, runtimeHealth, activeRuntime } = useRuntimeHealth();

  const toggleSection = (section: SidebarSection) => {
    const newActiveSection = activeSection === section ? null : section;

    // If we're switching away from AI panel to another panel, notify parent
    if (activeSection === "ai" && newActiveSection !== "ai") {
      onAiPanelToggle(false);
    }

    setActiveSection(newActiveSection);

    // Notify parent when AI panel toggles
    if (section === "ai") {
      onAiPanelToggle(newActiveSection === "ai");
    }
  };

  const handleTagsClick = () => {
    setIsTagSelectionOpen(true);
    setActiveSection(null);
  };

  const sidebarItems = [
    {
      id: "metadata" as SidebarSection,
      icon: Tag,
      tooltip: "Tags & Metadata",
    },
    ...(hasActiveRuntime ||
    runtimeHealth !== "healthy" ||
    activeSection === "runtime"
      ? [
          {
            id: "runtime" as SidebarSection,
            icon: hasActiveRuntime ? MonitorCheck : MonitorOff,
            tooltip: "Runtime",
          },
        ]
      : []),
    {
      id: "ai" as SidebarSection,
      icon: ListChecks,
      tooltip: "AI Context Controls",
    },
    ...(import.meta.env.DEV
      ? [
          {
            id: "debug" as SidebarSection,
            icon: DatabaseZap,
            tooltip: "LiveStore Debug",
          },
        ]
      : []),
    {
      id: "help" as SidebarSection,
      icon: HelpCircle,
      tooltip: "Help & Shortcuts",
    },
  ];

  return (
    <>
      {/* Icon-only sidebar */}
      <div className="fixed top-0 left-0 z-40 flex h-full w-12 flex-col items-center border-r bg-gray-50 py-4">
        {/* Logo and back navigation */}
        <div className="mb-4 flex flex-col items-center space-y-2">
          <Link
            to="/nb"
            className="group/logo relative flex h-8 w-8 items-center justify-center rounded hover:bg-gray-200"
            title="Back to Notebooks"
          >
            <span className="relative transition-opacity group-hover/logo:opacity-20">
              <RuntSidebarLogo />
            </span>
            <ArrowLeft className="absolute h-4 w-4 opacity-0 transition-opacity group-hover/logo:opacity-100" />
          </Link>
        </div>

        {/* Sidebar items */}
        <div className="flex flex-col space-y-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <Button
                key={item.id}
                variant="ghost"
                size="icon"
                onClick={() => toggleSection(item.id)}
                className={`h-8 w-8 ${
                  isActive
                    ? "bg-blue-100 text-blue-600 hover:bg-blue-200"
                    : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                }`}
                title={item.tooltip}
              >
                <Icon className="h-4 w-4" />
              </Button>
            );
          })}
        </div>
      </div>

      {/* Slide-out panel */}
      {activeSection && (
        <>
          {/* Backdrop - only for non-AI panels */}
          {activeSection !== "ai" && (
            <div
              className="fixed inset-0 z-30 bg-black/20"
              onClick={() => setActiveSection(null)}
            />
          )}

          {/* Panel - different positioning for AI vs others */}
          <div
            className={
              activeSection === "ai"
                ? "fixed top-0 left-12 z-40 h-full w-80 overflow-auto border-r bg-white shadow-lg"
                : "fixed top-0 left-12 z-50 h-full w-80 overflow-auto border-r bg-white shadow-lg"
            }
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-medium text-gray-900">
                {activeSection === "metadata" && "Tags & Metadata"}
                {activeSection === "ai" && "AI Context Controls"}
                {activeSection === "runtime" && "Runtime Configuration"}
                {activeSection === "debug" && "Debug Panel"}
                {activeSection === "help" && "Help & Keyboard Shortcuts"}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (activeSection === "ai") {
                    onAiPanelToggle(false);
                  }
                  setActiveSection(null);
                }}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4">
              {activeSection === "metadata" && (
                <div className="space-y-4">
                  <div>
                    <h4 className="mb-3 text-sm font-medium text-gray-700">
                      Current Tags
                    </h4>
                    <div className="mb-4 flex flex-wrap gap-2">
                      {notebook.tags?.length ? (
                        notebook.tags.map((tag) => (
                          <TagBadge key={tag.id} tag={tag} />
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">
                          No tags assigned
                        </span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTagsClick}
                      className="w-full"
                    >
                      <Tag className="mr-2 h-4 w-4" />
                      {notebook.tags?.length ? "Edit Tags" : "Add Tags"}
                    </Button>
                  </div>
                </div>
              )}

              {activeSection === "ai" && (
                <div className="space-y-6">
                  <div>
                    <h4 className="mb-3 text-sm font-medium text-gray-700">
                      Context Selection
                    </h4>
                    <p className="mb-3 text-xs text-gray-500">
                      Control which cells are included in AI context
                    </p>
                    <ContextSelectionModeButton />
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="mb-3 text-sm font-medium text-gray-700">
                      AI Settings
                    </h4>
                    <p className="text-xs text-gray-500">
                      Additional AI configuration options will be added here
                    </p>
                  </div>
                </div>
              )}

              {activeSection === "runtime" && (
                <div className="space-y-4">
                  <div>
                    <h4 className="mb-3 text-sm font-medium text-gray-700">
                      Runtime Status
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">
                          Connection
                        </span>
                        <RuntimeHealthIndicator showStatus />
                      </div>
                      {hasActiveRuntime && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Type</span>
                          <span className="font-mono text-xs">
                            {activeRuntime?.runtimeType ?? "unknown"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {hasActiveRuntime && activeRuntime && (
                    <div className="border-t pt-4">
                      <h4 className="mb-2 text-xs font-medium text-gray-700">
                        Runtime Details
                      </h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Session:</span>
                          <code className="rounded bg-gray-100 px-1 text-xs">
                            {activeRuntime.sessionId.slice(-8)}
                          </code>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span
                            className={`text-xs font-medium ${
                              activeRuntime.status === "ready"
                                ? "text-green-600"
                                : activeRuntime.status === "busy"
                                  ? "text-amber-600"
                                  : "text-red-600"
                            }`}
                          >
                            {activeRuntime.status === "ready"
                              ? "Ready"
                              : activeRuntime.status === "busy"
                                ? "Busy"
                                : activeRuntime.status.charAt(0).toUpperCase() +
                                  activeRuntime.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!hasActiveRuntime && (
                    <div className="border-t pt-4">
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500">
                          Start a runtime to execute code cells.
                        </p>
                        <p className="text-xs text-gray-500">
                          Setup instructions will be available here.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeSection === "help" && (
                <div className="space-y-6">
                  <div>
                    <h4 className="mb-3 text-sm font-medium text-gray-700">
                      Keyboard Shortcuts
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Navigate cells</span>
                        <code className="rounded bg-gray-100 px-2 py-1 text-xs">
                          ↑↓
                        </code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Run & next</span>
                        <code className="rounded bg-gray-100 px-2 py-1 text-xs">
                          Shift+Enter
                        </code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Run cell</span>
                        <code className="rounded bg-gray-100 px-2 py-1 text-xs">
                          Ctrl+Enter
                        </code>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="mb-3 text-sm font-medium text-gray-700">
                      Getting Started
                    </h4>
                    <p className="text-xs text-gray-500">
                      Pick a cell type above to start experimenting with
                      real-time collaborative computing.
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="mb-3 text-sm font-medium text-gray-700">
                      About Anode
                    </h4>
                    <div className="space-y-3">
                      <div className="flex flex-col space-y-2">
                        <a
                          href="https://github.com/runtimed/anode"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-gray-100"
                        >
                          <Star className="h-3 w-3" />
                          <span>Star us on GitHub</span>
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                        <a
                          href="https://github.com/runtimed/anode/issues"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-gray-100"
                        >
                          <Bug className="h-3 w-3" />
                          <span>Report a bug</span>
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                      </div>
                      <div className="border-t pt-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Build:</span>
                          <GitCommitHash />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "debug" && import.meta.env.DEV && (
                <div className="h-full">
                  <div className="mb-3">
                    <p className="text-xs text-gray-500">
                      LiveStore database debugging and inspection tools.
                    </p>
                  </div>
                  <Suspense
                    fallback={
                      <div className="p-4 text-xs text-gray-500">
                        Loading debug panel...
                      </div>
                    }
                  >
                    <ErrorBoundary
                      fallback={
                        <div className="text-sm text-red-500">
                          Error rendering debug panel
                        </div>
                      }
                    >
                      <div className="w-full max-w-full overflow-hidden">
                        <LazyDebugPanel />
                      </div>
                    </ErrorBoundary>
                  </Suspense>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Existing dialogs */}
      <TagSelectionDialog
        notebookId={notebook.id}
        isOpen={isTagSelectionOpen}
        onClose={() => setIsTagSelectionOpen(false)}
        onUpdate={onUpdate}
      />
    </>
  );
};
