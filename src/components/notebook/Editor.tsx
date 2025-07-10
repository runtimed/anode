import { cn } from "@/lib/utils";
import { KeyBinding } from "@codemirror/view";
import * as Dialog from "@radix-ui/react-dialog";
import { tables } from "@runt/schema";
import { Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { CodeMirrorEditor } from "./codemirror/CodeMirrorEditor";
import { OtherUserPresence } from "./codemirror/presence";

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
  const [isMaximized, setIsMaximized] = useState(false);

  const [otherUserPresence, setOtherUserPresence] = useState<
    OtherUserPresence[]
  >([
    {
      userId: "123",
      ranges: [
        {
          from: 0,
          to: 0,
        },
      ],
    },
  ]);

  if (!isMaximized) {
    return (
      <div className={cn("relative min-h-[1.5rem]")}>
        <CodeMirrorEditor
          className="text-base sm:text-sm"
          language={languageFromCellType(cell.cellType)}
          placeholder={placeholderFromCellType(cell.cellType)}
          value={localSource}
          onValueChange={handleSourceChange}
          autoFocus={autoFocus}
          onFocus={handleFocus}
          keyMap={keyMap}
          onBlur={updateSource}
          enableLineWrapping={cell.cellType === "markdown"}
          otherUserPresence={otherUserPresence}
        />
        <MaxMinButton
          className="absolute top-1 right-1 sm:hidden"
          isMaximized={isMaximized}
          setIsMaximized={setIsMaximized}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setOtherUserPresence([
              {
                userId: "react" + Math.random().toString(),
                ranges: [
                  { from: 0, to: 10 },
                  { from: 10, to: 20 },
                ],
              },
            ]);
          }}
        >
          Update presence (from React)
        </Button>
      </div>
    );
  }

  return (
    <>
      <Dialog.Root defaultOpen={true} onOpenChange={setIsMaximized}>
        <div className={cn("relative min-h-[1.5rem]")}>
          {/* Duplicate editor for dialog to prevent layout shift */}
          <CodeMirrorEditor
            className="text-base sm:text-sm"
            language={languageFromCellType(cell.cellType)}
            placeholder={placeholderFromCellType(cell.cellType)}
            value={localSource}
            enableLineWrapping={cell.cellType === "markdown"}
            otherUserPresence={otherUserPresence}
          />
          <MaxMinButton
            className="absolute top-1 right-1 sm:hidden"
            isMaximized={isMaximized}
            setIsMaximized={setIsMaximized}
          />
        </div>
        <Dialog.Portal>
          <Dialog.Overlay
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsMaximized(false)}
          />
          <Dialog.Content
            className={cn(
              "animate-in fade-in slide-in-from-top-5 fixed top-0 z-50 w-full duration-200 outline-none"
            )}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={() => setIsMaximized(false)}
            onEscapeKeyDown={() => setIsMaximized(false)}
          >
            <Dialog.Title className="sr-only">Editor</Dialog.Title>
            <CodeMirrorEditor
              className="relative text-base sm:text-sm"
              maxHeight="100svh"
              language={languageFromCellType(cell.cellType)}
              placeholder={placeholderFromCellType(cell.cellType)}
              value={localSource}
              onValueChange={handleSourceChange}
              autoFocus={true}
              onFocus={handleFocus}
              onBlur={updateSource}
              enableLineWrapping={cell.cellType === "markdown"}
            />
            <MaxMinButton
              className="top-1 right-1"
              isMaximized={isMaximized}
              setIsMaximized={setIsMaximized}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function MaxMinButton({
  className,
  isMaximized,
  setIsMaximized,
}: {
  className?: string;
  isMaximized: boolean;
  setIsMaximized: (isMaximized: boolean) => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(className, "absolute top-1 right-1 h-6 w-6 p-1")}
      onClick={() => setIsMaximized(!isMaximized)}
      aria-label={isMaximized ? "Minimize editor" : "Maximize editor"}
    >
      {isMaximized ? (
        <Minimize2 className="h-3 w-3" />
      ) : (
        <Maximize2 className="h-3 w-3" />
      )}
    </Button>
  );
}

function languageFromCellType(
  cellType: (typeof tables.cells.Type)["cellType"]
) {
  if (cellType === "code") {
    return "python";
  } else if (cellType === "markdown") {
    return "markdown";
  } else if (cellType === "ai") {
    return "markdown";
  }
  return undefined;
}

function placeholderFromCellType(
  cellType: (typeof tables.cells.Type)["cellType"]
) {
  if (cellType === "code") {
    return "Enter your code here...";
  } else if (cellType === "markdown") {
    return "Enter markdown...";
  } else if (cellType === "ai") {
    return "Ask me anything about your notebook, data, or analysis...";
  }
  return "Enter raw text...";
}
