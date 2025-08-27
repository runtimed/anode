import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  Clock,
  User,
  Share2,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { SharingModal } from "./SharingModal";
import type { NotebookProcessed } from "./types";
import { useTrpc } from "../TrpcProvider";
import { useMutation } from "@tanstack/react-query";

interface NotebookCardProps {
  notebook: NotebookProcessed;
  onUpdate?: () => void;
}

export const NotebookCard: React.FC<NotebookCardProps> = ({
  notebook,
  onUpdate,
}) => {
  const [isSharingModalOpen, setIsSharingModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const trpc = useTrpc();

  // Delete notebook mutation
  const deleteNotebookMutation = useMutation(
    trpc.deleteNotebook.mutationOptions()
  );
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
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteNotebookMutation.mutateAsync({
        nbId: notebook.id,
      });

      // Call onUpdate to refresh the notebook list
      onUpdate?.();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete notebook:", error);
      // TODO: Show error toast
    }
  };

  return (
    <>
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
                      {canEdit && (
                        <DropdownMenuItem
                          onClick={handleDeleteClick}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Notebook</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "
              {notebook.title || "Untitled Notebook"}"? This action cannot be
              undone and will permanently remove the notebook and all its
              contents.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={deleteNotebookMutation.isPending}
            >
              {deleteNotebookMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
