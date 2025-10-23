import { RuntSidebarLogo } from "@/components/logo/RuntSidebarLogo";
import type { NotebookProcessed } from "@/components/notebooks/types";
import { Button } from "@/components/ui/button";
import { useRuntimeHealth } from "@/hooks/useRuntimeHealth";
import React, { useState } from "react";
import { Link } from "react-router-dom";

// Panel Components
import {
  AiPanel,
  DebugPanel,
  FilesPanel,
  HelpPanel,
  MetadataPanel,
  RuntimePanel,
  type SidebarPanelProps,
  type SidebarSection,
} from "./sidebar-panels";

// Configuration
import { getSidebarItemConfig, getSidebarItems } from "./sidebar-panels/config";

// Icons
import { useFeatureFlag } from "@/contexts/FeatureFlagContext";
import { availableFiles$ } from "@/queries";
import { useQuery } from "@livestore/react";
import { ArrowLeft, X } from "lucide-react";
import { DebugModeToggle } from "../debug/DebugModeToggle";

interface NotebookSidebarProps {
  notebook: NotebookProcessed;
  onUpdate: () => void;
  onAiPanelToggle: (isOpen: boolean) => void;
}

const PANEL_COMPONENTS: Record<SidebarSection, React.FC<SidebarPanelProps>> = {
  metadata: MetadataPanel,
  files: FilesPanel,
  ai: AiPanel,
  runtime: RuntimePanel,
  debug: DebugPanel,
  help: HelpPanel,
};

export const NotebookSidebar: React.FC<NotebookSidebarProps> = ({
  notebook,
  onUpdate,
  onAiPanelToggle,
}) => {
  const [activeSection, setActiveSection] = useState<SidebarSection | null>(
    null
  );
  const { hasActiveRuntime, runtimeHealth } = useRuntimeHealth();
  const showFilesPanel = useFeatureFlag("file-upload");
  const availableFiles = useQuery(availableFiles$);
  const fileCount = availableFiles?.length ?? 0;

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

  const sidebarItems = getSidebarItems({
    hasActiveRuntime,
    runtimeHealth,
    activeSection,
    isDev: import.meta.env.DEV,
    showFilesPanel,
  });

  const renderPanelContent = () => {
    if (!activeSection) return null;

    const PanelComponent = PANEL_COMPONENTS[activeSection];
    const panelProps: SidebarPanelProps = { notebook, onUpdate };

    return <PanelComponent {...panelProps} />;
  };

  const activeItem = activeSection ? getSidebarItemConfig(activeSection) : null;

  return (
    <>
      {/* Desktop: Icon-only sidebar (hidden on mobile) */}
      <div className="fixed top-0 left-0 z-40 hidden h-full w-12 flex-col items-center border-r bg-gray-50 py-4 lg:flex">
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
                className={`relative h-8 w-8 ${
                  isActive
                    ? "bg-blue-100 text-blue-600 hover:bg-blue-200"
                    : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                }`}
                title={item.tooltip}
              >
                <Icon className="h-4 w-4" />
                {item.id === "files" && fileCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex h-3 min-w-3 items-center justify-center rounded-full bg-gray-300 px-1 text-[9px] font-normal text-black">
                    {fileCount > 99 ? "99+" : fileCount}
                  </span>
                )}
              </Button>
            );
          })}

          {import.meta.env.DEV && (
            <div className="mx-auto">
              <DebugModeToggle />
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Bottom navigation bar (hidden on desktop) */}
      <div className="fixed right-0 bottom-0 left-0 z-40 flex items-center justify-center border-t bg-white p-2 shadow-lg lg:hidden">
        {/* Back button */}
        <div className="flex w-full items-center justify-between px-2">
          <Link
            to="/nb"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200"
            title="Back to Notebooks"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>

          {/* Mobile sidebar items */}
          <div className="flex items-center space-x-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleSection(item.id)}
                  className={`h-10 w-10 ${
                    isActive
                      ? "bg-blue-100 text-blue-600 hover:bg-blue-200"
                      : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                  }`}
                  title={item.tooltip}
                >
                  <Icon className="h-5 w-5" />
                </Button>
              );
            })}
          </div>

          {/* Spacer for visual balance */}
          <div className="h-10 w-10" />
        </div>
      </div>

      {/* Desktop: Slide-out panel from left */}
      {activeSection && (
        <>
          {/* Desktop backdrop - only for non-AI panels */}
          {activeSection !== "ai" && (
            <div
              className="fixed inset-0 z-30 hidden bg-black/20 lg:block"
              onClick={() => {
                setActiveSection(null);
              }}
            />
          )}

          {/* Desktop panel */}
          <div
            className={`fixed top-0 left-12 z-50 hidden h-full w-80 overflow-auto border-r bg-white shadow-lg lg:block ${
              activeSection === "ai" ? "z-40" : "z-50"
            }`}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-medium text-gray-900">{activeItem?.title}</h3>
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

            <div className="p-4">{renderPanelContent()}</div>
          </div>
        </>
      )}

      {/* Mobile: Bottom sheet panel */}
      {activeSection && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-30 bg-black/20 lg:hidden"
            onClick={() => {
              if (activeSection === "ai") {
                onAiPanelToggle(false);
              }
              setActiveSection(null);
            }}
          />

          {/* Mobile bottom sheet */}
          <div className="fixed right-0 bottom-0 left-0 z-50 max-h-[70vh] overflow-auto rounded-t-xl border-t bg-white shadow-2xl lg:hidden">
            {/* Handle bar */}
            <div className="flex justify-center p-2">
              <div className="h-1 w-12 rounded-full bg-gray-300" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-lg font-medium text-gray-900">
                {activeItem?.title}
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

            {/* Content */}
            <div className="p-4 pb-20">{renderPanelContent()}</div>
          </div>
        </>
      )}
    </>
  );
};
