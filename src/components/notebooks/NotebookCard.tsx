import { Clock, User, Users } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { getNotebookVanityUrl } from "../../util/url-utils";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { NotebookActions } from "./NotebookActions";
import type { NotebookProcessed } from "./types";

interface NotebookCardProps {
  notebook: NotebookProcessed;
  onUpdate?: () => void;
}

export const NotebookCard: React.FC<NotebookCardProps> = ({
  notebook,
  onUpdate,
}) => {
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
    <Link
      to={getNotebookVanityUrl(notebook.id, notebook.title)}
      className="block transition-transform hover:scale-[1.02]"
    >
      <Card className="h-full transition-shadow hover:shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2 overflow-hidden">
            <CardTitle className="line-clamp-2 min-h-[2.5rem] text-lg">
              {notebook.title || "Untitled Notebook"}
            </CardTitle>
            <div className="flex shrink-0 items-center gap-1">
              <Badge
                variant={getPermissionBadgeVariant(
                  notebook.myPermission || "NONE"
                )}
                className="shrink-0"
              >
                {(notebook.myPermission || "NONE").toLowerCase()}
              </Badge>
              <NotebookActions notebook={notebook} onUpdate={onUpdate} />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-3 text-sm text-gray-600">
            {/* Owner */}
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {notebook.owner?.givenName && notebook.owner?.familyName
                  ? `${notebook.owner.givenName} ${notebook.owner.familyName}`
                  : "Unknown Owner"}
              </span>
            </div>

            {/* Collaborators count */}
            {notebook.collaborators && notebook.collaborators.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 shrink-0" />
                <span>
                  {notebook.collaborators.length}{" "}
                  {notebook.collaborators.length === 1
                    ? "collaborator"
                    : "collaborators"}
                </span>
              </div>
            )}

            {/* Last updated */}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" />
              <span>Updated {formatDate(notebook.updated_at)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
