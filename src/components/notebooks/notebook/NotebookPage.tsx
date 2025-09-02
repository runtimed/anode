import { useDebug } from "@/components/debug/debug-mode.js";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Share2, Tag, User, Users } from "lucide-react";
import React, { Suspense, useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  getNotebookVanityUrl,
  hasCorrectNotebookVanityUrl,
} from "../../../util/url-utils.js";
import { CollaboratorAvatars } from "../../CollaboratorAvatars.js";
import { DebugModeToggle } from "../../debug/DebugModeToggle.js";
import { KeyboardShortcuts } from "../../KeyboardShortcuts.js";
import {
  LiveStoreProviderProvider,
  LiveStoreReady,
  useLiveStoreReady,
} from "../../livestore/LivestoreProviderProvider.js";
import { LoadingState } from "../../loading/LoadingState.js";
import { RuntLogoSmall } from "../../logo/RuntLogoSmall.js";
import { ContextSelectionModeButton } from "../../notebook/ContextSelectionModeButton.js";
import { GitCommitHash } from "../../notebook/GitCommitHash.js";
import { NotebookContent } from "../../notebook/NotebookContent.js";
import { RuntimeHealthIndicatorButton } from "../../notebook/RuntimeHealthIndicatorButton.js";
import { RuntimeHelper } from "../../notebook/RuntimeHelper.js";
import { DelayedSpinner } from "../../outputs/shared-with-iframe/SuspenseSpinner.js";
import { useTrpc } from "../../TrpcProvider.js";
import { Badge } from "../../ui/badge.js";
import { Button } from "../../ui/button.js";
import { TitleEditor } from "./TitleEditor.js";
import { SharingModal } from "../SharingModal.js";
import { SimpleUserProfile } from "../SimpleUserProfile.js";
import { TagBadge } from "../TagBadge.js";
import { TagSelectionDialog } from "../TagSelectionDialog.js";
import type { NotebookProcessed } from "../types.js";

// Lazy import DebugPanel only in development
const LazyDebugPanel = React.lazy(() =>
  import("../../debug/DebugPanel.js").then((module) => ({
    default: module.DebugPanel,
  }))
);

export const NotebookPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) return <div>No notebook id</div>;

  return (
    <LiveStoreProviderProvider storeId={id}>
      <NotebookPageWithId id={id} />
    </LiveStoreProviderProvider>
  );
};

function NotebookPageWithId({ id }: { id: string }) {
  const location = useLocation();
  // Get initial notebook data from router state (if navigated from creation)
  const initialNotebook = location.state?.initialNotebook as
    | NotebookProcessed
    | undefined;

  const { notebook, isLoading, error, refetch } = useNotebook(
    id,
    initialNotebook
  );

  if (isLoading && !initialNotebook) {
    return <LoadingState variant="fullscreen" message="Loading notebook..." />;
  }

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
    <NotebookPageWithIdAndNotebook
      id={id}
      notebook={notebook}
      refetch={refetch}
    />
  );
}

function NotebookPageWithIdAndNotebook({
  id,
  notebook,
  refetch,
}: {
  id: string;
  notebook: NotebookProcessed;
  refetch: () => void;
}) {
  useNavigateToCanonicalUrl(notebook);

  const liveStoreReady = useLiveStoreReady();
  const debug = useDebug();

  const [isTagSelectionOpen, setIsTagSelectionOpen] = useState(false);
  const [isSharingModalOpen, setIsSharingModalOpen] = useState(false);
  const [showRuntimeHelper, setShowRuntimeHelper] = useState(false);

  const canEdit = notebook.myPermission === "OWNER";

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap-reverse items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/nb" className="group/logo relative">
                <span className="relative transition-opacity group-hover/logo:opacity-20">
                  <RuntLogoSmall />
                </span>
                <ArrowLeft className="absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/logo:opacity-100" />
              </Link>

              <TitleEditor
                notebook={notebook}
                onTitleSaved={refetch}
                canEdit={canEdit}
              />

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

            {/* Right side - Simplified */}
            <div className="flex items-center gap-3">
              {/* Share button - only show if can edit */}
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSharingModalOpen(true)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              )}

              {/* Permission badge - smaller and less prominent */}
              <Badge
                variant="secondary"
                className="bg-gray-100 px-2 py-1 text-xs text-gray-600"
              >
                {(notebook.myPermission || "NONE").toLowerCase()}
              </Badge>

              {import.meta.env.DEV && <DebugModeToggle />}

              <ErrorBoundary fallback={<div>Error loading user profile</div>}>
                <SimpleUserProfile />
              </ErrorBoundary>
            </div>
          </div>

          {/* Metadata - Simplified */}
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
            {/* Owner - more subtle */}
            <div className="flex items-center gap-1.5">
              <User className="h-3 w-3" />
              <span>
                {notebook.owner?.givenName && notebook.owner?.familyName
                  ? `${notebook.owner.givenName} ${notebook.owner.familyName}`
                  : "Unknown Owner"}
              </span>
            </div>

            {/* Collaborators count - more subtle */}
            {notebook.collaborators && notebook.collaborators.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Users className="h-3 w-3" />
                <span>
                  {notebook.collaborators.length}{" "}
                  {notebook.collaborators.length === 1
                    ? "collaborator"
                    : "collaborators"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <LiveStoreSpinnerContainer liveStoreReady={liveStoreReady}>
        <LiveStoreReady>
          <div className="flex">
            <div className="container mx-auto px-4">
              <div className="mb-4 flex h-8 items-center gap-3">
                <CollaboratorAvatars />
                <div className="flex-1" />
                <div className="flex items-center gap-2 text-sm">
                  <ContextSelectionModeButton />
                  <RuntimeHealthIndicatorButton
                    onToggleClick={() =>
                      setShowRuntimeHelper(!showRuntimeHelper)
                    }
                  />
                </div>
              </div>
              <RuntimeHelper
                notebookId={id}
                showRuntimeHelper={showRuntimeHelper}
                onClose={() => setShowRuntimeHelper(false)}
              />

              <KeyboardShortcuts />
              <NotebookContent />
            </div>

            {/* Debug Panel */}
            {import.meta.env.DEV && debug.enabled && (
              <Suspense
                fallback={
                  <div className="bg-muted/5 text-muted-foreground w-96 border-l p-4 text-xs">
                    Loading debug panel...
                  </div>
                }
              >
                <ErrorBoundary
                  fallback={<div>Error rendering debug panel</div>}
                >
                  <div className="w-96">
                    <LazyDebugPanel />
                  </div>
                </ErrorBoundary>
              </Suspense>
            )}
          </div>
        </LiveStoreReady>

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

        <div className="h-[70vh]"></div>
        <div className="mt-8 flex justify-center border-t px-4 py-2 text-center">
          <GitCommitHash />
        </div>
      </LiveStoreSpinnerContainer>
    </div>
  );

  function LiveStoreSpinnerContainer({
    children,
    liveStoreReady,
  }: {
    children: React.ReactNode;
    liveStoreReady: boolean;
  }) {
    return (
      // Spinner is relative to this div
      <div className="relative">
        {children}

        {/* Loading spinner */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-50 flex items-center justify-center",
            liveStoreReady ? "opacity-0" : "opacity-100"
          )}
        >
          <div className="bg-background flex items-center justify-center rounded-full">
            <DelayedSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }
}
