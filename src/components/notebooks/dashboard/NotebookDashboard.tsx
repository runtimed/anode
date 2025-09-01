import { useDebug } from "@/components/debug/debug-mode";
import { DebugModeToggle } from "@/components/debug/DebugModeToggle";
import { LoadingState } from "@/components/loading/LoadingState";
import { RuntLogoSmall } from "@/components/logo/RuntLogoSmall";
import { GitCommitHash } from "@/components/notebook/GitCommitHash";
import { NotebookGrid } from "@/components/notebooks/NotebookListView";
import { SimpleUserProfile } from "@/components/notebooks/SimpleUserProfile";
import { TagActions } from "@/components/notebooks/TagActions";
import { TagBadge } from "@/components/notebooks/TagBadge";
import { TagCreationDialog } from "@/components/notebooks/TagCreationDialog";
import { NotebookProcessed } from "@/components/notebooks/types";
import { useTrpc } from "@/components/TrpcProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNotebooks } from "@/hooks/use-notebooks";
import { trpcQueryClient } from "@/lib/trpc-client";
import { useQuery } from "@tanstack/react-query";
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
import { useCreateNotebookAndNavigate, useDashboardParams } from "./helpers";

const DebugNotebooks = React.lazy(() =>
  import("../DebugNotebooks").then((mod) => ({ default: mod.DebugNotebooks }))
);

function useSmartDefaultFilter({
  allNotebooks,
}: {
  allNotebooks: NotebookProcessed[];
}) {
  const { activeFilter, setActiveFilter } = useDashboardParams();

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
}

export const NotebookDashboard: React.FC = () => {
  const debug = useDebug();

  const { activeFilter, searchQuery, selectedTagName } = useDashboardParams();
  const {
    allNotebooks,
    filteredNotebooks,
    recentScratchNotebooks,
    namedNotebooks,
    isLoading,
    error,
    refetch,
  } = useNotebooks(selectedTagName, activeFilter, searchQuery);

  useSmartDefaultFilter({ allNotebooks });

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
        <Filters allNotebooks={allNotebooks} />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopHeader />

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading && <LoadingState message="Loading notebooks..." />}
          {debug.enabled && <DebugNotebooks notebooks={filteredNotebooks} />}

          {!isLoading && filteredNotebooks.length === 0 && <EmptyState />}

          {!isLoading && filteredNotebooks.length > 0 && (
            <Results
              refetch={refetch}
              recentScratchNotebooks={recentScratchNotebooks}
              namedNotebooks={namedNotebooks}
              filteredNotebooks={filteredNotebooks}
            />
          )}

          <div className="mt-8 flex justify-center border-t px-4 py-2 text-center">
            <GitCommitHash />
          </div>
        </div>
      </div>
    </div>
  );
};

function Filters({ allNotebooks }: { allNotebooks: NotebookProcessed[] }) {
  const { activeFilter, selectedTagName, setActiveFilter, setSelectedTag } =
    useDashboardParams();

  const trpc = useTrpc();
  const { data: tagsData } = useQuery(trpc.tags.queryOptions());

  if (!tagsData) {
    return <LoadingState message="Loading tags..." />;
  }

  return (
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
                    setSelectedTag(selectedTagName === tag.name ? "" : tag.name)
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
  );
}

function TopHeader() {
  const { viewMode, setViewMode } = useDashboardParams();
  const createNotebook = useCreateNotebookAndNavigate();

  return (
    <div className="border-b border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-4">
        {/* Search */}
        <SearchInput />

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
          <Button onClick={createNotebook}>
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
  );
}

function SearchInput() {
  const { searchQuery, setSearchQuery } = useDashboardParams();

  return (
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
  );
}

function EmptyState() {
  const { searchQuery, activeFilter } = useDashboardParams();
  const createNotebook = useCreateNotebookAndNavigate();
  const isSearching = searchQuery.trim();

  return (
    <div className="py-12 text-center">
      <div className="mb-4 text-gray-400">
        <Users className="mx-auto h-16 w-16" />
      </div>
      <h3 className="mb-2 text-lg font-medium text-gray-900">
        {isSearching
          ? "No notebooks found"
          : activeFilter === "scratch"
            ? "No scratch notebooks yet"
            : activeFilter === "named"
              ? "No named notebooks yet"
              : "No shared notebooks yet"}
      </h3>
      <p className="mb-6 text-gray-600">
        {isSearching
          ? `No notebooks match "${searchQuery}"`
          : activeFilter === "scratch"
            ? "Start experimenting - create, iterate, and promote the good ones."
            : activeFilter === "named"
              ? "Name your scratch notebooks to promote them here."
              : "No notebooks have been shared with you yet."}
      </p>
      {!isSearching && activeFilter !== "shared" && (
        <Button onClick={createNotebook}>
          <Plus className="mr-2 h-4 w-4" />
          {activeFilter === "scratch"
            ? "Start Experimenting"
            : "Create Your First Notebook"}
        </Button>
      )}
    </div>
  );
}

function Results({
  refetch,
  recentScratchNotebooks,
  namedNotebooks,
  filteredNotebooks,
}: {
  refetch: () => void;
  recentScratchNotebooks: NotebookProcessed[];
  namedNotebooks: NotebookProcessed[];
  filteredNotebooks: NotebookProcessed[];
}) {
  const { searchQuery, activeFilter, viewMode } = useDashboardParams();
  const isSearching = searchQuery.trim();

  return (
    <div className="space-y-8">
      <ActiveFilters />

      {/* Search Results Section (prioritized when searching) */}
      {isSearching && (
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

      {/* Named Notebooks Section (for named filter when not searching) */}
      {!isSearching &&
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

      {/* Recent Scratch Work Section (for scratch filter when not searching) */}
      {!isSearching &&
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

      {/* All Results (for shared filter or fallback when not searching) */}
      {!isSearching &&
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
  );
}

function ActiveFilters() {
  const { searchQuery, setSearchQuery, selectedTagName, setSelectedTag } =
    useDashboardParams();

  const trpc = useTrpc();
  const { data: tagsData } = useQuery(trpc.tags.queryOptions());
  const isSearching = searchQuery.trim();

  return (
    <>
      {/* Active Filters Indicator */}
      {(isSearching || selectedTagName) && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-gray-50 p-3">
          <span className="text-sm text-gray-600">Active filters:</span>
          {isSearching && (
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
    </>
  );
}
