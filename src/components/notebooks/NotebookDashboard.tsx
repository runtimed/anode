import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  Clock,
  Filter,
  Grid3X3,
  List,
  Plus,
  Search,
  Tag,
  User,
  Users,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "../../lib/trpc-client";
import { getNotebookVanityUrl } from "../../util/url-utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

import { LoadingState } from "../loading/LoadingState";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { NotebookCard } from "./NotebookCard";
import { SimpleUserProfile } from "./SimpleUserProfile";
import type { NotebookProcessed } from "./types";

type ViewMode = "grid" | "table";
type FilterType = "scratch" | "named" | "shared";

export const NotebookDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("named");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Query all notebooks using tRPC
  const {
    data: notebooksData,
    isLoading,
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
          collaborators: notebook.collaborators,
        }) as const
    );
  }, [notebooksData, userData]);

  // Filter and group notebooks
  const { filteredNotebooks, recentScratchNotebooks, namedNotebooks } =
    useMemo(() => {
      let filtered = allNotebooks;

      // Apply filter
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

      // All named notebooks (not starting with "Untitled")
      const named = allNotebooks.filter(
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
    }, [allNotebooks, activeFilter, searchQuery]);

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
  }, [hasNotebooks, activeFilter, hasNamedNotebooks, allNotebooks]);

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
        <div className="border-b border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900">Notebooks</h2>
        </div>

        {/* Filter Sections */}
        <div className="space-y-6 p-4">
          {/* Main Filters */}
          <div>
            <h3 className="mb-3 flex items-center text-sm font-medium text-gray-500">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </h3>
            <div className="space-y-1">
              {hasNamedNotebooks && (
                <button
                  onClick={() => setActiveFilter("named")}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    activeFilter === "named"
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    My Notebooks
                    <Badge variant="secondary" className="ml-auto">
                      {
                        allNotebooks.filter(
                          (n) =>
                            n.myPermission === "OWNER" &&
                            n.title &&
                            !n.title.startsWith("Untitled")
                        ).length
                      }
                    </Badge>
                  </div>
                </button>
              )}
              <button
                onClick={() => setActiveFilter("scratch")}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  activeFilter === "scratch"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  Scratch Notebooks
                  <Badge variant="secondary" className="ml-auto">
                    {
                      allNotebooks.filter(
                        (n) =>
                          n.myPermission === "OWNER" &&
                          (!n.title || n.title.startsWith("Untitled"))
                      ).length
                    }
                  </Badge>
                </div>
              </button>
              <button
                onClick={() => setActiveFilter("shared")}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  activeFilter === "shared"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  Shared with Me
                  <Badge variant="secondary" className="ml-auto">
                    {
                      allNotebooks.filter((n) => n.myPermission === "WRITER")
                        .length
                    }
                  </Badge>
                </div>
              </button>
            </div>
          </div>

          {/* Tags Section - Placeholder for future */}
          <div>
            <h3 className="mb-3 flex items-center text-sm font-medium text-gray-500">
              <Tag className="mr-2 h-4 w-4" />
              Tags
            </h3>
            <div className="text-sm text-gray-400 italic">Coming soon...</div>
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

              {/* New Notebook Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleCreateNotebook}>
                    <Plus className="mr-2 h-4 w-4" />
                    Blank Notebook
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <Plus className="mr-2 h-4 w-4" />
                    From Template (Soon)
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <Plus className="mr-2 h-4 w-4" />
                    Import (Soon)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

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

          {!isLoading && filteredNotebooks.length > 0 && (
            <div className="space-y-8">
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
              <th className="p-4 text-left font-medium text-gray-900">
                Updated
              </th>
            </tr>
          </thead>
          <tbody>
            {notebooks.map((notebook) => (
              <NotebookTableRow key={notebook.id} notebook={notebook} />
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
}

const NotebookTableRow: React.FC<NotebookTableRowProps> = ({ notebook }) => {
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
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
      <td className="p-4 text-gray-600">{formatDate(notebook.updated_at)}</td>
    </tr>
  );
};
