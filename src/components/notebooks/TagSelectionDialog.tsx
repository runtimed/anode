import { getTagColorClasses, getTagDotColorClass } from "@/lib/tag-colors";
import { trpcQueryClient } from "@/lib/trpc-client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Tag } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useTrpc } from "../TrpcProvider";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";

interface TagSelectionDialogProps {
  notebookId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export const TagSelectionDialog: React.FC<TagSelectionDialogProps> = ({
  notebookId,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const trpc = useTrpc();

  // Fetch all available tags
  const { data: allTags = [], isLoading: isLoadingTags } = useQuery(
    trpc.tags.queryOptions()
  );

  // Fetch current notebook tags
  const { data: notebookTags = [], isLoading: isLoadingNotebookTags } =
    useQuery(trpc.notebookTags.queryOptions({ nbId: notebookId }));

  // Mutations for adding/removing tags
  const assignTagMutation = useMutation(
    trpc.assignTagToNotebook.mutationOptions()
  );
  const removeTagMutation = useMutation(
    trpc.removeTagFromNotebook.mutationOptions()
  );

  // Initialize selected tags when dialog opens
  useEffect(() => {
    if (isOpen && notebookTags) {
      setSelectedTagIds(new Set(notebookTags.map((tag) => tag.id)));
    }
  }, [isOpen, notebookTags]);

  // Filter tags based on search term
  const filteredTags = allTags.filter((tag) =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
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

      // Invalidate queries to refresh the UI
      trpcQueryClient.invalidateQueries({
        queryKey: trpc.notebookTags.queryKey({ nbId: notebookId }),
      });
      trpcQueryClient.invalidateQueries({
        queryKey: trpc.notebooks.queryKey(),
      });

      onUpdate?.();
    } catch (error) {
      console.error("Failed to update tag assignment:", error);
      // TODO: Show error toast
    }
  };

  const handleSave = () => {
    onClose();
  };

  const isLoading =
    isLoadingTags ||
    isLoadingNotebookTags ||
    assignTagMutation.isPending ||
    removeTagMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Manage Tags
          </DialogTitle>
          <DialogDescription>
            Select tags to organize your notebook. You can choose multiple tags.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search input */}
          <div className="relative">
            <Input
              placeholder="Search tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-8"
            />
          </div>

          {/* Tags list */}
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {isLoading ? (
              <div className="text-center text-sm text-gray-500">
                Loading tags...
              </div>
            ) : filteredTags.length === 0 ? (
              <div className="text-center text-sm text-gray-500">
                {searchTerm
                  ? "No tags found matching your search."
                  : "No tags available."}
              </div>
            ) : (
              filteredTags.map((tag) => {
                const isSelected = selectedTagIds.has(tag.id);
                return (
                  <div
                    key={tag.id}
                    className={`flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-gray-50 ${
                      isSelected
                        ? "border-blue-300 bg-blue-50"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-3 w-3 rounded-full ${getTagDotColorClass(tag.color)}`}
                      />
                      <Badge
                        variant="outline"
                        className={`px-2 py-0.5 text-xs ${getTagColorClasses(tag.color)}`}
                      >
                        {tag.name}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTagToggle(tag.id)}
                      disabled={isLoading}
                      className={`h-8 w-8 p-0 ${
                        isSelected ? "text-blue-600" : "text-gray-400"
                      }`}
                    >
                      <Check
                        className={`h-4 w-4 ${isSelected ? "opacity-100" : "opacity-0"}`}
                      />
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
