import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bot, Code, Database, FileText } from "lucide-react";
import { CellTypeNoRaw, tables } from "@runtimed/schema";

interface CellTypeSelectorProps {
  cell: typeof tables.cells.Type;
  onCellTypeChange: (newType: CellTypeNoRaw) => void;
}

export const CellTypeSelector: React.FC<CellTypeSelectorProps> = ({
  cell,
  onCellTypeChange,
}) => {
  const getCellTypeIcon = () => {
    switch (cell.cellType) {
      case "code":
        return <Code className="h-3 w-3" />;
      case "markdown":
        return <FileText className="h-3 w-3" />;
      case "sql":
        return <Database className="h-3 w-3" />;
      case "ai":
        return <Bot className="h-3 w-3" />;
      default:
        return <Code className="h-3 w-3" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 gap-1.5 px-2 text-xs font-medium sm:h-6 ${
            cell.cellType === "sql"
              ? "hover:bg-muted/50 border border-blue-200 bg-blue-50 text-blue-700"
              : cell.cellType === "ai"
                ? "hover:bg-muted/50 border border-purple-200 bg-purple-50 text-purple-700"
                : "hover:bg-muted/50"
          }`}
        >
          {getCellTypeIcon()}
          <span className="cell-type-label hidden capitalize sm:inline">
            {cell.cellType}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        <DropdownMenuItem
          onClick={() => onCellTypeChange("code")}
          className="gap-2"
        >
          <Code className="h-4 w-4" />
          Code
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onCellTypeChange("markdown")}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          Markdown
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onCellTypeChange("sql")}
          className="gap-2"
        >
          <Database className="h-4 w-4" />
          SQL Query
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onCellTypeChange("ai")}
          className="gap-2"
        >
          <Bot className="h-4 w-4" />
          AI Assistant
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
