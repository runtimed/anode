import React from "react";
import { Button } from "@/components/ui/button";
import { Bot, Code, Database, FileText } from "lucide-react";
import { useAddCell } from "@/hooks/useAddCell.js";

export const EmptyStateCellAdder: React.FC = () => {
  const { addCell } = useAddCell();
  return (
    <div className="px-4 pt-6 pb-6 text-center sm:px-0 sm:pt-12">
      <div className="text-muted-foreground mb-6">
        Real-time collaborative computing. Pick a cell type to start
        experimenting.
      </div>
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        <Button
          size="lg"
          autoFocus
          onClick={() => addCell()}
          className="flex items-center gap-2"
        >
          <Code className="h-4 w-4" />
          Code Cell
        </Button>
        <Button
          size="lg"
          variant="outline"
          color="yellow"
          onClick={() => addCell(undefined, "markdown")}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Markdown
        </Button>
        <Button
          size="lg"
          variant="outline"
          color="blue"
          onClick={() => addCell(undefined, "sql")}
          className="flex items-center gap-2"
        >
          <Database className="h-4 w-4" />
          SQL Query
        </Button>
        <Button
          size="lg"
          variant="outline"
          color="purple"
          onClick={() => addCell(undefined, "ai")}
          className="flex items-center gap-2"
        >
          <Bot className="h-4 w-4" />
          AI Assistant
        </Button>
      </div>
      <div className="text-muted-foreground hidden text-xs sm:block">
        💡 Use ↑↓ arrow keys to navigate • Shift+Enter to run and move •
        Ctrl+Enter to run
      </div>
    </div>
  );
};
