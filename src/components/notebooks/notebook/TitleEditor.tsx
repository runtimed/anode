import { useTrpc } from "@/components/TrpcProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { Check, Edit2, X } from "lucide-react";
import { useRef, useState } from "react";
import { NotebookProcessed } from "../types";
import { useClickAway } from "react-use";

export function TitleEditor({
  notebook,
  onTitleSaved,
  canEdit,
}: {
  notebook: NotebookProcessed;
  onTitleSaved: () => void;
  canEdit: boolean;
}) {
  const trpc = useTrpc();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");

  const handleStartEditTitle = () => {
    setEditTitle(notebook?.title || "");
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!notebook || !editTitle.trim()) return;

    try {
      await updateNotebookMutation.mutateAsync({
        id: notebook.id,
        input: { title: editTitle.trim() },
      });
      setIsEditingTitle(false);
      onTitleSaved();
      // TODO: Show success toast
    } catch (err) {
      console.error("Failed to update notebook:", err);
      // TODO: Show error toast
    }
  };

  const handleCancelEdit = () => {
    setIsEditingTitle(false);
    setEditTitle("");
  };

  const ref = useRef(null);
  useClickAway(ref, handleCancelEdit);

  // Update notebook mutation
  const updateNotebookMutation = useMutation(
    trpc.updateNotebook.mutationOptions()
  );

  return (
    <div ref={ref} className="flex items-center gap-2">
      {isEditingTitle ? (
        <div className="flex items-center gap-1 sm:gap-2">
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="field-sizing-content max-w-[calc(100vw/2)] text-sm font-semibold sm:text-lg"
            placeholder="Notebook title..."
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveTitle();
              if (e.key === "Escape") handleCancelEdit();
            }}
            autoFocus
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSaveTitle}
            disabled={!editTitle.trim()}
            className="h-8 w-8 shrink-0 p-0"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancelEdit}
            className="h-8 w-8 shrink-0 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          className="group/nb-title flex min-w-0 items-center gap-1 rounded-sm hover:ring-1 hover:ring-gray-300 hover:ring-offset-2 sm:gap-2"
          onClick={handleStartEditTitle}
        >
          <h1 className="truncate text-sm font-semibold transition-shadow sm:text-lg md:text-xl">
            {notebook.title || "Untitled Notebook"}
          </h1>
          {canEdit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleStartEditTitle}
              className="size-0 shrink-0 p-0 text-gray-300 opacity-0 group-hover/nb-title:size-8 group-hover/nb-title:text-gray-600 group-hover/nb-title:opacity-100"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
