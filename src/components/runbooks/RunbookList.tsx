import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Users, Clock, User } from "lucide-react";
import { getRunbookVanityUrl } from "../../util/url-utils";
import { useQuery, useMutation } from "../../lib/graphql-client";
import {
  LIST_RUNBOOKS,
  CREATE_RUNBOOK,
  type Runbook,
  type CreateRunbookInput,
} from "../../queries/runbooks";
import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs.js";
import { LoadingState } from "../loading/LoadingState";

type FilterType = "all" | "owned" | "shared";

interface RunbookListProps {}

export const RunbookList: React.FC<RunbookListProps> = () => {
  const [filter, setFilter] = useState<"all" | "owned" | "shared">("all");
  const navigate = useNavigate();

  // Query runbooks based on current filter
  const [{ data, fetching, error }] = useQuery({
    query: LIST_RUNBOOKS,
    variables: useMemo(() => {
      switch (filter) {
        case "owned":
          return { owned: true };
        case "shared":
          return { shared: true };
        default:
          return {};
      }
    }, [filter]),
  });

  // Create runbook mutation
  const [, createRunbook] = useMutation(CREATE_RUNBOOK);

  const runbooks = data?.runbooks || [];

  const handleCreateRunbook = async () => {
    const input: CreateRunbookInput = {
      title: "Untitled Runbook",
    };

    try {
      const result = await createRunbook({ input });
      if (result.error) {
        console.error("Failed to create runbook:", result.error);
        // TODO: Show error toast
      } else if (result.data?.createRunbook) {
        // Redirect to the new runbook with initial data to prevent flicker
        const runbook = result.data.createRunbook;
        navigate(getRunbookVanityUrl(runbook.ulid, runbook.title), {
          state: { initialRunbook: runbook },
        });
      }
    } catch (err) {
      console.error("Failed to create runbook:", err);
      // TODO: Show error toast
    }
  };

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
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Runbooks</h1>
          <p className="mt-2 text-gray-600">
            Manage your computational notebooks and collaborations
          </p>
        </div>

        <Button onClick={handleCreateRunbook}>
          <Plus className="mr-2 h-4 w-4" />
          New Runbook
        </Button>
      </div>

      {/* Filter Tabs */}
      <Tabs
        value={filter}
        onValueChange={(value: string) => setFilter(value as FilterType)}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Runbooks</TabsTrigger>
          <TabsTrigger value="owned">Owned</TabsTrigger>
          <TabsTrigger value="shared">Shared with Me</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-0">
          {fetching && <LoadingState message="Loading runbooks..." />}

          {!fetching && runbooks.length === 0 && (
            <div className="py-12 text-center">
              <div className="mb-4 text-gray-400">
                <Users className="mx-auto h-16 w-16" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                {filter === "owned"
                  ? "No runbooks created yet"
                  : filter === "shared"
                    ? "No runbooks shared with you"
                    : "No runbooks found"}
              </h3>
              <p className="mb-6 text-gray-600">
                {filter === "owned" || filter === "all"
                  ? "Get started by creating your first runbook."
                  : "Ask a colleague to share a runbook with you."}
              </p>
              {(filter === "owned" || filter === "all") && (
                <Button onClick={handleCreateRunbook}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Runbook
                </Button>
              )}
            </div>
          )}

          {!fetching && runbooks.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {runbooks.map((runbook: Runbook) => (
                <Link
                  key={runbook.ulid}
                  to={getRunbookVanityUrl(runbook.ulid, runbook.title)}
                  className="block transition-transform hover:scale-[1.02]"
                >
                  <Card className="h-full transition-shadow hover:shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="line-clamp-2 min-h-[2.5rem] text-lg">
                          {runbook.title || "Untitled Runbook"}
                        </CardTitle>
                        <Badge
                          variant={getPermissionBadgeVariant(
                            runbook.myPermission
                          )}
                          className="shrink-0"
                        >
                          {runbook.myPermission.toLowerCase()}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="space-y-3 text-sm text-gray-600">
                        {/* Owner */}
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 shrink-0" />
                          <span className="truncate">
                            {runbook.owner.givenName && runbook.owner.familyName
                              ? `${runbook.owner.givenName} ${runbook.owner.familyName}`
                              : "Unknown Owner"}
                          </span>
                        </div>

                        {/* Collaborators count */}
                        {runbook.collaborators.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 shrink-0" />
                            <span>
                              {runbook.collaborators.length}{" "}
                              {runbook.collaborators.length === 1
                                ? "collaborator"
                                : "collaborators"}
                            </span>
                          </div>
                        )}

                        {/* Last updated */}
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 shrink-0" />
                          <span>Updated {formatDate(runbook.updatedAt)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
