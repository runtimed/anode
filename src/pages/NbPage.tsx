import { AppSidebar } from "@/components/app-sidebar";
import { useDebug } from "@/components/debug/debug-mode";
import {
  LivestoreProviderProvider,
  LiveStoreReady,
} from "@/components/livestore/LivestoreProviderProvider";
import { NbLiveStore } from "@/components/notebooks/NbLiveStore";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import React from "react";
import { useParams } from "react-router-dom";

const SidebarRightDebug = React.lazy(() =>
  import("@/components/right-sidebar-debug").then((m) => ({
    default: m.SidebarRightDebug,
  }))
);

export default function NbPage() {
  const { id } = useParams<{ id: string }>();
  const debug = useDebug();

  // Should never happen
  if (!id) {
    throw new Error("No notebook id");
  }

  return (
    <LivestoreProviderProvider storeId={id}>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "350px",
          } as React.CSSProperties
        }
      >
        <AppSidebar />
        <SidebarInset className="h-dvh overflow-y-scroll overscroll-contain">
          <header className="bg-background sticky top-0 z-50 flex shrink-0 items-center gap-2 border-b p-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">All Inboxes</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Inbox</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            {id && <NbLiveStore id={id} />}
            <div className="h-[70vh]"></div>
            {!id && <div>No notebook id</div>}
            <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
          </div>
        </SidebarInset>
        <LiveStoreReady>
          {import.meta.env.DEV && debug.enabled && <SidebarRightDebug />}
        </LiveStoreReady>
      </SidebarProvider>
    </LivestoreProviderProvider>
  );
}
