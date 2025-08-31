import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Clock,
  Grid3X3,
  List,
  Plus,
  Search,
  Tag,
  User,
  Users,
  X,
} from "lucide-react";
import React, { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getNotebookVanityUrl } from "../../util/url-utils";
import { useTrpc } from "../TrpcProvider";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { DateDisplay } from "../ui/DateDisplay";
import { Input } from "../ui/input";

import { useDebug } from "@/components/debug/debug-mode";

import { trpcQueryClient } from "@/lib/trpc-client";
import { DebugModeToggle } from "../debug/DebugModeToggle";
import { LoadingState } from "../loading/LoadingState";
import { RuntLogoSmall } from "../logo/RuntLogoSmall";
import { GitCommitHash } from "../notebook/GitCommitHash";

import { NotebookActions } from "./NotebookActions";
import { NotebookCard } from "./NotebookCard";
import { SimpleUserProfile } from "./SimpleUserProfile";
import { TagActions } from "./TagActions";
import { TagBadge } from "./TagBadge";
import { TagCreationDialog } from "./TagCreationDialog";
import type { NotebookProcessed } from "./types";

const DebugNotebooks = React.lazy(() =>
  import("./DebugNotebooks").then((mod) => ({ default: mod.DebugNotebooks }))
);

type ViewMode = "grid" | "table";
type FilterType = "scratch" | "named" | "shared";

export const NotebookDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Get filter, view mode, and search query from URL params
  const filterParam = searchParams.get("filter");
  const activeFilter: FilterType =
    filterParam === "scratch" ||
    filterParam === "shared" ||
    filterParam === "named"
      ? filterParam
      : "named";

  const searchQuery = searchParams.get("q") || "";
  const selectedTagName = searchParams.get("tag") || "";

  const viewModeParam = searchParams.get("view");
  const viewMode: ViewMode = viewModeParam === "table" ? "table" : "grid";
  const debug = useDebug();

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
    if (query.trim()) {
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

  const trpc = useTrpc();

  // Query all notebooks using tRPC
  const {
    data: notebooksData,
    isLoading,
    error,
    refetch,
  } = useQuery(trpc.notebooks.queryOptions({}));

  // Get user data
  const { data: userData } = useQuery(trpc.me.queryOptions());

  // Get all tags
  const { data: tagsData } = useQuery(trpc.tags.queryOptions());

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

  // Check if user has named notebooks
  const hasNamedNotebooks = useMemo(() => {
    return allNotebooks.some(
      (n) =>
        n.myPermission === "OWNER" && n.title && !n.title.startsWith("Untitled")
    );
  }, [allNotebooks]);

  // Set smart default filter when data first loads
  const hasNotebooks = allNotebooks.length > 0;
  React.useEffect(() => {
    if (hasNotebooks && activeFilter === "named") {
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
  ]);

  // Create notebook mutation
  const createNotebookMutation = useMutation(
    trpc.createNotebook.mutationOptions()
  );

  const handleCreateNotebook = async () => {
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
      }
    } catch (err) {
      console.error("Failed to create notebook:", err);
      // TODO: Show error toast
    }
  };

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-red-600">
            Error Loading Notebooks
          </h1>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar */}
      <div className="w-64 overflow-y-auto border-r border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-200 p-4">
          <RuntLogoSmall />
          <h2 className="font-semibold text-gray-900">Notebooks</h2>
        </div>

        <div className="space-y-6 p-4">
          {/* Navigation */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveFilter("named")}
              className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                activeFilter === "named"
                  ? "border border-blue-200 bg-blue-50 text-blue-700"
                  : "border border-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center">
                <User className="mr-3 h-4 w-4" />
                My Notebooks
              </div>
              <Badge
                variant="secondary"
                className="bg-gray-100 text-xs text-gray-600"
              >
                {
                  allNotebooks.filter(
                    (n) =>
                      n.myPermission === "OWNER" &&
                      n.title &&
                      !n.title.startsWith("Untitled")
                  ).length
                }
              </Badge>
            </button>

            <button
              onClick={() => setActiveFilter("scratch")}
              className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                activeFilter === "scratch"
                  ? "border border-blue-200 bg-blue-50 text-blue-700"
                  : "border border-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center">
                <Users className="mr-3 h-4 w-4" />
                Scratch
              </div>
              <Badge
                variant="secondary"
                className="bg-gray-100 text-xs text-gray-600"
              >
                {
                  allNotebooks.filter(
                    (n) =>
                      n.myPermission === "OWNER" &&
                      (!n.title || n.title.startsWith("Untitled"))
                  ).length
                }
              </Badge>
            </button>

            <button
              onClick={() => setActiveFilter("shared")}
              className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                activeFilter === "shared"
                  ? "border border-blue-200 bg-blue-50 text-blue-700"
                  : "border border-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center">
                <Users className="mr-3 h-4 w-4" />
                Shared with Me
              </div>
              <Badge
                variant="secondary"
                className="bg-gray-100 text-xs text-gray-600"
              >
                {allNotebooks.filter((n) => n.myPermission === "WRITER").length}
              </Badge>
            </button>
          </nav>

          {/* Tags Section */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Filter by Tags
              </h3>
              {selectedTagName && (
                <button
                  onClick={() => setSelectedTag("")}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="space-y-1">
              {tagsData && tagsData.length > 0 ? (
                tagsData.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between rounded-lg px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <button
                      className={`flex min-w-0 flex-1 items-center gap-2 py-1 ${
                        selectedTagName === tag.name
                          ? "text-blue-700"
                          : "text-gray-700"
                      }`}
                      onClick={() =>
                        setSelectedTag(
                          selectedTagName === tag.name ? "" : tag.name
                        )
                      }
                    >
                      <TagBadge tag={tag} className="flex-shrink-0" />
                      {selectedTagName === tag.name && (
                        <div className="ml-1 h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </button>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <Badge variant="secondary" className="ml-2">
                        {
                          allNotebooks.filter((n) =>
                            n.tags?.some((t) => t.id === tag.id)
                          ).length
                        }
                      </Badge>
                      <TagActions tag={tag} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  No tags yet
                </div>
              )}
            </div>

            {/* Add Tag Button */}
            <div className="mt-4 border-t border-gray-100 pt-4">
              <TagCreationDialog
                onTagCreated={() => {
                  trpcQueryClient.invalidateQueries({
                    queryKey: trpc.tags.queryKey(),
                  });
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <div className="border-b border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="relative max-w-2xl flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                type="text"
                placeholder="Search notebooks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex items-center rounded-md border">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`rounded-l-md p-2 transition-colors ${
                    viewMode === "grid"
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`rounded-r-md p-2 transition-colors ${
                    viewMode === "table"
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* New Notebook Button */}
              <Button onClick={handleCreateNotebook}>
                <Plus className="mr-2 h-4 w-4" />
                New Notebook
              </Button>

              {/* Debug Mode Toggle */}
              {import.meta.env.DEV && <DebugModeToggle />}

              {/* User Profile */}
              <SimpleUserProfile />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading && <LoadingState message="Loading notebooks..." />}

          {!isLoading && filteredNotebooks.length === 0 && (
            <div className="py-12 text-center">
              <div className="mb-4 text-gray-400">
                <Users className="mx-auto h-16 w-16" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                {searchQuery.trim()
                  ? "No notebooks found"
                  : activeFilter === "scratch"
                    ? "No scratch notebooks yet"
                    : activeFilter === "named"
                      ? "No named notebooks yet"
                      : "No shared notebooks yet"}
              </h3>
              <p className="mb-6 text-gray-600">
                {searchQuery.trim()
                  ? `No notebooks match "${searchQuery}"`
                  : activeFilter === "scratch"
                    ? "Start experimenting - create, iterate, and promote the good ones."
                    : activeFilter === "named"
                      ? "Name your scratch notebooks to promote them here."
                      : "No notebooks have been shared with you yet."}
              </p>
              {!searchQuery.trim() && activeFilter !== "shared" && (
                <Button onClick={handleCreateNotebook}>
                  <Plus className="mr-2 h-4 w-4" />
                  {activeFilter === "scratch"
                    ? "Start Experimenting"
                    : "Create Your First Notebook"}
                </Button>
              )}
            </div>
          )}

          {debug.enabled && <DebugNotebooks notebooks={filteredNotebooks} />}

          {!isLoading && filteredNotebooks.length > 0 && (
            <div className="space-y-8">
              {/* Active Filters Indicator */}
              {(searchQuery.trim() || selectedTagName) && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-gray-50 p-3">
                  <span className="text-sm text-gray-600">Active filters:</span>
                  {searchQuery.trim() && (
                    <div className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs">
                      <Search className="h-3 w-3" />
                      <span>"{searchQuery}"</span>
                      <button
                        onClick={() => setSearchQuery("")}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {selectedTagName && tagsData && (
                    <div className="flex items-center gap-1">
                      {(() => {
                        const selectedTag = tagsData.find(
                          (t) => t.name === selectedTagName
                        );
                        return selectedTag ? (
                          <div className="flex items-center gap-1 rounded-full bg-gray-200 px-2 py-1 text-xs">
                            <Tag className="h-3 w-3" />
                            <TagBadge tag={selectedTag} className="text-xs" />
                            <button
                              onClick={() => setSelectedTag("")}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedTag("");
                    }}
                    className="ml-auto text-xs text-blue-600 hover:text-blue-800"
                  >
                    Clear all filters
                  </button>
                </div>
              )}

              {/* Search Results Section (prioritized when searching) */}
              {searchQuery.trim() && (
                <section>
                  <div className="mb-4 flex items-center">
                    <Users className="mr-2 h-5 w-5 text-gray-500" />
                    <h2 className="text-lg font-semibold text-gray-900">
                      Search Results
                    </h2>
                    <Badge variant="secondary" className="ml-2">
                      {filteredNotebooks.length}
                    </Badge>
                  </div>
                  <NotebookGrid
                    notebooks={filteredNotebooks}
                    viewMode={viewMode}
                    onUpdate={() => refetch()}
                  />
                </section>
              )}

              {/* Recent Scratch Work Section (for scratch filter when not searching) */}
              {!searchQuery.trim() &&
                activeFilter === "scratch" &&
                recentScratchNotebooks.length > 0 && (
                  <section>
                    <div className="mb-4 flex items-center">
                      <Clock className="mr-2 h-5 w-5 text-gray-500" />
                      <h2 className="text-lg font-semibold text-gray-900">
                        Recent Scratch Work
                      </h2>
                      <Badge variant="secondary" className="ml-2">
                        {recentScratchNotebooks.length}
                      </Badge>
                    </div>
                    <NotebookGrid
                      notebooks={recentScratchNotebooks}
                      viewMode={viewMode}
                      onUpdate={() => refetch()}
                    />
                  </section>
                )}

              {/* Named Notebooks Section (for named filter when not searching) */}
              {!searchQuery.trim() &&
                activeFilter === "named" &&
                namedNotebooks.length > 0 && (
                  <section>
                    <div className="mb-4 flex items-center">
                      <Tag className="mr-2 h-5 w-5 text-gray-500" />
                      <h2 className="text-lg font-semibold text-gray-900">
                        My Notebooks
                      </h2>
                      <Badge variant="secondary" className="ml-2">
                        {namedNotebooks.length}
                      </Badge>
                    </div>
                    <NotebookGrid
                      notebooks={namedNotebooks}
                      viewMode={viewMode}
                      onUpdate={() => refetch()}
                    />
                  </section>
                )}

              {/* All Results (for shared filter or fallback when not searching) */}
              {!searchQuery.trim() &&
                (activeFilter === "shared" ||
                  (activeFilter === "scratch" &&
                    !recentScratchNotebooks.length &&
                    filteredNotebooks.length > 0) ||
                  (activeFilter === "named" &&
                    !namedNotebooks.length &&
                    filteredNotebooks.length > 0)) && (
                  <section>
                    <div className="mb-4 flex items-center">
                      <Users className="mr-2 h-5 w-5 text-gray-500" />
                      <h2 className="text-lg font-semibold text-gray-900">
                        {activeFilter === "shared"
                          ? "Shared with Me"
                          : activeFilter === "scratch"
                            ? "All Scratch Work"
                            : "All My Notebooks"}
                      </h2>
                      <Badge variant="secondary" className="ml-2">
                        {filteredNotebooks.length}
                      </Badge>
                    </div>
                    <NotebookGrid
                      notebooks={filteredNotebooks}
                      viewMode={viewMode}
                      onUpdate={() => refetch()}
                    />
                  </section>
                )}
            </div>
          )}

          <div className="mt-8 flex justify-center border-t px-4 py-2 text-center">
            <GitCommitHash />
          </div>
        </div>
      </div>
    </div>
  );
};

// Grid/Table component for notebooks
interface NotebookGridProps {
  notebooks: NotebookProcessed[];
  viewMode: ViewMode;
  onUpdate?: () => void;
}

const NotebookGrid: React.FC<NotebookGridProps> = ({
  notebooks,
  viewMode,
  onUpdate,
}) => {
  if (viewMode === "grid") {
    return (
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {notebooks.map((notebook) => (
          <NotebookCard
            key={notebook.id}
            notebook={notebook}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    );
  }

  // Table view
  return (
    <div className="rounded-lg border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-4 text-left font-medium text-gray-900">Name</th>
              <th className="p-4 text-left font-medium text-gray-900">Owner</th>
              <th className="p-4 text-left font-medium text-gray-900">
                Permission
              </th>
              <th className="p-4 text-left font-medium text-gray-900">Tags</th>
              <th className="p-4 text-left font-medium text-gray-900">
                Updated
              </th>
              <th className="p-4 text-left font-medium text-gray-900">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {notebooks.map((notebook) => (
              <NotebookTableRow
                key={notebook.id}
                notebook={notebook}
                onUpdate={onUpdate}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Table row component
interface NotebookTableRowProps {
  notebook: NotebookProcessed;
  onUpdate?: () => void;
}

const NotebookTableRow: React.FC<NotebookTableRowProps> = ({
  notebook,
  onUpdate,
}) => {
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

  return (
    <tr className="border-b transition-colors hover:bg-gray-50">
      <td className="p-4">
        <a
          href={getNotebookVanityUrl(notebook.id, notebook.title)}
          className="font-medium text-blue-600 hover:text-blue-800"
        >
          {notebook.title || "Untitled Notebook"}
        </a>
      </td>
      <td className="p-4 text-gray-600">
        {notebook.owner?.givenName && notebook.owner?.familyName
          ? `${notebook.owner.givenName} ${notebook.owner.familyName}`
          : "Unknown Owner"}
      </td>
      <td className="p-4">
        <Badge variant={getPermissionBadgeVariant(notebook.myPermission)}>
          {notebook.myPermission.toLowerCase()}
        </Badge>
      </td>
      <td className="p-4">
        {notebook.tags && notebook.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {notebook.tags.slice(0, 2).map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
            {notebook.tags.length > 2 && (
              <Badge variant="outline" className="px-2 py-0.5 text-xs">
                +{notebook.tags.length - 2} more
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-sm text-gray-400">No tags</span>
        )}
      </td>
      <td className="p-4 text-gray-600">
        <DateDisplay date={notebook.updated_at} format="short" />
      </td>
      <td className="p-4">
        <NotebookActions notebook={notebook} onUpdate={onUpdate} />
      </td>
    </tr>
  );
};
