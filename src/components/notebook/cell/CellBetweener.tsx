import { Button } from "@/components/ui/button";
import { CellReference } from "@runtimed/schema";
import { Plus } from "lucide-react";
import { useAddCell } from "@/hooks/useAddCell.js";
import { memo } from "react";
import { useDragDropCellSort } from "@/hooks/useDragDropCellSort";

export const CellBetweener = memo(function CellBetweener({
  cell,
  position = "after",
}: {
  cell: CellReference;
  position: "before" | "after";
}) {
  const { addCell } = useAddCell();
  const { draggingOverCell, draggingOverPosition, setDraggingCell, onDrop } =
    useDragDropCellSort();

  if (draggingOverCell === cell.id && draggingOverPosition === position) {
    return (
      <div className="group relative flex h-6 w-full items-center justify-center">
        <div className="h-1 w-full bg-blue-500" />
      </div>
    );
  }

  return (
    <div
      className="group relative flex h-6 w-full items-center justify-center"
      onDragOver={() => setDraggingCell(cell.id, position)}
      onDrop={() => onDrop(cell.id, position)}
    >
      <div className="absolute -left-[13px] z-10 flex h-px w-full items-center bg-transparent has-hover:bg-neutral-500">
        <Button
          variant="ghost"
          size="xs"
          className="bg-background text-gray-300 hover:bg-black hover:text-white"
          onClick={() =>
            addCell(
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
});
