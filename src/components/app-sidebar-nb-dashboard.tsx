"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { RuntLogoSmall } from "./logo/RuntLogoSmall";
import { Filters } from "./notebooks/dashboard/NotebookDashboard";
import { NotebookProcessed } from "./notebooks/types";

export function AppSidebarNbDashboard({
  allNotebooks,
}: {
  allNotebooks: NotebookProcessed[];
}) {
  return (
    <Sidebar className="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row">
      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        <SidebarHeader className="flex h-14 items-center gap-3.5 border-b px-2">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <RuntLogoSmall className="sm:size-8" />
              <div className="text-foreground text-base font-medium">Anode</div>
            </div>
            {/* <Label className="flex items-center gap-2 text-sm">
              <span>Unreads</span>
              <Switch className="shadow-none" />
            </Label> */}
          </div>
          {/* <SidebarInput placeholder="Type to search..." /> */}
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              <Filters allNotebooks={allNotebooks} />
              {/* {mails.map((mail) => (
                <a
                  href="#"
                  key={mail.email}
                  className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight whitespace-nowrap last:border-b-0"
                >
                  <div className="flex w-full items-center gap-2">
                    <span>{mail.name}</span>{" "}
                    <span className="ml-auto text-xs">{mail.date}</span>
                  </div>
                  <span className="font-medium">{mail.subject}</span>
                  <span className="line-clamp-2 w-[260px] text-xs whitespace-break-spaces">
                    {mail.teaser}
                  </span>
                </a>
              ))} */}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  );
}
