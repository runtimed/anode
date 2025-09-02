import { AppSidebarNb } from "@/components/app-sidebar-nb";
import { CollaboratorAvatars } from "@/components/CollaboratorAvatars";
import { useDebug } from "@/components/debug/debug-mode";
import { DebugModeToggle } from "@/components/debug/DebugModeToggle";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import {
  LiveStoreProviderProvider,
  LiveStoreReady,
  useLiveStoreReady,
} from "@/components/livestore/LivestoreProviderProvider";
import { LoadingState } from "@/components/loading/LoadingState";
import { ContextSelectionModeButton } from "@/components/notebook/ContextSelectionModeButton";
import { NotebookContent } from "@/components/notebook/NotebookContent";
import { RuntimeHealthIndicatorButton } from "@/components/notebook/RuntimeHealthIndicatorButton";
import { RuntimeHelper } from "@/components/notebook/RuntimeHelper";
import { useNotebook } from "@/components/notebooks/notebook/helpers";
import { TitleEditor } from "@/components/notebooks/notebook/TitleEditor";
import { SharingModal } from "@/components/notebooks/SharingModal";
import { SimpleUserProfile } from "@/components/notebooks/SimpleUserProfile";
import { TagBadge } from "@/components/notebooks/TagBadge";
import { TagSelectionDialog } from "@/components/notebooks/TagSelectionDialog";
import { NotebookProcessed } from "@/components/notebooks/types";
import { DelayedSpinner } from "@/components/outputs/shared-with-iframe/SuspenseSpinner";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, Share2, Tag, User, Users } from "lucide-react";
import React, { useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
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
          {notebook && <NbContent notebook={notebook} refetch={refetch} />}
        </SidebarInset>
        <LiveStoreReady>
          {import.meta.env.DEV && debug.enabled && <SidebarRightDebug />}
        </LiveStoreReady>
      </SidebarProvider>
    </LiveStoreProviderProvider>
  );
}

function NbContent({
  notebook,
  refetch,
}: {
  notebook: NotebookProcessed;
  refetch: () => void;
}) {
  const canEdit = notebook?.myPermission === "OWNER";
  const liveStoreReady = useLiveStoreReady();

  const [isTagSelectionOpen, setIsTagSelectionOpen] = useState(false);
  const [showRuntimeHelper, setShowRuntimeHelper] = React.useState(false);
  const [isSharingModalOpen, setIsSharingModalOpen] = useState(false);

  return (
    <>
      <header className="bg-background sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 overflow-hidden border-b px-4">
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
              <BreadcrumbPage>{notebook?.title ?? "Untitled"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex-1" />

        {import.meta.env.DEV && <DebugModeToggle />}

        <LiveStoreReady>
          <CollaboratorAvatars />
        </LiveStoreReady>

        <ErrorBoundary fallback={<div>Error loading user profile</div>}>
          <SimpleUserProfile />
        </ErrorBoundary>
      </header>
      <div className="relative flex flex-1 flex-col gap-4">
        {!liveStoreReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <DelayedSpinner size="lg" />
          </div>
        )}

        <div className="container mx-auto sm:px-6">
          <div className="px-4 py-8">
            <div className="flex items-center gap-2">
              <TitleEditor
                notebook={notebook}
                onTitleSaved={refetch}
                canEdit={canEdit}
              />

              {/* Share button - only show if can edit */}
              {canEdit && (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setIsSharingModalOpen(true)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <Share2 className="size-3" />
                </Button>
              )}
            </div>

            <Separator className="my-3" />

            <div className="wrap-reverse flex flex-wrap items-center gap-4">
              {/* Metadata - Simplified */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 sm:gap-4">
                {/* Permission badge - smaller and less prominent */}
                <Badge
                  variant="secondary"
                  className="bg-gray-100 px-2 py-1 text-xs text-gray-600"
                >
                  {(notebook.myPermission || "NONE").toLowerCase()}
                </Badge>

                {/* Owner - more subtle */}
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  <span className="text-nowrap">
                    {notebook.owner?.givenName && notebook.owner?.familyName
                      ? `${notebook.owner.givenName} ${notebook.owner.familyName}`
                      : "Unknown Owner"}
                  </span>
                </div>

                {/* Collaborators count - more subtle */}
                {notebook.collaborators &&
                  notebook.collaborators.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      <span className="text-nowrap">
                        {notebook.collaborators.length}{" "}
                        {notebook.collaborators.length === 1
                          ? "collaborator"
                          : "collaborators"}
                      </span>
                    </div>
                  )}

                {/* Tags - Simplified */}
                <div className="flex items-center gap-2">
                  {notebook.tags?.slice(0, 3).map((tag) => (
                    <TagBadge key={tag.id} tag={tag} className="text-xs" />
                  ))}
                  {notebook.tags && notebook.tags.length > 3 && (
                    <Badge
                      variant="outline"
                      className="px-1.5 py-0.5 text-xs text-gray-500"
                    >
                      +{notebook.tags.length - 3}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsTagSelectionOpen(true)}
                    className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <Tag className="mr-1 h-3 w-3" />
                    {!notebook.tags || notebook.tags.length === 0
                      ? "Add tags"
                      : "Edit"}
                  </Button>
                </div>
              </div>

              <div className="flex-1" />

              <LiveStoreReady>
                <div className="flex flex-1 items-center justify-end gap-2">
                  <ContextSelectionModeButton />
                  <RuntimeHealthIndicatorButton
                    onToggleClick={() =>
                      setShowRuntimeHelper(!showRuntimeHelper)
                    }
                  />
                </div>
              </LiveStoreReady>
            </div>

            <LiveStoreReady>
              <RuntimeHelper
                notebookId={notebook.id}
                showRuntimeHelper={showRuntimeHelper}
                onClose={() => setShowRuntimeHelper(false)}
              />
            </LiveStoreReady>
          </div>

          <LiveStoreReady>
            <NotebookContent />
            <div className="h-5" />
            <KeyboardShortcuts />
            <div className="h-[70vh]"></div>
          </LiveStoreReady>
        </div>
      </div>

      {/* Sharing Modal */}
      <SharingModal
        notebook={notebook}
        isOpen={isSharingModalOpen}
        onClose={() => setIsSharingModalOpen(false)}
        onUpdate={refetch}
      />

      <TagSelectionDialog
        notebookId={notebook.id}
        isOpen={isTagSelectionOpen}
        onClose={() => setIsTagSelectionOpen(false)}
        onUpdate={refetch}
      />
    </>
  );
}
