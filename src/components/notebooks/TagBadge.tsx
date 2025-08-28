import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { getTagColorClasses } from "@/lib/tag-colors";
import { useTrpc } from "../TrpcProvider";
import { trpcQueryClient } from "@/lib/trpc-client";
import type { TagColor } from "backend/trpc/types";

interface TagBadgeProps {
  tag: { id: string; name: string; color: TagColor };
  onDelete?: (tagId: string) => void;
  showDelete?: boolean;
  className?: string;
}

export const TagBadge: React.FC<TagBadgeProps> = ({
  tag,
  onDelete,
  showDelete = false,
  className = "",
}) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const trpc = useTrpc();
  const deleteTagMutation = useMutation(trpc.deleteTag.mutationOptions());

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteTagMutation.mutateAsync({ id: tag.id });

      // Invalidate queries to refresh the UI
      trpcQueryClient.invalidateQueries({
        queryKey: trpc.tags.queryKey(),
      });
      trpcQueryClient.invalidateQueries({
        queryKey: trpc.notebooks.queryKey(),
      });

      onDelete?.(tag.id);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete tag:", error);
      // TODO: Show error toast
    }
  };

  return (
    <>
      <Badge
        variant="outline"
        className={`px-2 py-0.5 text-xs ${getTagColorClasses(tag.color)} ${className}`}
        data-tag-id={tag.id}
      >
        {tag.name}
        {showDelete && (
          <button
            onClick={handleDeleteClick}
            className="ml-1 transition-colors hover:text-red-600"
            title="Delete tag"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </Badge>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tag</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the tag "{tag.name}"? This action
              cannot be undone and will remove this tag from all notebooks.
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
              disabled={deleteTagMutation.isPending}
            >
              {deleteTagMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
