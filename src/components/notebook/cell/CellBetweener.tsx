import { CellData } from "@runt/schema";
import { CellAdder } from "./CellAdder";

export function CellBetweener({
  cell,
  onAddCell,
}: {
  cell: CellData;
  onAddCell: (
    cellId?: string,
    cellType?: "code" | "markdown" | "sql" | "ai",
    position?: "before" | "after"
  ) => void;
}) {
  return (
    <div className="group relative flex h-4 w-full items-center justify-center">
      <div className="absolute left-0 hidden h-px w-full bg-gray-200 group-hover:block"></div>
      <div className="bg-background border-border z-10 hidden rounded-lg border p-3 shadow-lg group-hover:flex">
        <CellAdder
          onAddCell={(_cellId, cellType, position) =>
            onAddCell(cell.id, cellType, position)
          }
          position="before"
        />
      </div>
    </div>
  );
}
