import { AppSidebarNb } from "@/components/app-sidebar-nb";
import { CollaboratorAvatars } from "@/components/CollaboratorAvatars";
import { useDebug } from "@/components/debug/debug-mode";
import {
  LiveStoreProviderProvider,
  LiveStoreReady,
  useLiveStoreReady,
} from "@/components/livestore/LivestoreProviderProvider";
import { LoadingState } from "@/components/loading/LoadingState";
import { ContextSelectionModeButton } from "@/components/notebook/ContextSelectionModeButton";
import { RuntimeHealthIndicatorButton } from "@/components/notebook/RuntimeHealthIndicatorButton";
import { NbLiveStore } from "@/components/notebooks/NbLiveStore";
import { useNotebook } from "@/components/notebooks/notebook/helpers";
import { TitleEditor } from "@/components/notebooks/notebook/TitleEditor";
import { NotebookProcessed } from "@/components/notebooks/types";
import { DelayedSpinner } from "@/components/outputs/shared-with-iframe/SuspenseSpinner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ArrowLeft } from "lucide-react";
import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";

const SidebarRightDebug = React.lazy(() =>
  import("@/components/right-sidebar-debug").then((m) => ({
    default: m.SidebarRightDebug,
  }))
);

export default function NbPage() {
  const debug = useDebug();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  // Get initial notebook data from router state (if navigated from creation)
  const initialNotebook = location.state?.initialNotebook as
    | NotebookProcessed
    | undefined;

  // Should never happen
  if (!id) {
    throw new Error("No notebook id");
  }

  const { notebook, isLoading, error, refetch } = useNotebook(
    id,
    initialNotebook
  );

  if (isLoading && !initialNotebook) {
    return <LoadingState variant="fullscreen" message="Loading notebook..." />;
  }

  // TODO: consider not covering the entire page with this error
  if (error || !notebook) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-red-600">
            {error ? "Error Loading Notebook" : "Notebook Not Found"}
          </h1>
          <p className="mb-6 text-gray-600">
            {error
              ? error.message
              : "The notebook you're looking for doesn't exist or you don't have access to it."}
          </p>
          <Link to="/nb">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Notebooks
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <LiveStoreProviderProvider storeId={id}>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "350px",
          } as React.CSSProperties
        }
      >
        <AppSidebarNb />
        <SidebarInset className="h-dvh overflow-y-scroll overscroll-contain">
          {notebook && (
            <NotebookContentWhenNotebook
              notebook={notebook}
              refetch={refetch}
            />
          )}
        </SidebarInset>
        <LiveStoreReady>
          {import.meta.env.DEV && debug.enabled && <SidebarRightDebug />}
        </LiveStoreReady>
      </SidebarProvider>
    </LiveStoreProviderProvider>
  );
}

function NotebookContentWhenNotebook({
  notebook,
  refetch,
}: {
  notebook: NotebookProcessed;
  refetch: () => void;
}) {
  const [showRuntimeHelper, setShowRuntimeHelper] = React.useState(false);
  const canEdit = notebook?.myPermission === "OWNER";
  const liveStoreReady = useLiveStoreReady();

  return (
    <>
      <header className="bg-background sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink asChild>
                <Link to="/nb2">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {/* {notebook?.title ?? "Untitled"} */}
                <TitleEditor
                  notebook={notebook}
                  onTitleSaved={refetch}
                  canEdit={canEdit}
                />
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex-1" />

        <LiveStoreReady>
          <div className="flex h-12 items-center gap-2">
            <CollaboratorAvatars />
            <div className="flex-1" />
            <ContextSelectionModeButton />
            <RuntimeHealthIndicatorButton
              onToggleClick={() => setShowRuntimeHelper(!showRuntimeHelper)}
            />
          </div>
        </LiveStoreReady>
      </header>
      <div className="relative flex flex-1 flex-col gap-4 p-4 pt-0">
        {!liveStoreReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <DelayedSpinner size="lg" />
          </div>
        )}
        <NbLiveStore
          id={notebook.id}
          showRuntimeHelper={showRuntimeHelper}
          setShowRuntimeHelper={setShowRuntimeHelper}
        />
        <div className="h-[70vh]"></div>
      </div>
    </>
  );
}
