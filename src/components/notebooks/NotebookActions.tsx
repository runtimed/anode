import { useMutation } from "@tanstack/react-query";
import { MoreHorizontal, Share2, Trash2, Tag } from "lucide-react";
import React, { useState } from "react";
import { useTrpc } from "../TrpcProvider";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useConfirm } from "../ui/confirm";
import { SharingModal } from "./SharingModal";
import { TagSelectionDialog } from "./TagSelectionDialog";
import type { NotebookProcessed } from "./types";

interface NotebookActionsProps {
  notebook: NotebookProcessed;
  onUpdate?: () => void;
  className?: string;
}

export const NotebookActions: React.FC<NotebookActionsProps> = ({
  notebook,
  onUpdate,
  className = "",
}) => {
  const [isSharingModalOpen, setIsSharingModalOpen] = useState(false);
  const [isTagSelectionOpen, setIsTagSelectionOpen] = useState(false);
  const trpc = useTrpc();
  const { confirm } = useConfirm();

  // Delete notebook mutation
  const deleteNotebookMutation = useMutation(
    trpc.deleteNotebook.mutationOptions()
  );

  const canEdit =
    notebook.myPermission === "OWNER" || notebook.myPermission === "WRITER";

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSharingModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    confirm({
      title: "Delete Notebook",
      description: `Are you sure you want to delete "${notebook.title || "Untitled Notebook"}"? This action cannot be undone and will permanently remove the notebook and all its contents.`,
      onConfirm: handleDeleteConfirm,
      actionButtonText: "Delete",
    });
  };

  const handleTagSelectionClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTagSelectionOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteNotebookMutation.mutateAsync({
        nbId: notebook.id,
      });

      // Call onUpdate to refresh the notebook list
      onUpdate?.();
    } catch (error) {
      console.error("Failed to delete notebook:", error);
      // TODO: Show error toast
    }
  };

  if (!canEdit) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${className}`}
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
          <DropdownMenuItem onClick={handleTagSelectionClick}>
            <Tag className="mr-2 h-4 w-4" />
            Manage Tags
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDeleteClick}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sharing Modal */}
      <SharingModal
        notebook={notebook}
        isOpen={isSharingModalOpen}
        onClose={() => setIsSharingModalOpen(false)}
        onUpdate={onUpdate}
      />

      {/* Tag Selection Dialog */}
      <TagSelectionDialog
        notebookId={notebook.id}
        isOpen={isTagSelectionOpen}
        onClose={() => setIsTagSelectionOpen(false)}
        onUpdate={onUpdate}
      />
    </>
  );
};
