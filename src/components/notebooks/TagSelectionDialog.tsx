import { trpcQueryClient } from "@/lib/trpc-client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Tag, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useTrpc } from "../TrpcProvider";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { TagBadge } from "./TagBadge";
import { TagEditDialog } from "./TagEditDialog";
import type { TagColor } from "backend/trpc/types";

interface TagSelectionDialogProps {
  notebookId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const DEFAULT_COLOR: TagColor = "#000000";

export const TagSelectionDialog: React.FC<TagSelectionDialogProps> = ({
  notebookId,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const trpc = useTrpc();

  // Fetch all available tags
  const { data: allTags = [], isLoading: isLoadingTags } = useQuery(
    trpc.tags.queryOptions()
  );

  // Fetch current notebook tags
  const { data: notebookTags = [], isLoading: isLoadingNotebookTags } =
    useQuery(trpc.notebookTags.queryOptions({ nbId: notebookId }));

  // Mutations
  const assignTagMutation = useMutation(
    trpc.assignTagToNotebook.mutationOptions()
  );
  const removeTagMutation = useMutation(
    trpc.removeTagFromNotebook.mutationOptions()
  );
  const createTagMutation = useMutation(trpc.createTag.mutationOptions());

  // Initialize selected tags when dialog opens
  useEffect(() => {
    if (isOpen && notebookTags) {
      setSelectedTagIds(new Set(notebookTags.map((tag) => tag.id)));
    }
  }, [isOpen, notebookTags]);

  // Filter tags based on search term
  const filteredTags = useMemo(() => {
    if (!searchTerm) return allTags;
    return allTags.filter((tag) =>
      tag.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allTags, searchTerm]);

  // Check if search term matches any existing tag exactly
  const exactMatch = allTags.find(
    (tag) => tag.name.toLowerCase() === searchTerm.toLowerCase()
  );

  const handleTagToggle = async (tagId: string) => {
    const isCurrentlySelected = selectedTagIds.has(tagId);
    const newSelectedIds = new Set(selectedTagIds);

    try {
      if (isCurrentlySelected) {
        // Remove tag
        await removeTagMutation.mutateAsync({ nbId: notebookId, tagId });
        newSelectedIds.delete(tagId);
      } else {
        // Add tag
        await assignTagMutation.mutateAsync({ nbId: notebookId, tagId });
        newSelectedIds.add(tagId);
      }

      setSelectedTagIds(newSelectedIds);
      await refreshQueries();
    } catch (error) {
      console.error("Failed to update tag assignment:", error);
    }
  };

  const handleCreateNewTag = async () => {
    if (!searchTerm.trim()) return;

    try {
      const newTag = await createTagMutation.mutateAsync({
        name: searchTerm.trim(),
        color: DEFAULT_COLOR,
      });

      if (newTag) {
        // Immediately assign the new tag to the notebook
        await assignTagMutation.mutateAsync({
          nbId: notebookId,
          tagId: newTag.id,
        });

        setSelectedTagIds((prev) => new Set([...prev, newTag.id]));
        setSearchTerm("");
        await refreshQueries();
      }
    } catch (error) {
      console.error("Failed to create tag:", error);
    }
  };

  const refreshQueries = async () => {
    trpcQueryClient.invalidateQueries({
      queryKey: trpc.notebookTags.queryKey({ nbId: notebookId }),
    });
    trpcQueryClient.invalidateQueries({
      queryKey: trpc.notebooks.queryKey(),
    });
    trpcQueryClient.invalidateQueries({
      queryKey: trpc.tags.queryKey(),
    });
    onUpdate?.();
  };

  const handleRemoveTag = async (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await removeTagMutation.mutateAsync({ nbId: notebookId, tagId });
      const newSelectedIds = new Set(selectedTagIds);
      newSelectedIds.delete(tagId);
      setSelectedTagIds(newSelectedIds);
      await refreshQueries();
    } catch (error) {
      console.error("Failed to remove tag:", error);
    }
  };

  const isLoading = isLoadingTags || isLoadingNotebookTags;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Manage Tags
          </DialogTitle>
          <DialogDescription>
            Select tags to organize your notebooks. You can choose multiple
            tags.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current tags */}
          {selectedTagIds.size > 0 && (
            <div className="flex flex-wrap gap-1">
              {Array.from(selectedTagIds).map((tagId) => {
                const tag = allTags.find((t) => t.id === tagId);
                if (!tag) return null;
                return (
                  <div key={tag.id} className="flex items-center">
                    <button
                      onClick={() => setEditingTag(tag.id)}
                      className="rounded hover:opacity-80"
                    >
                      <TagBadge tag={tag} />
                    </button>
                    <button
                      onClick={(e) => handleRemoveTag(tag.id, e)}
                      className="ml-1 rounded-sm hover:bg-black/10"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Search input */}
          <Input
            placeholder="Search tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />

          {/* Tags list */}
          <div className="max-h-60 space-y-1 overflow-y-auto">
            {isLoading ? (
              <div className="py-4 text-center text-sm text-gray-500">
                Loading tags...
              </div>
            ) : (
              <>
                {/* Create new tag option */}
                {searchTerm && !exactMatch && (
                  <button
                    onClick={handleCreateNewTag}
                    disabled={createTagMutation.isPending}
                    className="flex w-full items-center gap-2 rounded p-2 text-left text-sm hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4 text-gray-500" />
                    <span>Create new tag "{searchTerm}"</span>
                  </button>
                )}

                {/* Existing tags */}
                {filteredTags.length === 0 && searchTerm && !exactMatch
                  ? null
                  : filteredTags.map((tag) => {
                      return (
                        <button
                          key={tag.id}
                          onClick={() => handleTagToggle(tag.id)}
                          disabled={isLoading}
                          className="flex w-full items-center gap-2 rounded p-2 text-left text-sm hover:bg-gray-50"
                        >
                          <TagBadge tag={tag} className="text-xs" />
                        </button>
                      );
                    })}

                {filteredTags.length === 0 && !searchTerm && (
                  <div className="py-4 text-center text-sm text-gray-500">
                    No tags found
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Tag Edit Dialog */}
      {editingTag && (
        <TagEditDialog
          tag={allTags.find((t) => t.id === editingTag)!}
          isOpen={true}
          onClose={() => setEditingTag(null)}
          onTagEdited={() => {
            refreshQueries();
            setEditingTag(null);
          }}
        />
      )}
    </Dialog>
  );
};
