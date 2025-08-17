import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Bot, Code, Database, FileText, Plus } from "lucide-react";
import { useAddCell } from "@/hooks/useAddCell.js";

export function CellAdder({
  position,
  className,
}: {
  position: "before" | "after";
  className?: string;
}) {
  const { addCell } = useAddCell();
  return (
    <div className={cn("flex justify-center gap-2", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => addCell(undefined, "code", position)}
        className="flex items-center gap-1.5"
      >
        <Plus className="h-3 w-3" />
        <Code className="h-3 w-3" />
        Code
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => addCell(undefined, "markdown", position)}
        color="yellow"
      >
        <Plus className="h-3 w-3" />
        <FileText className="h-3 w-3" />
        Markdown
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => addCell(undefined, "sql", position)}
        color="blue"
      >
        <Plus className="h-3 w-3" />
        <Database className="h-3 w-3" />
        SQL
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => addCell(undefined, "ai", position)}
        color="purple"
      >
        <Plus className="h-3 w-3" />
        <Bot className="h-3 w-3" />
        AI
      </Button>
    </div>
  );
}
