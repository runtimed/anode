"use client";

import {
  Box,
  Database,
  EyeOff,
  Folder,
  FunctionSquare,
  History,
  List,
} from "lucide-react";
import * as React from "react";
import { useLocalStorage } from "react-use";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link } from "react-router-dom";
import { RuntLogoSmall } from "./logo/RuntLogoSmall";

// This is sample data
const data = {
  navMain: [
    {
      title: "Files",
      url: "#",
      icon: Folder,
      isActive: false,
    },
    {
      title: "Data",
      url: "#",
      icon: Database,
      isActive: false,
    },
    {
      title: "Environments",
      url: "#",
      icon: Box,
      isActive: false,
    },
    {
      title: "Table of Contents",
      url: "#",
      icon: List,
      isActive: false,
    },
    {
      title: "Secrets",
      url: "#",
      icon: EyeOff,
      isActive: false,
    },
    {
      title: "Variables",
      url: "#",
      icon: FunctionSquare,
      isActive: false,
    },
    {
      title: "History",
      url: "#",
      icon: History,
      isActive: false,
    },
  ],
} as const;

type MenuItem = (typeof data.navMain)[number];

export function AppSidebarNb({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  // Note: I'm using state to show active item.
  // IRL you should use the url/router.
  const [activeItem, setActiveItem] = useLocalStorage<MenuItem>(
    "sidebar-active-item",
    data.navMain[0]
  );
  const { open, setOpen } = useSidebar();

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row"
      {...props}
    >
      {/* This is the first sidebar */}
      {/* We disable collapsible and adjust width to icon. */}
      {/* This will make the sidebar appear as icons. */}
      <Sidebar
        collapsible="none"
        className="!w-[calc(var(--sidebar-width-icon)_+_1px)] border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                asChild
                className="rounded-none md:h-8 md:p-0"
              >
                <Link to="/">
                  <RuntLogoSmall className="sm:size-8" />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Anode</span>
                    {/* <span className="truncate text-xs">Enterprise</span> */}
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {data.navMain.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={{
                        children: item.title,
                        hidden: false,
                      }}
                      onClick={() => {
                        // Click on the same item again to close the sidebar
                        if (activeItem?.title === item.title && open) {
                          setOpen(false);
                        } else {
                          // Click on a different item to open the sidebar
                          setActiveItem(item);
                          setOpen(true);
                        }
                      }}
                      isActive={activeItem?.title === item.title && open}
                      className="px-2.5 md:px-2"
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>{/* <NavUser /> */}</SidebarFooter>
      </Sidebar>

      {/* This is the second sidebar */}
      {/* We disable collapsible and let it fill remaining space */}
      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        <SidebarHeader className="flex h-14 flex-row items-center gap-3.5 border-b px-4">
          <div className="flex w-full items-center justify-between">
            <div className="text-foreground text-base font-medium">
              {activeItem?.title}
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="p-4">
            <SidebarGroupContent>Content</SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  );
}
