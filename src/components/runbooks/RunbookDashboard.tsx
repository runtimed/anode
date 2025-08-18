import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  ChevronDown,
  Grid3X3,
  List,
  User,
  Users,
  Tag,
  Filter,
  Clock,
} from "lucide-react";
import { getRunbookVanityUrl } from "../../util/url-utils";
import { useQuery, useMutation } from "../../lib/graphql-client";
import {
  LIST_RUNBOOKS,
  CREATE_RUNBOOK,
  type Runbook,
  type CreateRunbookInput,
} from "../../queries/runbooks";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { LoadingState } from "../loading/LoadingState";
import { RunbookCard } from "./RunbookCard.js";
import { SimpleUserProfile } from "./SimpleUserProfile.js";

type ViewMode = "grid" | "table";
type FilterType = "scratch" | "named" | "shared";

interface RunbookDashboardProps {}

export const RunbookDashboard: React.FC<RunbookDashboardProps> = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("named");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Query all runbooks
  const [{ data, fetching, error }, refetch] = useQuery({
    query: LIST_RUNBOOKS,
    variables: {},
  });

  // Create runbook mutation
  const [, createRunbook] = useMutation(CREATE_RUNBOOK);

  const allRunbooks = useMemo(() => data?.runbooks || [], [data?.runbooks]);

  // Filter and group runbooks
  const { filteredRunbooks, recentScratchRunbooks, namedRunbooks } =
    useMemo(() => {
      let filtered = allRunbooks;

      // Apply filter
      if (activeFilter === "scratch") {
        filtered = filtered.filter(
          (r: Runbook) =>
            r.myPermission === "OWNER" &&
            (!r.title || r.title.startsWith("Untitled"))
        );
      } else if (activeFilter === "named") {
        filtered = filtered.filter(
          (r: Runbook) =>
            r.myPermission === "OWNER" &&
            r.title &&
            !r.title.startsWith("Untitled")
        );
      } else if (activeFilter === "shared") {
        filtered = filtered.filter((r: Runbook) => r.myPermission === "WRITER");
      }

      // Apply search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter((r: Runbook) =>
          r.title?.toLowerCase().includes(query)
        );
      }

      // Group scratch runbooks by recency (last 7 days) for scratch view
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentScratch = filtered.filter(
        (r: Runbook) =>
          new Date(r.updatedAt) > sevenDaysAgo &&
          (!r.title || r.title.startsWith("Untitled"))
      );

      // All named runbooks (not starting with "Untitled")
      const named = allRunbooks.filter(
        (r: Runbook) =>
          r.myPermission === "OWNER" &&
          r.title &&
          !r.title.startsWith("Untitled")
      );

      return {
        filteredRunbooks: filtered,
        recentScratchRunbooks: recentScratch,
        namedRunbooks: named,
      };
    }, [allRunbooks, activeFilter, searchQuery]);

  // Check if user has named runbooks
  const hasNamedRunbooks = useMemo(() => {
    return allRunbooks.some(
      (r: Runbook) =>
        r.myPermission === "OWNER" && r.title && !r.title.startsWith("Untitled")
    );
  }, [allRunbooks]);

  // Set smart default filter when data first loads
  const hasRunbooks = allRunbooks.length > 0;
  React.useEffect(() => {
    if (hasRunbooks && activeFilter === "named") {
      const hasScratchRunbooks = allRunbooks.some(
        (r: Runbook) =>
          r.myPermission === "OWNER" &&
          (!r.title || r.title.startsWith("Untitled"))
      );
      const hasSharedRunbooks = allRunbooks.some(
        (r: Runbook) => r.myPermission === "WRITER"
      );

      // Smart default: named > scratch > shared
      if (hasNamedRunbooks) {
        // Stay on named
      } else if (hasScratchRunbooks) {
        setActiveFilter("scratch");
      } else if (hasSharedRunbooks) {
        setActiveFilter("shared");
      }
    }
  }, [hasRunbooks, activeFilter, hasNamedRunbooks, allRunbooks]);

  const handleCreateRunbook = async () => {
    const input: CreateRunbookInput = {
      title: "Untitled Runbook",
    };

    try {
      const result = await createRunbook({ input });
      if (result.error) {
        console.error("Failed to create runbook:", result.error);
      } else if (result.data?.createRunbook) {
        const runbook = result.data.createRunbook;
        navigate(getRunbookVanityUrl(runbook.ulid, runbook.title), {
          state: { initialRunbook: runbook },
        });
      }
    } catch (err) {
      console.error("Failed to create runbook:", err);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-red-600">
            Error Loading Runbooks
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
          <h2 className="font-semibold text-gray-900">Runbooks</h2>
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
              {hasNamedRunbooks && (
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
                    My Runbooks
                    <Badge variant="secondary" className="ml-auto">
                      {
                        allRunbooks.filter(
                          (r: Runbook) =>
                            r.myPermission === "OWNER" &&
                            r.title &&
                            !r.title.startsWith("Untitled")
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
                  Scratch Runbooks
                  <Badge variant="secondary" className="ml-auto">
                    {
                      allRunbooks.filter(
                        (r: Runbook) =>
                          r.myPermission === "OWNER" &&
                          (!r.title || r.title.startsWith("Untitled"))
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
                      allRunbooks.filter(
                        (r: Runbook) => r.myPermission === "WRITER"
                      ).length
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
                placeholder="Search runbooks..."
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

              {/* New Runbook Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleCreateRunbook}>
                    <Plus className="mr-2 h-4 w-4" />
                    Blank Runbook
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
          {fetching && <LoadingState message="Loading runbooks..." />}

          {!fetching && filteredRunbooks.length === 0 && (
            <div className="py-12 text-center">
              <div className="mb-4 text-gray-400">
                <Users className="mx-auto h-16 w-16" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                {searchQuery.trim()
                  ? "No runbooks found"
                  : activeFilter === "scratch"
                    ? "No scratch runbooks yet"
                    : activeFilter === "named"
                      ? "No named runbooks yet"
                      : "No shared runbooks yet"}
              </h3>
              <p className="mb-6 text-gray-600">
                {searchQuery.trim()
                  ? `No runbooks match "${searchQuery}"`
                  : activeFilter === "scratch"
                    ? "Start experimenting - create, iterate, and promote the good ones."
                    : activeFilter === "named"
                      ? "Name your scratch runbooks to promote them here."
                      : "No runbooks have been shared with you yet."}
              </p>
              {!searchQuery.trim() && activeFilter !== "shared" && (
                <Button onClick={handleCreateRunbook}>
                  <Plus className="mr-2 h-4 w-4" />
                  {activeFilter === "scratch"
                    ? "Start Experimenting"
                    : "Create Your First Runbook"}
                </Button>
              )}
            </div>
          )}

          {!fetching && filteredRunbooks.length > 0 && (
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
                      {filteredRunbooks.length}
                    </Badge>
                  </div>
                  <RunbookGrid
                    runbooks={filteredRunbooks}
                    viewMode={viewMode}
                    onUpdate={() => refetch()}
                  />
                </section>
              )}

              {/* Recent Scratch Work Section (for scratch filter when not searching) */}
              {!searchQuery.trim() &&
                activeFilter === "scratch" &&
                recentScratchRunbooks.length > 0 && (
                  <section>
                    <div className="mb-4 flex items-center">
                      <Clock className="mr-2 h-5 w-5 text-gray-500" />
                      <h2 className="text-lg font-semibold text-gray-900">
                        Recent Scratch Work
                      </h2>
                      <Badge variant="secondary" className="ml-2">
                        {recentScratchRunbooks.length}
                      </Badge>
                    </div>
                    <RunbookGrid
                      runbooks={recentScratchRunbooks}
                      viewMode={viewMode}
                      onUpdate={() => refetch()}
                    />
                  </section>
                )}

              {/* Named Runbooks Section (for named filter when not searching) */}
              {!searchQuery.trim() &&
                activeFilter === "named" &&
                namedRunbooks.length > 0 && (
                  <section>
                    <div className="mb-4 flex items-center">
                      <Tag className="mr-2 h-5 w-5 text-gray-500" />
                      <h2 className="text-lg font-semibold text-gray-900">
                        My Runbooks
                      </h2>
                      <Badge variant="secondary" className="ml-2">
                        {namedRunbooks.length}
                      </Badge>
                    </div>
                    <RunbookGrid
                      runbooks={namedRunbooks}
                      viewMode={viewMode}
                      onUpdate={() => refetch()}
                    />
                  </section>
                )}

              {/* All Results (for shared filter or fallback when not searching) */}
              {!searchQuery.trim() &&
                (activeFilter === "shared" ||
                  (activeFilter === "scratch" &&
                    !recentScratchRunbooks.length &&
                    filteredRunbooks.length > 0) ||
                  (activeFilter === "named" &&
                    !namedRunbooks.length &&
                    filteredRunbooks.length > 0)) && (
                  <section>
                    <div className="mb-4 flex items-center">
                      <Users className="mr-2 h-5 w-5 text-gray-500" />
                      <h2 className="text-lg font-semibold text-gray-900">
                        {activeFilter === "shared"
                          ? "Shared with Me"
                          : activeFilter === "scratch"
                            ? "All Scratch Work"
                            : "All My Runbooks"}
                      </h2>
                      <Badge variant="secondary" className="ml-2">
                        {filteredRunbooks.length}
                      </Badge>
                    </div>
                    <RunbookGrid
                      runbooks={filteredRunbooks}
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

// Grid/Table component for runbooks
interface RunbookGridProps {
  runbooks: Runbook[];
  viewMode: ViewMode;
  onUpdate?: () => void;
}

const RunbookGrid: React.FC<RunbookGridProps> = ({
  runbooks,
  viewMode,
  onUpdate,
}) => {
  if (viewMode === "grid") {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {runbooks.map((runbook) => (
          <RunbookCard
            key={runbook.ulid}
            runbook={runbook}
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
            {runbooks.map((runbook) => (
              <RunbookTableRow key={runbook.ulid} runbook={runbook} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Table row component
interface RunbookTableRowProps {
  runbook: Runbook;
}

const RunbookTableRow: React.FC<RunbookTableRowProps> = ({ runbook }) => {
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
          href={getRunbookVanityUrl(runbook.ulid, runbook.title)}
          className="font-medium text-blue-600 hover:text-blue-800"
        >
          {runbook.title || "Untitled Runbook"}
        </a>
      </td>
      <td className="p-4 text-gray-600">
        {runbook.owner.givenName && runbook.owner.familyName
          ? `${runbook.owner.givenName} ${runbook.owner.familyName}`
          : "Unknown Owner"}
      </td>
      <td className="p-4">
        <Badge variant={getPermissionBadgeVariant(runbook.myPermission)}>
          {runbook.myPermission.toLowerCase()}
        </Badge>
      </td>
      <td className="p-4 text-gray-600">{formatDate(runbook.updatedAt)}</td>
    </tr>
  );
};
