import type { NotebookProcessed } from "@/components/notebooks/types";
import React from "react";
import { NotebookCard } from "./NotebookCard";
import { NotebookTableRow } from "./NotebookTableRow";

// Grid/Table component for notebooks
interface NotebooksCardOrTableProps {
  notebooks: NotebookProcessed[];
  viewMode: "grid" | "table";
  onUpdate?: () => void;
}

export const NotebooksCardOrTable: React.FC<NotebooksCardOrTableProps> = ({
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
