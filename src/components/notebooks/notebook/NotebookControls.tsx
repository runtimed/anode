import { useTrpc } from "@/components/TrpcProvider";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDuplicateNotebook } from "@/hooks/useDuplicateNotebook";
import { useMutation } from "@tanstack/react-query";
import { CopyPlus, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { NotebookProcessed } from "../types";
import { useNavigate } from "react-router-dom";

export function NotebookControls({
  notebook,
}: {
  notebook: NotebookProcessed;
}) {
  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DuplicateAction notebook={notebook} />
          <DeleteAction notebook={notebook} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function DuplicateAction({ notebook }: { notebook: NotebookProcessed }) {
  const { duplicateNotebook, isDuplicating } = useDuplicateNotebook();
  const { confirm } = useConfirm();

  const handleDuplicateNotebook = async () => {
    confirm({
      title: "Duplicate Notebook",
      description: `Please confirm that you want to duplicate "${notebook.title || "Untitled Notebook"}".`,
      onConfirm: handleDuplicateNotebookConfirm,
      nonDestructive: true,
    });
  };

  const handleDuplicateNotebookConfirm = async () => {
    try {
      await duplicateNotebook(notebook.title || "Untitled Notebook");
    } catch (error) {
      toast.error("Failed to duplicate notebook");
    }
  };

  return (
    <DropdownMenuItem
      onSelect={handleDuplicateNotebook}
      disabled={isDuplicating}
    >
      <CopyPlus />
      {isDuplicating ? "Duplicating..." : "Duplicate Notebook"}
    </DropdownMenuItem>
  );
}

function DeleteAction({ notebook }: { notebook: NotebookProcessed }) {
  const trpc = useTrpc();
  const { confirm } = useConfirm();

  const navigate = useNavigate();

  // Delete notebook mutation
  const deleteNotebookMutation = useMutation(
    trpc.deleteNotebook.mutationOptions()
  );

  const handleDeleteNotebook = async () => {
    confirm({
      title: "Delete Notebook",
      description: `Please confirm that you want to delete "${notebook.title || "Untitled Notebook"}".`,
      onConfirm: handleDeleteConfirm,
    });
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteNotebookMutation.mutateAsync({
        nbId: notebook.id,
      });

      toast.success("Notebook deleted successfully");
      navigate("/nb");

      // Call onUpdate to refresh the notebook list
      // onUpdate?.();
    } catch (error) {
      console.error("Failed to delete notebook:", error);
      toast.error("Failed to delete notebook");
    }
  };

  return (
    <DropdownMenuItem variant="destructive" onSelect={handleDeleteNotebook}>
      <Trash2 />
      Delete Notebook
    </DropdownMenuItem>
  );
}
