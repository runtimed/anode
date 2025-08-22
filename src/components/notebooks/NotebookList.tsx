import React from "react";
import { trpc, trpcQueryClient } from "../../lib/trpc-client";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { NotebookCard } from "./NotebookCard";
import { LoadingState } from "../loading/LoadingState";

export const NotebookList: React.FC = () => {
  // Query all notebooks using tRPC
  const {
    data: notebooksData,
    isLoading,
    error,
    refetch,
  } = useQuery(trpc.notebooks.queryOptions({}));

  // Get user data
  const { data: userData } = useQuery(trpc.me.queryOptions());

  const notebooks = React.useMemo(() => {
    if (!notebooksData) return [];

    // Add permission information to each notebook
    return notebooksData.map(
      (notebook) =>
        ({
          ...notebook,
          myPermission: notebook.owner_id === userData?.id ? "OWNER" : "WRITER",
          owner: { id: notebook.owner_id, givenName: "", familyName: "" }, // Placeholder
          collaborators: [], // Placeholder
        }) as const
    );
  }, [notebooksData, userData?.id]);

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

  if (isLoading) {
    return <LoadingState message="Loading notebooks..." />;
  }

  if (notebooks.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 text-gray-400">
          <svg
            className="mx-auto h-16 w-16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-medium text-gray-900">
          No notebooks yet
        </h3>
        <p className="text-gray-600">
          Create your first notebook to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {notebooks.map((notebook) => (
        <NotebookCard
          key={notebook.id}
          notebook={notebook}
          onUpdate={() => refetch()}
        />
      ))}
    </div>
  );
};
