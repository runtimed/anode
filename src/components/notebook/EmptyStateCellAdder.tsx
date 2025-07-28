import { Button } from "@/components/ui/button";
import { Bot, Code, Database, FileText } from "lucide-react";
import React from "react";

interface EmptyStateCellAdderProps {
  onAddCell: (
    cellId?: string,
    cellType?: "code" | "markdown" | "sql" | "ai",
    position?: "before" | "after"
  ) => void;
  onCreateExampleAiCell: (prompt: string) => void;
}

export const EmptyStateCellAdder: React.FC<EmptyStateCellAdderProps> = ({
  onAddCell,
  onCreateExampleAiCell,
}) => {
  return (
    <div className="px-4 pt-6 pb-6 text-center sm:px-0 sm:pt-12">
      <div className="text-muted-foreground mb-6">
        Welcome to your notebook! Choose a cell type to get started.
      </div>
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        <Button
          size="lg"
          autoFocus
          onClick={() => onAddCell()}
          className="flex items-center gap-2"
        >
          <Code className="h-4 w-4" />
          Code Cell
        </Button>
        <Button
          size="lg"
          variant="outline"
          color="yellow"
          onClick={() => onAddCell(undefined, "markdown")}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Markdown
        </Button>
        <Button
          size="lg"
          variant="outline"
          color="blue"
          onClick={() => onAddCell(undefined, "sql")}
          className="flex items-center gap-2"
        >
          <Database className="h-4 w-4" />
          SQL Query
        </Button>
        <Button
          size="lg"
          variant="outline"
          color="purple"
          onClick={() => onAddCell(undefined, "ai")}
          className="flex items-center gap-2"
        >
          <Bot className="h-4 w-4" />
          AI Assistant
        </Button>
      </div>
      <div className="text-muted-foreground mb-8 hidden text-xs sm:block">
        💡 Use ↑↓ arrow keys to navigate • Shift+Enter to run and move •
        Ctrl+Enter to run
      </div>

      <hr className="my-8" />

      <div className="mb-4 text-lg font-semibold text-purple-700 dark:text-purple-400">
        {"Don't know what to create? Try some example prompts below"}
      </div>

      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
        <SuggestionButton
          label="What MCP tools can I use?"
          onClick={() => onCreateExampleAiCell("What MCP tools can I use?")}
        />
        <SuggestionButton
          label="Create an example GitHub flavored markdown cell"
          onClick={() =>
            onCreateExampleAiCell(
              "Create an example GitHub flavored markdown cell"
            )
          }
        />
        <SuggestionButton
          label="Create a pie chart of pie that I have eaten (30%)"
          onClick={() =>
            onCreateExampleAiCell(
              "Create a pie chart of pie that I have eaten (30%)"
            )
          }
        />
        <SuggestionButton
          label="Create a function that returns a random number between 0 and 100"
          onClick={() =>
            onCreateExampleAiCell(
              "Create a function that returns a random number between 0 and 100"
            )
          }
        />
      </div>
    </div>
  );
};

function SuggestionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      size="xl"
      onClick={onClick}
      className="relative h-auto w-full !px-10 text-left font-normal text-pretty break-words whitespace-normal"
      color="purple"
      variant="outline"
    >
      <Bot className="absolute top-4 left-4 h-4 w-4" />
      {label}
    </Button>
  );
}
