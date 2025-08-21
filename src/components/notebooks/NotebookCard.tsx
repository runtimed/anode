import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Users, Clock, User, Share2, MoreHorizontal } from "lucide-react";
import { getNotebookVanityUrl } from "../../util/url-utils";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { SharingModal } from "./SharingModal";

interface NotebookCardProps {
  notebook: any;
  onUpdate?: () => void;
}

export const NotebookCard: React.FC<NotebookCardProps> = ({
  notebook,
  onUpdate,
}) => {
  const [isSharingModalOpen, setIsSharingModalOpen] = useState(false);
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

  const canEdit = notebook.myPermission === "OWNER";

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSharingModalOpen(true);
  };

  return (
    <>
      <Link
        to={getNotebookVanityUrl(notebook.id, notebook.title)}
        className="block transition-transform hover:scale-[1.02]"
      >
        <Card className="h-full transition-shadow hover:shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="line-clamp-2 min-h-[2.5rem] text-lg">
                {notebook.title || "Untitled Notebook"}
              </CardTitle>
              <div className="flex shrink-0 items-center gap-1">
                <Badge
                  variant={getPermissionBadgeVariant(notebook.myPermission)}
                  className="shrink-0"
                >
                  {notebook.myPermission.toLowerCase()}
                </Badge>
                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleShare}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
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

      {/* Sharing Modal */}
      <SharingModal
        notebook={notebook}
        isOpen={isSharingModalOpen}
        onClose={() => setIsSharingModalOpen(false)}
        onUpdate={() => onUpdate?.()}
      />
    </>
  );
};
