import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bot, Code, Database, FileText } from "lucide-react";

interface AiCellTypeSelectorProps {
  onCellTypeChange: (newType: "code" | "markdown" | "sql" | "ai") => void;
}

export const AiCellTypeSelector: React.FC<AiCellTypeSelectorProps> = ({
  onCellTypeChange,
}) => {
  const getCellTypeIcon = () => {
    return <Bot className="h-3 w-3" />;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-muted/50 h-7 gap-1.5 border border-purple-200 bg-purple-50 px-2 text-xs font-medium text-purple-700 sm:h-6"
        >
          {getCellTypeIcon()}
          <span className="cell-type-label hidden sm:inline">AI</span>
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
