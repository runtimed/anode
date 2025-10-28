import { CellType } from "@runtimed/schema";

/**
 * Cycle through the cell types in order. Returns the next cell type.
 */
export function cycleCellType(cellType: CellType) {
  if (cellType === "raw") {
    return "code";
  }
  const cellTypeOrder = ["code", "markdown", "sql", "ai"] as const;
  const currentIndex = cellTypeOrder.indexOf(cellType);
  const nextIndex = (currentIndex + 1) % cellTypeOrder.length;
  const nextCellType = cellTypeOrder[nextIndex];
  return nextCellType;
}
