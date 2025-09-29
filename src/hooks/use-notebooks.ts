import { useQuery } from "@tanstack/react-query";
import { useMemo, useEffect } from "react";
import { useTrpc } from "@/components/TrpcProvider";
import {
  notebookQueryDefaults,
  tagQueryDefaults,
  trpcQueryClient,
} from "@/lib/trpc-client";

import type { NotebookProcessed } from "@/components/notebooks/types";

export type FilterType = "scratch" | "named" | "shared";

export function useNotebooks(
  selectedTagName: string,
  activeFilter: FilterType,
  searchQuery: string
) {
  const trpc = useTrpc();

  // Query all notebooks using tRPC with aggressive caching
  const {
    data: notebooksData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    ...trpc.notebooks.queryOptions({}),
    ...notebookQueryDefaults,
  });

  // Get user data with caching
  const { data: userData } = useQuery({
    ...trpc.me.queryOptions(),
    ...notebookQueryDefaults,
  });

  // Prefetch tags to warm the cache
  useEffect(() => {
    if (userData?.id) {
      trpcQueryClient.prefetchQuery({
        ...trpc.tags.queryOptions(),
        ...tagQueryDefaults,
      });
    }
  }, [userData?.id, trpc.tags]);

  const allNotebooks = useMemo(() => {
    if (!notebooksData || !Array.isArray(notebooksData)) return [];

    // Add permission information to each notebook
    return notebooksData.map(
      (notebook: any): NotebookProcessed =>
        ({
          ...notebook,
          myPermission: notebook.owner_id === userData?.id ? "OWNER" : "WRITER",
          owner: {
            id: notebook.owner_id,
            givenName: userData?.givenName || "",
            familyName: userData?.familyName || "",
          },
          collaborators: notebook.collaborators || [],
        }) as const
    );
  }, [notebooksData, userData]);

  // Filter and group notebooks
  const { filteredNotebooks, recentScratchNotebooks, namedNotebooks } =
    useMemo(() => {
      // Apply tag filter first to create base set
      let baseFiltered = allNotebooks;
      if (selectedTagName) {
        baseFiltered = baseFiltered.filter((n: NotebookProcessed) =>
          n.tags?.some((tag: any) => tag.name === selectedTagName)
        );
      }

      // Apply activeFilter to baseFiltered
      let filtered = baseFiltered;
      if (activeFilter === "scratch") {
        filtered = filtered.filter(
          (n: NotebookProcessed) =>
            n.myPermission === "OWNER" &&
            (!n.title || n.title.startsWith("Untitled"))
        );
      } else if (activeFilter === "named") {
        filtered = filtered.filter(
          (n: NotebookProcessed) =>
            n.myPermission === "OWNER" &&
            n.title &&
            !n.title.startsWith("Untitled")
        );
      } else if (activeFilter === "shared") {
        filtered = filtered.filter(
          (n: NotebookProcessed) => n.myPermission === "WRITER"
        );
      }

      // Apply search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter((n: NotebookProcessed) =>
          n.title?.toLowerCase().includes(query)
        );
      }

      // Group scratch notebooks by recency (last 7 days) for scratch view
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentScratch = filtered.filter(
        (n: NotebookProcessed) =>
          new Date(n.updated_at) > sevenDaysAgo &&
          (!n.title || n.title.startsWith("Untitled"))
      );

      // All named notebooks from tag-filtered base (respects tag filter)
      const named = baseFiltered.filter(
        (n: NotebookProcessed) =>
          n.myPermission === "OWNER" &&
          n.title &&
          !n.title.startsWith("Untitled")
      );

      return {
        filteredNotebooks: filtered,
        recentScratchNotebooks: recentScratch,
        namedNotebooks: named,
      };
    }, [allNotebooks, activeFilter, searchQuery, selectedTagName]);

  return {
    allNotebooks,
    filteredNotebooks,
    recentScratchNotebooks,
    namedNotebooks,
    isLoading: isLoading,
    error,
    refetch,
  };
}
