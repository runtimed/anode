import { useTrpc } from "@/components/TrpcProvider";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDuplicateNotebook } from "@/hooks/useDuplicateNotebook";
import { useNotebookExport } from "@/hooks/useNotebookExport";
import { useMutation } from "@tanstack/react-query";
import { CopyPlus, FileDown, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCreateNotebookAndNavigate } from "../dashboard/helpers";
import type { NotebookProcessed } from "../types";
import { useFeatureFlag } from "@/contexts/FeatureFlagContext";

export function NotebookControls({
  notebook,
}: {
  notebook: NotebookProcessed;
}) {
  const exportEnabled = useFeatureFlag("ipynb-export");

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <CreateNotebookAction />
          <DuplicateAction notebook={notebook} />
          {exportEnabled && <ExportAction />}
          <DropdownMenuSeparator />
          <DeleteAction notebook={notebook} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function CreateNotebookAction() {
  const createNotebookAndNavigate = useCreateNotebookAndNavigate();

  return (
    <DropdownMenuItem onSelect={createNotebookAndNavigate}>
      <Plus />
      Create New Notebook
    </DropdownMenuItem>
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

function ExportAction() {
  const { exportToJupyter } = useNotebookExport();

  return (
    <DropdownMenuItem onSelect={exportToJupyter}>
      <FileDown />
      Download as .ipynb
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
