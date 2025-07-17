import { Button } from "@/components/ui/button";
import { CellData } from "@runt/schema";
import { Plus } from "lucide-react";

export function CellBetweener({
  cell,
  onAddCell,
}: {
  cell: CellData;
  onAddCell: (
    cellId?: string,
    cellType?: string,
    position?: "before" | "after"
  ) => void;
}) {
  return (
    <div className="flex h-4 w-full items-center justify-center bg-red-500">
      <Button
        variant="outline"
        size="icon"
        onClick={() =>
          onAddCell(
            cell.id,
            cell.cellType === "raw" ? "code" : cell.cellType,
            "before"
          )
        }
      >
        <Plus />
      </Button>
    </div>
  );
}
