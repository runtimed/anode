import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Tag, User, Users } from "lucide-react";
import React, { useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  getNotebookVanityUrl,
  hasCorrectNotebookVanityUrl,
} from "@/util/url-utils";
import { DebugModeToggle } from "@/components/debug/DebugModeToggle";
import { LoadingState } from "@/components/loading/LoadingState";
import { RuntLogoSmall } from "@/components/logo/RuntLogoSmall";
import { NotebookApp } from "@/components/notebook/NotebookApp";
import { useTrpc } from "@/components/TrpcProvider";
import { TrpcProvider } from "@/components/TrpcProvider.tsx";
import { Button } from "@/components/ui/button";
import { TitleEditor } from "@/components/notebooks/notebook/TitleEditor";
import { SharingModal } from "@/components/notebooks/SharingModal";
import { SimpleUserProfile } from "@/components/notebooks/SimpleUserProfile";
import type { NotebookProcessed } from "@/components/notebooks/types";
import { TagSelectionDialog } from "@/components/notebooks/TagSelectionDialog";
import { TagBadge } from "@/components/notebooks/TagBadge";
import { GitCommitHash } from "@/components/notebook/GitCommitHash";

const NotebookPageContent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const trpc = useTrpc();
  const location = useLocation();
  const navigate = useNavigate();
  const [isTagSelectionOpen, setIsTagSelectionOpen] = useState(false);
  const [isSharingModalOpen, setIsSharingModalOpen] = useState(false);
  const [showRuntimeHelper, setShowRuntimeHelper] = React.useState(false);

  // Get initial notebook data from router state (if navigated from creation)
  const initialNotebook = location.state?.initialNotebook as
    | NotebookProcessed
    | undefined;

  // Query notebook data using tRPC
  const {
    data: notebookData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    ...trpc.notebook.queryOptions({ id: id! }),
    enabled: !!id,
  });

  // Get notebook owner
  const { data: owner } = useQuery({
    ...trpc.notebookOwner.queryOptions({ nbId: id! }),
    enabled: !!id,
  });

  // Get notebook collaborators
  const { data: collaborators } = useQuery({
    ...trpc.notebookCollaborators.queryOptions({ nbId: id! }),
    enabled: !!id,
  });

  // Get user's permission level
  const { data: myPermission } = useQuery({
    ...trpc.myNotebookPermission.queryOptions({ nbId: id! }),
    enabled: !!id,
  });

  // Construct the full notebook object with all the data
  const notebook: NotebookProcessed | null = React.useMemo(() => {
    if (!notebookData && !initialNotebook) return null;

    const baseNotebook = notebookData || initialNotebook;
    if (!baseNotebook) return null;

    return {
      ...baseNotebook,
      myPermission: myPermission || "NONE",
      owner: owner || {
        id: baseNotebook.owner_id,
        givenName: "",
        familyName: "",
      },
      collaborators: collaborators || [],
    } as const;
  }, [notebookData, initialNotebook, myPermission, owner, collaborators]);

  // Redirect to canonical vanity URL when title changes or on initial load
  useEffect(() => {
    if (!notebook || isLoading) return;

    const needsCanonical = !hasCorrectNotebookVanityUrl(
      location.pathname,
      notebook.id,
      notebook.title
    );

    if (needsCanonical) {
      const canonicalUrl = getNotebookVanityUrl(notebook.id, notebook.title);
      navigate(canonicalUrl, { replace: true });
    }
  }, [
    notebook?.title,
    notebook?.id,
    location.pathname,
    navigate,
    isLoading,
    notebook,
  ]);

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

  const canEdit = notebook.myPermission === "OWNER";

  if (!id) {
    return <div>No notebook id</div>;
  }

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
            </div>

            {/* Right side - Simplified */}
            <div className="flex items-center gap-3">
              {import.meta.env.DEV && <DebugModeToggle />}

              <ErrorBoundary fallback={<div>Error loading user profile</div>}>
                <SimpleUserProfile />
              </ErrorBoundary>
            </div>
          </div>

          {/* Metadata - Simplified */}
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              {/* Owner name without label */}
              <div className="flex items-center gap-1.5">
                <User className="h-3 w-3" />
                <span>
                  {notebook.owner?.givenName && notebook.owner?.familyName
                    ? `${notebook.owner.givenName} ${notebook.owner.familyName}`
                    : "Unknown Owner"}
                </span>
              </div>

              {/* Collaborators count with share button */}
              {notebook.collaborators && notebook.collaborators.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    <span>
                      {notebook.collaborators.length}{" "}
                      {notebook.collaborators.length === 1
                        ? "collaborator"
                        : "collaborators"}
                    </span>
                  </div>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsSharingModalOpen(true)}
                      className="h-5 px-2 text-xs text-gray-400 hover:text-gray-600"
                    >
                      Share
                    </Button>
                  )}
                </div>
              )}

              {/* Show share button even when no collaborators */}
              {(!notebook.collaborators ||
                notebook.collaborators.length === 0) &&
                canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSharingModalOpen(true)}
                    className="h-5 px-2 text-xs text-gray-400 hover:text-gray-600"
                  >
                    <Users className="mr-1.5 h-3 w-3" />
                    Share
                  </Button>
                )}
            </div>

            {/* Tags - Right aligned */}
            <div className="flex items-center gap-1">
              {notebook.tags?.map((tag) => (
                <TagBadge
                  key={tag.id}
                  tag={tag}
                  className="px-1.5 py-0.5 text-[10px]"
                />
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsTagSelectionOpen(true)}
                className="h-4 px-1.5 text-[10px] text-gray-400 hover:text-gray-600"
              >
                <Tag className="mr-1 h-2.5 w-2.5" />
                {!notebook.tags || notebook.tags.length === 0
                  ? "Add tags"
                  : "Edit"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Notebook Content */}
      <NotebookApp
        notebookId={id}
        showRuntimeHelper={showRuntimeHelper}
        onToggleRuntimeHelper={() => setShowRuntimeHelper(!showRuntimeHelper)}
      />

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
    </div>
  );
};

export const NotebookPage: React.FC = () => {
  return (
    <TrpcProvider>
      <NotebookPageContent />
    </TrpcProvider>
  );
};
