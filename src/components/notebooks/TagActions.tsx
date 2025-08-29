import { trpcQueryClient } from "@/lib/trpc-client";

import { useMutation } from "@tanstack/react-query";
import type { TagRow } from "backend/trpc/types";
import { MoreHorizontal, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { useTrpc } from "../TrpcProvider";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export const TagActions = ({ tag }: { tag: TagRow }) => {
  const trpc = useTrpc();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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

      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete tag:", error);
      // TODO: Show error toast
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={handleDeleteClick}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
