import { NotebooksCardOrTable } from "@/components/notebooks/dashboard/NotebooksCardOrTable";
import { TagBadge } from "@/components/notebooks/TagBadge";
import { NotebookProcessed } from "@/components/notebooks/types";
import { useTrpc } from "@/components/TrpcProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Clock, Plus, Search, Tag, Users, X } from "lucide-react";
import { useCreateNotebookAndNavigate, useDashboardParams } from "./helpers";

export function Results({
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
          <NotebooksCardOrTable
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
            <NotebooksCardOrTable
              notebooks={namedNotebooks}
              viewMode={viewMode}
              onUpdate={() => refetch()}
            />
          </section>
        )}

      {/* All Scratch Work Section (for scratch filter when not searching) */}
      {!isSearching &&
        activeFilter === "scratch" &&
        filteredNotebooks.length > 0 && (
          <section>
            <div className="mb-4 flex items-center">
              <Users className="mr-2 h-5 w-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">
                All Scratch Work
              </h2>
              <Badge variant="secondary" className="ml-2">
                {filteredNotebooks.length}
              </Badge>
            </div>
            <NotebooksCardOrTable
              notebooks={filteredNotebooks}
              viewMode={viewMode}
              onUpdate={() => refetch()}
            />
          </section>
        )}

      {/* All Results (for shared filter or fallback when not searching) */}
      {!isSearching &&
        (activeFilter === "shared" ||
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
            <NotebooksCardOrTable
              notebooks={filteredNotebooks}
              viewMode={viewMode}
              onUpdate={() => refetch()}
            />
          </section>
        )}
    </div>
  );
}

export function NoResults() {
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
