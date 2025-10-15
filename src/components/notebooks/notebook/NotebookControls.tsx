import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileDown, MoreHorizontal, CopyPlus } from "lucide-react";
import { useNotebookExport } from "@/hooks/useNotebookExport";
import { useDuplicateNotebook } from "@/hooks/useDuplicateNotebook";
import { useConfirm } from "@/components/ui/confirm";
import { toast } from "sonner";
import type { NotebookProcessed } from "../types";

export function NotebookControls({
  notebook,
}: {
  notebook: NotebookProcessed;
}) {
  const { exportToJupyter } = useNotebookExport();
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
          <DropdownMenuItem onSelect={exportToJupyter}>
            <FileDown className="mr-2 h-4 w-4" />
            Download as .ipynb
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
