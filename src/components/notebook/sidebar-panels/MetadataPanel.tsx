import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTrpc } from "@/components/TrpcProvider";
import { trpcQueryClient } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagBadge } from "@/components/notebooks/TagBadge";
import { TagColorPicker } from "@/components/notebooks/TagColorPicker";
import type { TagColor } from "backend/trpc/types";
import type { Tag } from "@/components/notebooks/types";
import type { SidebarPanelProps } from "./types";

// Icons
import { Plus, Edit3, Check, X, Trash2 } from "lucide-react";

export const MetadataPanel: React.FC<SidebarPanelProps> = ({
  notebook,
  onUpdate,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [editingTagColor, setEditingTagColor] = useState<TagColor>("#000000");
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  const trpc = useTrpc();

  // Fetch all available tags
  const { data: allTags = [] } = useQuery(trpc.tags.queryOptions());

  // Mutations
  const assignTagMutation = useMutation(
    trpc.assignTagToNotebook.mutationOptions()
  );
  const removeTagMutation = useMutation(
    trpc.removeTagFromNotebook.mutationOptions()
  );
  const createTagMutation = useMutation(trpc.createTag.mutationOptions());
  const updateTagMutation = useMutation(trpc.updateTag.mutationOptions());
  const deleteTagMutation = useMutation(trpc.deleteTag.mutationOptions());

  const currentTagIds = new Set(notebook.tags?.map((t) => t.id) || []);

  const filteredAvailableTags = allTags.filter(
    (tag) =>
      !currentTagIds.has(tag.id) &&
      tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exactMatch = allTags.find(
    (tag) => tag.name.toLowerCase() === searchTerm.toLowerCase()
  );

  const refreshQueries = async () => {
    await Promise.all([
      trpcQueryClient.invalidateQueries({
        queryKey: trpc.notebooks.queryKey(),
      }),
      trpcQueryClient.invalidateQueries({ queryKey: trpc.tags.queryKey() }),
    ]);
    onUpdate();
  };

  const handleAddTag = async (tagId: string) => {
    try {
      await assignTagMutation.mutateAsync({ nbId: notebook.id, tagId });
      await refreshQueries();
    } catch (error) {
      console.error("Failed to add tag:", error);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await removeTagMutation.mutateAsync({ nbId: notebook.id, tagId });
      await refreshQueries();
    } catch (error) {
      console.error("Failed to remove tag:", error);
    }
  };

  const handleCreateTag = async () => {
    if (!searchTerm.trim()) return;

    setIsCreatingTag(true);
    try {
      const newTag = await createTagMutation.mutateAsync({
        name: searchTerm.trim(),
        color: "#3b82f6" as TagColor,
      });

      if (newTag) {
        await assignTagMutation.mutateAsync({
          nbId: notebook.id,
          tagId: newTag.id,
        });
        setSearchTerm("");
        await refreshQueries();
      }
    } catch (error) {
      console.error("Failed to create tag:", error);
    } finally {
      setIsCreatingTag(false);
    }
  };

  const startEditingTag = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditingTagName(tag.name);
    setEditingTagColor(tag.color);
  };

  const cancelEditingTag = () => {
    setEditingTagId(null);
    setEditingTagName("");
    setEditingTagColor("#000000");
  };

  const saveTagEdit = async () => {
    if (!editingTagId || !editingTagName.trim()) return;

    try {
      await updateTagMutation.mutateAsync({
        id: editingTagId,
        name: editingTagName.trim(),
        color: editingTagColor,
      });

      setEditingTagId(null);
      await refreshQueries();
    } catch (error) {
      console.error("Failed to update tag:", error);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this tag? It will be removed from all notebooks."
      )
    ) {
      return;
    }

    try {
      await deleteTagMutation.mutateAsync({ id: tagId });
      await refreshQueries();
    } catch (error) {
      console.error("Failed to delete tag:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Tags */}
      <div>
        <div className="mb-3 flex flex-wrap gap-2">
          {notebook.tags?.length ? (
            notebook.tags.map((tag) => (
              <div key={tag.id} className="group relative">
                {editingTagId === tag.id ? (
                  <div className="space-y-2 rounded-lg border bg-gray-50 p-2">
                    <Input
                      value={editingTagName}
                      onChange={(e) => setEditingTagName(e.target.value)}
                      className="h-7 text-xs"
                      placeholder="Tag name"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          saveTagEdit();
                        } else if (e.key === "Escape") {
                          cancelEditingTag();
                        }
                      }}
                      autoFocus
                    />
                    <TagColorPicker
                      tagName={editingTagName}
                      selectedColor={editingTagColor}
                      onColorChange={setEditingTagColor}
                    />
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={saveTagEdit}
                        disabled={!editingTagName.trim()}
                        className="h-6 px-2 text-xs"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEditingTag}
                        className="h-6 px-2 text-xs"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteTag(tag.id)}
                        className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEditingTag(tag)}
                      className="rounded transition-opacity hover:opacity-80"
                    >
                      <TagBadge tag={tag} />
                    </button>
                    <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditingTag(tag)}
                        className="h-5 w-5 p-0 text-gray-400 hover:text-gray-600"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveTag(tag.id)}
                        className="h-5 w-5 p-0 text-gray-400 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <span className="text-sm text-gray-500">No tags assigned</span>
          )}
        </div>
      </div>

      {/* Add Tags Section */}
      <div className="border-t pt-4">
        <h4 className="mb-3 text-sm font-medium text-gray-700">Add Tags</h4>

        <Input
          placeholder="Search or create tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-3"
          onKeyDown={(e) => {
            if (e.key === "Enter" && searchTerm && !exactMatch) {
              handleCreateTag();
            }
          }}
        />

        <div className="max-h-48 space-y-1 overflow-y-auto">
          {/* Create new tag option */}
          {searchTerm && !exactMatch && (
            <button
              onClick={handleCreateTag}
              disabled={isCreatingTag}
              className="flex w-full items-center gap-2 rounded p-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              <Plus className="h-4 w-4 text-gray-500" />
              <span>Create "{searchTerm}"</span>
            </button>
          )}

          {/* Available tags */}
          {filteredAvailableTags.slice(0, 10).map((tag) => (
            <button
              key={tag.id}
              onClick={() => handleAddTag(tag.id)}
              className="flex w-full items-center gap-2 rounded p-2 text-left text-sm hover:bg-gray-50"
            >
              <TagBadge tag={tag} className="text-xs" />
            </button>
          ))}

          {filteredAvailableTags.length === 0 && !searchTerm && (
            <div className="py-2 text-center text-sm text-gray-500">
              All available tags are already assigned
            </div>
          )}

          {filteredAvailableTags.length === 0 && searchTerm && exactMatch && (
            <div className="py-2 text-center text-sm text-gray-500">
              Tag already exists
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
