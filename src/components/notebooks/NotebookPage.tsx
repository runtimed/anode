import React, { useState, useEffect } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Clock,
  User,
  Edit2,
  Check,
  X,
  Share2,
} from "lucide-react";
import {
  getNotebookVanityUrl,
  hasCorrectNotebookVanityUrl,
} from "../../util/url-utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTrpc } from "../TrpcProvider";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { LoadingState } from "../loading/LoadingState";
import { SharingModal } from "./SharingModal";
import type { NotebookProcessed } from "./types";
import { CustomLiveStoreProvider } from "../livestore/CustomLiveStoreProvider";
import { NotebookContent } from "../notebook/NotebookContent";
import { RuntLogoSmall } from "../logo/RuntLogoSmall";

export const NotebookPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const trpc = useTrpc();
  const location = useLocation();
  const navigate = useNavigate();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [isSharingModalOpen, setIsSharingModalOpen] = useState(false);

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

  // Update notebook mutation
  const updateNotebookMutation = useMutation(
    trpc.updateNotebook.mutationOptions()
  );

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

  const handleStartEditTitle = () => {
    setEditTitle(notebook?.title || "");
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!notebook || !editTitle.trim()) return;

    try {
      await updateNotebookMutation.mutateAsync({
        id: notebook.id,
        input: { title: editTitle.trim() },
      });
      setIsEditingTitle(false);
      // Refetch to update cache - canonicalization effect will handle URL update
      refetch();
      // TODO: Show success toast
    } catch (err) {
      console.error("Failed to update notebook:", err);
      // TODO: Show error toast
    }
  };

  const handleCancelEdit = () => {
    setIsEditingTitle(false);
    setEditTitle("");
  };

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

              {/* Title */}
              <div className="flex items-center gap-2">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="text-lg font-semibold"
                      placeholder="Notebook title..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveTitle();
                        if (e.key === "Escape") handleCancelEdit();
                      }}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleSaveTitle}
                      disabled={!editTitle.trim()}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold">
                      {notebook.title || "Untitled Notebook"}
                    </h1>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleStartEditTitle}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
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

      <CustomLiveStoreProvider storeId={id}>
        <NotebookContent />
      </CustomLiveStoreProvider>

      {/* Sharing Modal */}
      <SharingModal
        notebook={notebook}
        isOpen={isSharingModalOpen}
        onClose={() => setIsSharingModalOpen(false)}
        onUpdate={() => refetch()}
      />
    </div>
  );
};
