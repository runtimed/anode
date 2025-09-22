import { CellType } from "@runtimed/schema";
import { SupportedLanguage } from "@/types/misc.js";

export function languageFromCellType(
  cellType: CellType,
  runtimeType?: string
): SupportedLanguage {
  if (cellType === "code") {
    // Use runtime type to determine language for code cells
    if (runtimeType === "html") {
      return "html";
    }
    // Default to python for other runtime types
    return "python";
  } else if (cellType === "markdown") {
    return "markdown";
  } else if (cellType === "ai") {
    return "markdown";
  } else if (cellType === "sql") {
    return "sql";
  }
  return undefined;
}

export function placeholderFromCellType(
  cellType: CellType,
  runtimeType?: string
) {
  if (cellType === "code") {
    return runtimeType === "html"
      ? "Enter your HTML here..."
      : "Enter your Python code here...";
  } else if (cellType === "markdown") {
    return "Enter markdown...";
  } else if (cellType === "ai") {
    return "Ask me anything about your notebook, data, or analysis...";
  } else if (cellType === "sql") {
    return "Write SQL query...";
  }
  return "Enter raw text...";
}

export function shouldEnableLineWrapping(cellType: CellType) {
  return cellType === "markdown" || cellType === "ai";
}
