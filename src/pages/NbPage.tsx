import { AppSidebar } from "@/components/app-sidebar";
import {
  LivestoreProviderProvider,
  LiveStoreReady,
} from "@/components/livestore/LivestoreProviderProvider";
import { NbLiveStore } from "@/components/notebooks/NbLiveStore";
import { SidebarRightDebug } from "@/components/right-sidebar-debug";
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
import { useParams } from "react-router-dom";

export default function NbPage() {
  const { id } = useParams<{ id: string }>();

  // Should never happen
  if (!id) {
    throw new Error("No notebook id");
  }

  return (
    <LivestoreProviderProvider storeId={id}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="#">
                      Building Your Application
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            {id && <NbLiveStore id={id} />}
            <div className="h-[70vh]"></div>
            {!id && <div>No notebook id</div>}
            <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
          </div>
        </SidebarInset>
        <LiveStoreReady>
          <SidebarRightDebug />
        </LiveStoreReady>
      </SidebarProvider>
    </LivestoreProviderProvider>
  );
}
