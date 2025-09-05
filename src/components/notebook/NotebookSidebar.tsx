import React, { useState, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Button } from "@/components/ui/button";
import { TagBadge } from "@/components/notebooks/TagBadge";
import { TagSelectionDialog } from "@/components/notebooks/TagSelectionDialog";
import { ContextSelectionModeButton } from "@/components/notebook/ContextSelectionModeButton";
import { RuntimeHealthIndicatorButton } from "@/components/notebook/RuntimeHealthIndicatorButton";
import { RuntimeHelper } from "@/components/notebook/RuntimeHelper";
import { useRuntimeHealth } from "@/hooks/useRuntimeHealth";
import type { NotebookProcessed } from "@/components/notebooks/types";
import { RuntLogoSmall } from "@/components/logo/RuntLogoSmall";
import { Link } from "react-router-dom";

// Icons
import { Tag, Brain, Cog, Bug, X, ArrowLeft } from "lucide-react";

// Lazy import DebugPanel only in development
const LazyDebugPanel = React.lazy(() =>
  import("@/components/debug/DebugPanel").then((module) => ({
    default: module.DebugPanel,
  }))
);

interface NotebookSidebarProps {
  notebook: NotebookProcessed;
  notebookId: string;
  onUpdate: () => void;
  onAiPanelToggle: (isOpen: boolean) => void;
}

type SidebarSection = "metadata" | "ai" | "runtime" | "debug";

export const NotebookSidebar: React.FC<NotebookSidebarProps> = ({
  notebook,
  notebookId,
  onUpdate,
  onAiPanelToggle,
}) => {
  const [activeSection, setActiveSection] = useState<SidebarSection | null>(
    null
  );
  const [isTagSelectionOpen, setIsTagSelectionOpen] = useState(false);
  const [showRuntimeHelper, setShowRuntimeHelper] = useState(false);
  const { hasActiveRuntime, runtimeHealth } = useRuntimeHealth();

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

  const handleRuntimeClick = () => {
    setShowRuntimeHelper(true);
    setActiveSection(null);
  };

  const sidebarItems = [
    {
      id: "metadata" as SidebarSection,
      icon: Tag,
      tooltip: "Tags & Metadata",
    },
    {
      id: "ai" as SidebarSection,
      icon: Brain,
      tooltip: "AI Controls",
    },
    ...(hasActiveRuntime ||
    runtimeHealth !== "healthy" ||
    activeSection === "runtime"
      ? [
          {
            id: "runtime" as SidebarSection,
            icon: Cog,
            tooltip: "Runtime",
          },
        ]
      : []),
    ...(import.meta.env.DEV
      ? [
          {
            id: "debug" as SidebarSection,
            icon: Bug,
            tooltip: "Debug",
          },
        ]
      : []),
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
              <div className="flex h-4 w-4 items-center justify-center">
                <div className="h-4 w-4 [&>*]:!h-4 [&>*]:!w-4">
                  <RuntLogoSmall />
                </div>
              </div>
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
                <div className="space-y-6">
                  <div>
                    <h4 className="mb-3 text-sm font-medium text-gray-700">
                      Runtime Status
                    </h4>
                    <RuntimeHealthIndicatorButton
                      onToggleClick={handleRuntimeClick}
                    />
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="mb-3 text-sm font-medium text-gray-700">
                      Runtime Configuration
                    </h4>
                    <p className="text-xs text-gray-500">
                      Runtime management controls and settings
                    </p>
                  </div>
                </div>
              )}

              {activeSection === "debug" && import.meta.env.DEV && (
                <div className="h-full">
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
                      <LazyDebugPanel />
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

      <RuntimeHelper
        notebookId={notebookId}
        showRuntimeHelper={showRuntimeHelper}
        onClose={() => setShowRuntimeHelper(false)}
      />
    </>
  );
};
