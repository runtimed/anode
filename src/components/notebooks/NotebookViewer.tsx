import React, { useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { trpc, trpcQueryClient } from "../../lib/trpc-client";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { LoadingState } from "../loading/LoadingState";
import { Button } from "../ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getNotebookVanityUrl,
  hasCorrectNotebookVanityUrl,
} from "../../util/url-utils";

interface NotebookViewerProps {}

export const NotebookViewer: React.FC<NotebookViewerProps> = () => {
  return (
    <div>
      <QueryClientProvider client={trpcQueryClient}>
        <NotebookViewerContent />
      </QueryClientProvider>
    </div>
  );
};

const NotebookViewerContent: React.FC = () => {
  const { ulid } = useParams<{ ulid: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Query single runbook using tRPC
  const {
    data: runbook,
    isLoading,
    error,
  } = useQuery(trpc.runbook.queryOptions({ ulid: ulid! }));

  // Get user's permission for this runbook
  const { data: permission } = useQuery(
    trpc.myRunbookPermission.queryOptions({ runbookUlid: ulid! })
  );

  // Redirect to canonical vanity URL when title changes or on initial load
  useEffect(() => {
    if (!runbook || isLoading) return;

    const needsCanonical = !hasCorrectNotebookVanityUrl(
      location.pathname,
      runbook.ulid,
      runbook.title
    );

    if (needsCanonical) {
      const canonicalUrl = getNotebookVanityUrl(runbook.ulid, runbook.title);
      navigate(canonicalUrl, { replace: true });
    }
  }, [
    runbook?.title,
    runbook?.ulid,
    location.pathname,
    navigate,
    isLoading,
    runbook,
  ]);

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-red-600">
            Error Loading Notebook
          </h1>
          <p className="text-gray-600">{error.message}</p>
          <Button
            onClick={() => navigate("/nb")}
            className="mt-4"
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Notebooks
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingState message="Loading notebook..." />;
  }

  if (!runbook) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-red-600">
            Notebook Not Found
          </h1>
          <p className="text-gray-600">
            The notebook you're looking for doesn't exist or you don't have
            access to it.
          </p>
          <Button
            onClick={() => navigate("/nb")}
            className="mt-4"
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Notebooks
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button
          onClick={() => navigate("/nb")}
          variant="outline"
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Notebooks
        </Button>

        <div className="rounded-lg border bg-white p-6">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {runbook.title || "Untitled Notebook"}
          </h1>

          <div className="mb-4 text-sm text-gray-600">
            <p>ID: {runbook.ulid}</p>
            <p>Owner ID: {runbook.owner_id}</p>
            <p>Created: {new Date(runbook.created_at).toLocaleDateString()}</p>
            <p>Updated: {new Date(runbook.updated_at).toLocaleDateString()}</p>
            {permission && <p>Your Permission: {permission}</p>}
          </div>

          <div className="text-gray-700">
            <p>
              This is a notebook viewer component. The actual notebook content
              would be displayed here.
            </p>
            <p>Currently showing basic metadata from the tRPC endpoint.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
