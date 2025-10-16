import { useTrpc } from "@/components/TrpcProvider";
import { useMutation } from "@tanstack/react-query";
import React, { useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { trpcQueryClient } from "@/lib/trpc-client";

import { NotebookProcessed } from "@/components/notebooks/types";
import { FilterType } from "@/hooks/use-notebooks";
import { getNotebookVanityUrl } from "@/util/url-utils";
import { toast } from "sonner";

type ViewMode = "grid" | "table";

export function useSmartDefaultFilter({
  allNotebooks,
}: {
  allNotebooks: NotebookProcessed[];
}) {
  const { activeFilter, setActiveFilter, isFilterExplicit } =
    useDashboardParams();

  // Check if user has named notebooks
  const hasNamedNotebooks = useMemo(() => {
    return allNotebooks.some(
      (n) =>
        n.myPermission === "OWNER" && n.title && !n.title.startsWith("Untitled")
    );
  }, [allNotebooks]);

  // Set smart default filter when data first loads, but only if no explicit filter was provided
  const hasNotebooks = allNotebooks.length > 0;
  React.useEffect(() => {
    if (hasNotebooks && activeFilter === "named" && !isFilterExplicit) {
      const hasScratchNotebooks = allNotebooks.some(
        (n) =>
          n.myPermission === "OWNER" &&
          (!n.title || n.title.startsWith("Untitled"))
      );
      const hasSharedNotebooks = allNotebooks.some(
        (n) => n.myPermission === "WRITER"
      );

      // Smart default: named > scratch > shared
      if (hasNamedNotebooks) {
        // Stay on named
      } else if (hasScratchNotebooks) {
        setActiveFilter("scratch");
      } else if (hasSharedNotebooks) {
        setActiveFilter("shared");
      }
    }
  }, [
    hasNotebooks,
    activeFilter,
    hasNamedNotebooks,
    allNotebooks,
    setActiveFilter,
    isFilterExplicit,
  ]);
}

export function useCreateNotebookAndNavigate() {
  const trpc = useTrpc();
  const navigate = useNavigate();

  // Create notebook mutation
  const createNotebookMutation = useMutation(
    trpc.createNotebook.mutationOptions()
  );

  const createNotebook = useCallback(async () => {
    const input = {
      title: "Untitled Notebook",
    };

    try {
      const result = await createNotebookMutation.mutateAsync(input);
      trpcQueryClient.invalidateQueries({
        queryKey: trpc.notebooks.queryKey(),
      });
      if (result) {
        // Redirect to the new notebook with initial data to prevent flicker
        navigate(getNotebookVanityUrl(result.id, result.title), {
          state: { initialNotebook: result },
        });
        toast.success("Notebook created successfully");
      }
    } catch (err) {
      console.error("Failed to create notebook:", err);
      toast.error("Failed to create notebook");
    }
  }, [createNotebookMutation, trpc, navigate]);

  return createNotebook;
}

export function useDashboardParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get("filter");
  const activeFilter: FilterType =
    filterParam === "scratch" ||
    filterParam === "shared" ||
    filterParam === "named"
      ? filterParam
      : "named";
  const isFilterExplicit =
    filterParam === "scratch" ||
    filterParam === "shared" ||
    filterParam === "named";
  const searchQuery = searchParams.get("q") || "";
  const selectedTagName = searchParams.get("tag") || "";
  const viewModeParam = searchParams.get("view");
  const viewMode: ViewMode = viewModeParam === "table" ? "table" : "grid";

  // Function to update view mode in URL params
  const setViewMode = (mode: ViewMode) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("view", mode);
    setSearchParams(newSearchParams, { replace: true });
  };

  // Function to update active filter in URL params
  const setActiveFilter = React.useCallback(
    (filter: FilterType) => {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set("filter", filter);
      setSearchParams(newSearchParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // Function to update search query in URL params with debouncing
  const setSearchQuery = (query: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    const isSearching = query.trim();
    if (isSearching) {
      newSearchParams.set("q", query);
    } else {
      newSearchParams.delete("q");
    }
    setSearchParams(newSearchParams, { replace: true });
  };

  // Function to set selected tag filter
  const setSelectedTag = (tagName: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (tagName) {
      newSearchParams.set("tag", tagName);
    } else {
      newSearchParams.delete("tag");
    }
    setSearchParams(newSearchParams, { replace: true });
  };

  return {
    activeFilter,
    searchQuery,
    selectedTagName,
    viewMode,
    isFilterExplicit,
    setViewMode,
    setActiveFilter,
    setSearchQuery,
    setSelectedTag,
  };
}
