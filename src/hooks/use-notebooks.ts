import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTrpc } from "@/components/TrpcProvider";

import type { NotebookProcessed } from "@/components/notebooks/types";

export type FilterType = "scratch" | "named" | "shared";

export function useNotebooks(
  selectedTagName: string,
  activeFilter: FilterType,
  searchQuery: string
) {
  const trpc = useTrpc();

  // Query all notebooks using tRPC
  const {
    data: notebooksData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery(trpc.notebooks.queryOptions({}));

  // Get user data
  const { data: userData } = useQuery(trpc.me.queryOptions());

  const allNotebooks = useMemo(() => {
    if (!notebooksData) return [];

    // Add permission information to each notebook
    return notebooksData.map(
      (notebook): NotebookProcessed =>
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
        baseFiltered = baseFiltered.filter((n) =>
          n.tags?.some((tag) => tag.name === selectedTagName)
        );
      }

      // Apply activeFilter to baseFiltered
      let filtered = baseFiltered;
      if (activeFilter === "scratch") {
        filtered = filtered.filter(
          (n) =>
            n.myPermission === "OWNER" &&
            (!n.title || n.title.startsWith("Untitled"))
        );
      } else if (activeFilter === "named") {
        filtered = filtered.filter(
          (n) =>
            n.myPermission === "OWNER" &&
            n.title &&
            !n.title.startsWith("Untitled")
        );
      } else if (activeFilter === "shared") {
        filtered = filtered.filter((n) => n.myPermission === "WRITER");
      }

      // Apply search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter((n) =>
          n.title?.toLowerCase().includes(query)
        );
      }

      // Group scratch notebooks by recency (last 7 days) for scratch view
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentScratch = filtered.filter(
        (n) =>
          new Date(n.updated_at) > sevenDaysAgo &&
          (!n.title || n.title.startsWith("Untitled"))
      );

      // All named notebooks from tag-filtered base (respects tag filter)
      const named = baseFiltered.filter(
        (n) =>
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
