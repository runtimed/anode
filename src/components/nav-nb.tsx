"use client";

import { Bug } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useDebug } from "./debug/debug-mode";
import { Switch } from "./ui/switch";

export function NavNb() {
  const debug = useDebug();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarMenu>
        {/* <SidebarMenuItem>
          <SidebarMenuButton>
            <MoreHorizontal />
            <span>More</span>
          </SidebarMenuButton>
        </SidebarMenuItem> */}
        {import.meta.env.DEV && (
          // TODO: put this in a component and lazy load it
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => debug.setEnabled(!debug.enabled)}>
              <Bug />
              <span className="pointer-events-none flex-1 select-none">
                Show debug info
              </span>
              <Switch
                asDiv
                className="pointer-events-none"
                checked={debug.enabled}
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
