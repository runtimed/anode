import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, Share2, User, Users } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  getNotebookVanityUrl,
  hasCorrectNotebookVanityUrl,
} from "../../util/url-utils";
import { CollaboratorAvatars } from "../CollaboratorAvatars";
import { KeyboardShortcuts } from "../KeyboardShortcuts";
import { CustomLiveStoreProvider } from "../livestore/CustomLiveStoreProvider";
import { LoadingState } from "../loading/LoadingState";
import { RuntLogoSmall } from "../logo/RuntLogoSmall";
import { GitCommitHash } from "../notebook/GitCommitHash";
import { NotebookContent } from "../notebook/NotebookContent";
import { RuntimeHealthIndicatorButton } from "../notebook/RuntimeHealthIndicatorButton";
import { RuntimeHelper } from "../notebook/RuntimeHelper";
import { DelayedSpinner } from "../outputs/shared-with-iframe/SuspenseSpinner";
import { useTrpc } from "../TrpcProvider";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { TitleEditor } from "./notebook/TitleEditor";
import { SharingModal } from "./SharingModal";
import type { NotebookProcessed } from "./types";

export const NotebookPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const trpc = useTrpc();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSharingModalOpen, setIsSharingModalOpen] = useState(false);
  const [showRuntimeHelper, setShowRuntimeHelper] = React.useState(false);
  const [liveStoreReady, setLiveStoreReady] = useState(false);

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

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  const getPermissionBadgeVariant = (permission: string) => {
    switch (permission) {
      case "OWNER":
        return "default";
      case "WRITER":
        return "secondary";
      default:
        return "outline";
    }
  };

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
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
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

            <div className="flex items-center gap-2">
              {/* Share button */}
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSharingModalOpen(true)}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              )}

              {/* Permission badge */}
              <Badge
                variant={getPermissionBadgeVariant(
                  notebook.myPermission || "NONE"
                )}
              >
                {(notebook.myPermission || "NONE").toLowerCase()}
              </Badge>
            </div>
          </div>

          {/* Metadata */}
          <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-gray-600">
            {/* Owner */}
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 shrink-0" />
              <span>
                {notebook.owner?.givenName && notebook.owner?.familyName
                  ? `${notebook.owner.givenName} ${notebook.owner.familyName}`
                  : "Unknown Owner"}
              </span>
            </div>

            {/* Collaborators count */}
            {notebook.collaborators && notebook.collaborators.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 shrink-0" />
                <span>
                  {notebook.collaborators.length}{" "}
                  {notebook.collaborators.length === 1
                    ? "collaborator"
                    : "collaborators"}
                </span>
              </div>
            )}

            {/* Created date */}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" />
              <span>Created {formatDate(notebook.created_at)}</span>
            </div>

            {/* Updated date (if different from created) */}
            {notebook.updated_at !== notebook.created_at && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Updated {formatDate(notebook.updated_at)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <LiveStoreSpinnerContainer liveStoreReady={liveStoreReady}>
        <CustomLiveStoreProvider
          storeId={id}
          onLiveStoreReady={() => setLiveStoreReady(true)}
        >
          <CollaboratorAvatars />
          <RuntimeHealthIndicatorButton
            onToggleClick={() => setShowRuntimeHelper(!showRuntimeHelper)}
          />
          <RuntimeHelper
            notebookId={id}
            showRuntimeHelper={showRuntimeHelper}
            onClose={() => setShowRuntimeHelper(false)}
          />
          <div className="w-full px-0 py-3 pb-24 sm:mx-auto sm:max-w-4xl sm:p-4 sm:pb-4">
            <KeyboardShortcuts />
            <NotebookContent />
          </div>
        </CustomLiveStoreProvider>

        {/* Sharing Modal */}
        <SharingModal
          notebook={notebook}
          isOpen={isSharingModalOpen}
          onClose={() => setIsSharingModalOpen(false)}
          onUpdate={refetch}
        />

        <div className="h-[70vh]"></div>
        <div className="mt-8 flex justify-center border-t px-4 py-2 text-center">
          <GitCommitHash />
        </div>
      </LiveStoreSpinnerContainer>
    </div>
  );
};

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
