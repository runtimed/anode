import { NotebookActions } from "@/components/notebooks/NotebookActions";
import { TagBadge } from "@/components/notebooks/TagBadge";
import type { NotebookProcessed } from "@/components/notebooks/types";
import { Badge } from "@/components/ui/badge";
import { DateDisplay } from "@/components/ui/DateDisplay";
import { getNotebookVanityUrl } from "@/util/url-utils";
import React from "react";

// Table row component
interface NotebookTableRowProps {
  notebook: NotebookProcessed;
  onUpdate?: () => void;
}

export const NotebookTableRow: React.FC<NotebookTableRowProps> = ({
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
