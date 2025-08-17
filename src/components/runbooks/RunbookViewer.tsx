import React, { useState, useEffect } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Clock, User, Edit2, Check, X } from "lucide-react";
import { getRunbookVanityUrl, hasCorrectVanityUrl } from "../../util/url-utils";
import { useQuery, useMutation } from "../../lib/graphql-client";
import {
  GET_RUNBOOK,
  UPDATE_RUNBOOK,
  type Runbook,
  type UpdateRunbookInput,
} from "../../queries/runbooks";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { LoadingState } from "../loading/LoadingState";

export const RunbookViewer: React.FC = () => {
  const { ulid } = useParams<{ ulid: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");

  // Query runbook data
  const [{ data, fetching, error }, refetch] = useQuery({
    query: GET_RUNBOOK,
    variables: { ulid: ulid! },
    pause: !ulid,
  });

  // Update runbook mutation
  const [, updateRunbook] = useMutation(UPDATE_RUNBOOK);

  const runbook: Runbook | null = data?.runbook || null;

  // Redirect to canonical vanity URL if needed
  useEffect(() => {
    if (
      runbook &&
      !hasCorrectVanityUrl(location.pathname, runbook.ulid, runbook.title)
    ) {
      const canonicalUrl = getRunbookVanityUrl(runbook.ulid, runbook.title);
      navigate(canonicalUrl, { replace: true });
    }
  }, [runbook, location.pathname, navigate]);

  const handleStartEditTitle = () => {
    setEditTitle(runbook?.title || "");
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!runbook || !editTitle.trim()) return;

    const input: UpdateRunbookInput = {
      title: editTitle.trim(),
    };

    try {
      const result = await updateRunbook({ ulid: runbook.ulid, input });
      if (result.error) {
        console.error("Failed to update runbook:", result.error);
        // TODO: Show error toast
      } else if (result.data?.updateRunbook) {
        setIsEditingTitle(false);
        // Refetch to update cache
        refetch();
        // Update URL to reflect new title
        const updatedRunbook = result.data.updateRunbook;
        const newUrl = getRunbookVanityUrl(
          updatedRunbook.ulid,
          updatedRunbook.title
        );
        navigate(newUrl, { replace: true });
        // TODO: Show success toast
      }
    } catch (err) {
      console.error("Failed to update runbook:", err);
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

  if (fetching) {
    return <LoadingState variant="fullscreen" message="Loading runbook..." />;
  }

  if (error || !runbook) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-red-600">
            {error ? "Error Loading Runbook" : "Runbook Not Found"}
          </h1>
          <p className="mb-6 text-gray-600">
            {error
              ? error.message
              : "The runbook you're looking for doesn't exist or you don't have access to it."}
          </p>
          <Link to="/r">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Runbooks
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const canEdit = runbook.myPermission === "OWNER";

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to="/r">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>

              {/* Title */}
              <div className="flex items-center gap-2">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="text-lg font-semibold"
                      placeholder="Runbook title..."
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
                      {runbook.title || "Untitled Runbook"}
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

            {/* Permission badge */}
            <Badge variant={getPermissionBadgeVariant(runbook.myPermission)}>
              {runbook.myPermission.toLowerCase()}
            </Badge>
          </div>

          {/* Metadata */}
          <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-gray-600">
            {/* Owner */}
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 shrink-0" />
              <span>
                {runbook.owner.givenName && runbook.owner.familyName
                  ? `${runbook.owner.givenName} ${runbook.owner.familyName}`
                  : "Unknown Owner"}
              </span>
            </div>

            {/* Collaborators count */}
            {runbook.collaborators.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 shrink-0" />
                <span>
                  {runbook.collaborators.length}{" "}
                  {runbook.collaborators.length === 1
                    ? "collaborator"
                    : "collaborators"}
                </span>
              </div>
            )}

            {/* Created date */}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" />
              <span>Created {formatDate(runbook.createdAt)}</span>
            </div>

            {/* Updated date (if different from created) */}
            {runbook.updatedAt !== runbook.createdAt && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Updated {formatDate(runbook.updatedAt)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border bg-white p-8 text-center">
          <div className="mx-auto mb-4 text-gray-400">
            <Users className="mx-auto h-16 w-16" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            Notebook content coming soon
          </h3>
          <p className="text-gray-600">
            This is where the notebook cells and outputs will be displayed. For
            now, you can edit the runbook title and manage permissions.
          </p>
        </div>
      </div>
    </div>
  );
};
