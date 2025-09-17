import type { NotebookProcessed } from "@/components/notebooks/types";

export interface SidebarPanelProps {
  notebook: NotebookProcessed;
  onUpdate: () => void;
}

export type SidebarSection = "metadata" | "ai" | "runtime" | "debug" | "help";

export interface SidebarItemConfig {
  id: SidebarSection;
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
  title: string;
}

export interface SidebarPanelComponent extends React.FC<SidebarPanelProps> {
  displayName?: string;
}
