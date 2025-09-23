import React from "react";
import { Button } from "@/components/ui/button";
import { Code } from "lucide-react";
import { useAddCell } from "@/hooks/useAddCell.js";
import {
  MarkdownCellButton,
  SqlCellButton,
  AiCellButton,
} from "./cell/CellTypeButtons";
import { useHideAiCells } from "@/hooks/useHideAiCells";
import { toast } from "sonner";

export const EmptyStateCellAdder: React.FC = () => {
  const { addCell } = useAddCell();
  const { hideAiCells } = useHideAiCells();

  return (
    <div className="px-4 pt-6 pb-6 text-center sm:px-0 sm:pt-12">
      <div className="text-muted-foreground mb-6">
        Real-time collaborative computing. Pick a cell type to start
        experimenting.
      </div>
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        <Button
          size="lg"
          autoFocus
          onClick={() => addCell()}
          className="flex items-center gap-2"
        >
          <Code className="h-4 w-4" />
          Code Cell
        </Button>
        <MarkdownCellButton
          size="lg"
          label="Markdown"
          onClick={() => addCell(undefined, "markdown")}
          className="flex items-center gap-2"
        />
        <SqlCellButton
          size="lg"
          label="SQL Query"
          onClick={() => addCell(undefined, "sql")}
          className="flex items-center gap-2"
        />
        <AiCellButton
          size="lg"
          label="AI Assistant"
          onClick={() => {
            if (hideAiCells) {
              toast.success("AI cells are hidden");
            } else {
              addCell(undefined, "ai");
            }
          }}
          className="flex items-center gap-2"
        />
      </div>
      <div className="text-muted-foreground hidden text-xs sm:block">
        💡 Real-time collaborative computing. Pick a cell type to start
        experimenting.
      </div>
    </div>
  );
};
