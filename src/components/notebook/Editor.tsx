import { cn } from "@/lib/utils";
import { KeyBinding } from "@codemirror/view";
import { tables } from "@runt/schema";
import { Maximize2, Minimize2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "../ui/button";
import { CodeMirrorEditor } from "./codemirror/CodeMirrorEditor";

// TODO: use radix modal primitives for this to make state management easier
export function Editor({
  localSource,
  handleSourceChange,
  updateSource,
  handleFocus,
  cell,
  autoFocus,
  keyMap,
}: {
  localSource: string;
  handleSourceChange: (source: string) => void;
  updateSource: () => void;
  handleFocus: () => void;
  cell: typeof tables.cells.Type;
  autoFocus: boolean;
  keyMap: KeyBinding[];
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  return (
    <>
      {isMaximized && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border p-2 text-xs text-black/50">
          Maximized block
          <Maximize2 className="size-3" />
        </div>
      )}
      <div
        ref={editorRef}
        className={cn(
          "relative min-h-[1.5rem] transition-all duration-200",
          isMaximized &&
            "max-svh fixed inset-0 z-50 overflow-hidden bg-black/20"
        )}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setIsMaximized(false);
          }
        }}
      >
        <CodeMirrorEditor
          className={cn(
            "overscroll-contain text-base sm:text-sm",
            isMaximized && "relative z-50"
          )}
          maxHeight={isMaximized ? "100svh" : "40vh"}
          language={
            cell.cellType === "code"
              ? "python"
              : cell.cellType === "markdown"
                ? "markdown"
                : undefined
          }
          placeholder={
            cell.cellType === "code"
              ? "Enter your code here..."
              : cell.cellType === "markdown"
                ? "Enter markdown..."
                : "Enter raw text..."
          }
          value={localSource}
          onValueChange={handleSourceChange}
          autoFocus={autoFocus}
          onFocus={handleFocus}
          keyMap={keyMap}
          onBlur={updateSource}
        />
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-1 right-1 z-50 h-6 w-6 p-1 sm:hidden"
          onClick={() => setIsMaximized(!isMaximized)}
        >
          {isMaximized ? (
            <Minimize2 className="h-3 w-3" />
          ) : (
            <Maximize2 className="h-3 w-3" />
          )}
        </Button>
      </div>
    </>
  );
}
