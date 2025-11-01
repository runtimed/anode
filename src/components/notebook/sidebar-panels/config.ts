import {
  BotIcon,
  Cpu,
  DatabaseZap,
  Folder,
  HelpCircle,
  Tag,
} from "lucide-react";
import type { SidebarItemConfig, SidebarSection } from "./types";

interface SidebarConfigOptions {
  hasActiveRuntime: boolean;
  runtimeHealth: string;
  activeSection: SidebarSection | null;
  isDev: boolean;
  showFilesPanel: boolean;
}

const SIDEBAR_ITEM_CONFIGS: Record<SidebarSection, SidebarItemConfig> = {
  metadata: {
    id: "metadata",
    icon: Tag,
    tooltip: "Tags & Metadata",
    title: "Tags",
  },
  runtime: {
    id: "runtime",
    icon: Cpu,
    tooltip: "Runtime",
    title: "Runtime Configuration",
  },
  ai: {
    id: "ai",
    icon: BotIcon,
    tooltip: "AI Context Controls",
    title: "AI Context Controls",
  },
  files: {
    id: "files",
    icon: Folder,
    tooltip: "Files",
    title: "Files",
  },
  debug: {
    id: "debug",
    icon: DatabaseZap,
    tooltip: "LiveStore Debug",
    title: "Debug Panel",
  },
  help: {
    id: "help",
    icon: HelpCircle,
    tooltip: "Help & Shortcuts",
    title: "Help & Keyboard Shortcuts",
  },
};

export function getSidebarItems(
  options: SidebarConfigOptions
): SidebarItemConfig[] {
  const { isDev, showFilesPanel } = options;

  const items: SidebarItemConfig[] = [];

  // Always show metadata panel
  items.push(SIDEBAR_ITEM_CONFIGS.metadata);

  items.push(SIDEBAR_ITEM_CONFIGS.runtime);

  // Always show AI panel
  items.push(SIDEBAR_ITEM_CONFIGS.ai);

  if (showFilesPanel) {
    items.push(SIDEBAR_ITEM_CONFIGS.files);
  }

  // Show debug panel only in development
  if (isDev) {
    items.push(SIDEBAR_ITEM_CONFIGS.debug);
  }

  // Always show help panel
  items.push(SIDEBAR_ITEM_CONFIGS.help);

  return items;
}

export function getSidebarItemConfig(
  section: SidebarSection
): SidebarItemConfig {
  return SIDEBAR_ITEM_CONFIGS[section];
}
