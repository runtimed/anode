import { cn } from "@/lib/utils";
import { useAddCell } from "@/hooks/useAddCell.js";
import {
  CodeCellButton,
  MarkdownCellButton,
  SqlCellButton,
  AiCellButton,
} from "./CellTypeButtons";
import { toast } from "sonner";
import { useHideAiCells } from "@/hooks/useHideAiCells";

export function CellAdder({
  position,
  className,
}: {
  position: "before" | "after";
  className?: string;
}) {
  const { addCell } = useAddCell();
  const { hideAiCells } = useHideAiCells();
  return (
    <div className={cn("flex justify-center gap-2", className)}>
      <CodeCellButton
        size="sm"
        showPlus={true}
        onClick={() => addCell(undefined, "code", position)}
      />
      <MarkdownCellButton
        size="sm"
        showPlus={true}
        onClick={() => addCell(undefined, "markdown", position)}
      />
      <SqlCellButton
        size="sm"
        showPlus={true}
        onClick={() => addCell(undefined, "sql", position)}
      />
      <AiCellButton
        size="sm"
        showPlus={true}
        onClick={() => {
          if (hideAiCells) {
            toast.success("AI cells are hidden");
          } else {
            addCell(undefined, "ai", position);
          }
        }}
      />
    </div>
  );
}
