import React, { useState, useEffect } from "react";
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
import { Plus, Edit3, Check, X, Undo, Trash2 } from "lucide-react";

// Curated color palette for new tags
const TAG_COLOR_PALETTE: TagColor[] = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#6366f1", // indigo
  "#84cc16", // lime
];

const getRandomTagColor = (): TagColor => {
  return TAG_COLOR_PALETTE[
    Math.floor(Math.random() * TAG_COLOR_PALETTE.length)
  ];
};

export const MetadataPanel: React.FC<SidebarPanelProps> = ({
  notebook,
  onUpdate,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [editingTagColor, setEditingTagColor] = useState<TagColor>("#000000");
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [previewColor, setPreviewColor] = useState<TagColor>("#3b82f6");

  const trpc = useTrpc();

  // Update preview color when search term changes
  useEffect(() => {
    if (searchTerm) {
      setPreviewColor(getRandomTagColor());
    }
  }, [searchTerm]);

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
        color: previewColor,
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
                        <Undo className="h-3 w-3" />
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

        {/* Preview and quick colors for new tag */}
        {searchTerm && !exactMatch && (
          <div className="mb-3 space-y-2 rounded-lg border bg-gray-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700">
                Preview:
              </span>
              <TagBadge
                tag={{
                  id: "preview",
                  name: searchTerm,
                  color: previewColor,
                }}
                className="text-xs"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {TAG_COLOR_PALETTE.slice(0, 8).map((color) => (
                <button
                  key={color}
                  onClick={() => setPreviewColor(color)}
                  className={`h-6 w-6 rounded border-2 ${
                    previewColor === color
                      ? "border-gray-400"
                      : "border-gray-200"
                  }`}
                  style={{ backgroundColor: color }}
                  title={`Use ${color}`}
                />
              ))}
            </div>
          </div>
        )}

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
