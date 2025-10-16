import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDuplicateNotebook } from "@/hooks/useDuplicateNotebook";
import { CopyPlus, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { NotebookProcessed } from "../types";

export function NotebookControls({
  notebook,
}: {
  notebook: NotebookProcessed;
}) {
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
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={handleDuplicateNotebook}
            disabled={isDuplicating}
          >
            <CopyPlus className="mr-2 h-4 w-4" />
            {isDuplicating ? "Duplicating..." : "Duplicate Notebook"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
