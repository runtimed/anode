import { CellType } from "@runtimed/schema";
import { SupportedLanguage } from "@/types/misc.js";

export function languageFromCellType(cellType: CellType): SupportedLanguage {
  if (cellType === "code") {
    // TODO: Pull from runtime agent session and/or notebook
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

export function placeholderFromCellType(cellType: CellType) {
  if (cellType === "code") {
    return "Enter your code here...";
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
