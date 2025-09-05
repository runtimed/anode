import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRuntimeHealth } from "@/hooks/useRuntimeHealth";
import type { NotebookProcessed } from "@/components/notebooks/types";
import { RuntSidebarLogo } from "@/components/logo/RuntSidebarLogo";
import { Link } from "react-router-dom";

// Panel Components
import {
  MetadataPanel,
  AiPanel,
  RuntimePanel,
  HelpPanel,
  DebugPanel,
  type SidebarSection,
  type SidebarPanelProps,
} from "./sidebar-panels";

// Configuration
import { getSidebarItems, getSidebarItemConfig } from "./sidebar-panels/config";

// Icons
import { X, ArrowLeft } from "lucide-react";

interface NotebookSidebarProps {
  notebook: NotebookProcessed;
  onUpdate: () => void;
  onAiPanelToggle: (isOpen: boolean) => void;
}

const PANEL_COMPONENTS: Record<SidebarSection, React.FC<SidebarPanelProps>> = {
  metadata: MetadataPanel,
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
              onClick={() => {
                setActiveSection(null);
              }}
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
    </>
  );
};
