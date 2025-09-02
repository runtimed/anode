import { AppSidebarNbDashboard } from "@/components/app-sidebar-nb-dashboard";
import { TopHeader } from "@/components/notebooks/dashboard/NotebookDashboard";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import { useDebug } from "@/components/debug/debug-mode";
import { LoadingState } from "@/components/loading/LoadingState";
import { GitCommitHash } from "@/components/notebook/GitCommitHash";
import {
  useDashboardParams,
  useSmartDefaultFilter,
} from "@/components/notebooks/dashboard/helpers";
import { NoResults, Results } from "@/components/notebooks/dashboard/Results";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { useNotebooks } from "@/hooks/use-notebooks";
import React from "react";

const DebugNotebooks = React.lazy(() =>
  import("@/components/notebooks/dashboard/DebugNotebooks").then((mod) => ({
    default: mod.DebugNotebooks,
  }))
);

export default function NbDashboardPage() {
  const debug = useDebug();
  const { activeFilter, searchQuery, selectedTagName } = useDashboardParams();
  const {
    allNotebooks,
    filteredNotebooks,
    recentScratchNotebooks,
    namedNotebooks,
    isLoading,
    error,
    refetch,
  } = useNotebooks(selectedTagName, activeFilter, searchQuery);

  useSmartDefaultFilter({ allNotebooks });

  if (error && !isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-red-600">
            Error Loading Notebooks
          </h1>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebarNbDashboard allNotebooks={allNotebooks} />
      <SidebarInset className="h-dvh overflow-y-scroll overscroll-contain">
        <header className="bg-background sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex-1" />
          <TopHeader />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {/* Content area */}
          {isLoading && <LoadingState message="Loading notebooks..." />}
          {debug.enabled && <DebugNotebooks notebooks={filteredNotebooks} />}

          {!isLoading && filteredNotebooks.length === 0 && <NoResults />}

          {!isLoading && filteredNotebooks.length > 0 && (
            <Results
              refetch={refetch}
              recentScratchNotebooks={recentScratchNotebooks}
              namedNotebooks={namedNotebooks}
              filteredNotebooks={filteredNotebooks}
            />
          )}

          <div className="flex-1" />

          <div className="mt-8 flex justify-center border-t px-4 py-2 text-center">
            <GitCommitHash />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
