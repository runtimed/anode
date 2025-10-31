import { CellType, CellTypeNoRaw } from "@runtimed/schema";

/**
 * Cycle through the cell types in order. Returns the next cell type.
 */
export function cycleCellType(cellType: CellType, enableSqlCells: boolean) {
  if (cellType === "raw") {
    return "code";
  }
  const cellTypeOrder: readonly CellTypeNoRaw[] = enableSqlCells
    ? ["code", "markdown", "sql", "ai"]
    : ["code", "markdown", "ai"];

  const currentIndex = cellTypeOrder.indexOf(cellType);
  const nextIndex = (currentIndex + 1) % cellTypeOrder.length;
  const nextCellType = cellTypeOrder[nextIndex];
  return nextCellType;
}
