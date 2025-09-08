import { useQuery } from "@tanstack/react-query";
import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getNotebookVanityUrl,
  hasCorrectNotebookVanityUrl,
} from "../../../util/url-utils.js";
import { useTrpc } from "../../TrpcProvider.js";
import type { NotebookProcessed } from "../types.js";

export function useNotebook(id: string, initialNotebook?: NotebookProcessed) {
  const trpc = useTrpc();

  // Query notebook data
  const {
    data: notebookData,
    isLoading,
    error,
    refetch,
  } = useQuery(trpc.notebook.queryOptions({ id: id }));

  // Get notebook owner
  const { data: owner } = useQuery(
    trpc.notebookOwner.queryOptions({ nbId: id })
  );

  // Get notebook collaborators
  const { data: collaborators } = useQuery(
    trpc.notebookCollaborators.queryOptions({ nbId: id })
  );

  // Get user's permission level
  const { data: myPermission } = useQuery(
    trpc.myNotebookPermission.queryOptions({ nbId: id })
  );

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

  return { notebook, isLoading, error, refetch };
}

export function useNavigateToCanonicalUrl(notebook: NotebookProcessed) {
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to canonical vanity URL when title changes or on initial load
  useEffect(() => {
    const needsCanonical = !hasCorrectNotebookVanityUrl(
      location.pathname,
      notebook.id,
      notebook.title
    );

    if (needsCanonical) {
      const canonicalUrl = getNotebookVanityUrl(notebook.id, notebook.title);
      navigate(canonicalUrl, { replace: true });
    }
  }, [notebook?.title, notebook?.id, location.pathname, navigate, notebook]);
}
