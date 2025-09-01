import React from "react";
import { Badge } from "../ui/badge";
import { DateDisplay } from "../ui/DateDisplay";
import { getNotebookVanityUrl } from "../../util/url-utils";
import { NotebookActions } from "./NotebookActions";
import { TagBadge } from "./TagBadge";
import type { NotebookProcessed } from "./types";

// Grid/Table component for notebooks
interface NotebookGridProps {
  notebooks: NotebookProcessed[];
  viewMode: "grid" | "table";
  onUpdate?: () => void;
}

export const NotebookGrid: React.FC<NotebookGridProps> = ({
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

// Import NotebookCard here since it's used in the grid view
// This assumes NotebookCard is already defined elsewhere
import { NotebookCard } from "./NotebookCard";
