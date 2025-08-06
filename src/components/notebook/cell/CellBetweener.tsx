import { Button } from "@/components/ui/button";
import { CellReference } from "@/schema";
import { Plus } from "lucide-react";

export function CellBetweener({
  cell,
  onAddCell,
  position = "after",
}: {
  cell: CellReference;
  onAddCell: (
    cellId?: string,
    cellType?: "code" | "markdown" | "sql" | "ai",
    position?: "before" | "after"
  ) => void;
  position: "before" | "after";
}) {
  return (
    <div className="group relative flex h-6 w-full items-center justify-center">
      <div className="absolute -left-[13px] z-10 flex h-px w-full items-center bg-transparent has-hover:bg-neutral-500">
        <Button
          variant="ghost"
          size="xs"
          className="bg-background text-gray-300 hover:bg-black hover:text-white"
          onClick={() =>
            onAddCell(
              cell.id,
              cell.cellType === "raw" ? "code" : cell.cellType,
              position
            )
          }
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}
