import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Bot, Code, Database, FileText, Plus } from "lucide-react";

export function CellAdder({
  onAddCell,
  position,
  className,
}: {
  onAddCell: (
    cellId?: string,
    cellType?: "code" | "markdown" | "sql" | "ai",
    position?: "before" | "after"
  ) => void;
  position: "before" | "after";
  className?: string;
}) {
  return (
    <div className={cn("flex justify-center gap-2", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onAddCell(undefined, "code", position)}
        className="flex items-center gap-1.5"
      >
        <Plus className="h-3 w-3" />
        <Code className="h-3 w-3" />
        Code
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onAddCell(undefined, "markdown", position)}
        className="flex items-center gap-1.5"
      >
        <Plus className="h-3 w-3" />
        <FileText className="h-3 w-3" />
        Markdown
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onAddCell(undefined, "sql", position)}
        className="flex items-center gap-1.5"
      >
        <Plus className="h-3 w-3" />
        <Database className="h-3 w-3" />
        SQL
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onAddCell(undefined, "ai", position)}
        className="flex items-center gap-1.5"
      >
        <Plus className="h-3 w-3" />
        <Bot className="h-3 w-3" />
        AI
      </Button>
    </div>
  );
}
