import { cn } from "@/lib/utils";
import { KeyBinding } from "@codemirror/view";
import { SupportedLanguage } from "@/types/misc.js";
import { Maximize2, Minimize2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CodeMirrorEditor } from "@/components/notebook/codemirror/CodeMirrorEditor";
import { ErrorBoundary } from "react-error-boundary";

const ErrorFallback = () => {
  return <div>Error rendering editor</div>;
};

export function Editor({
  localSource,
  handleSourceChange,
  handleFocus,
  onBlur,
  language,
  placeholder,
  enableLineWrapping,
  autoFocus,
  keyMap,
}: {
  localSource: string;
  handleSourceChange: (source: string) => void;
  onBlur: () => void;
  handleFocus: () => void;
  language?: SupportedLanguage;
  placeholder?: string;
  enableLineWrapping?: boolean;
  autoFocus: boolean;
  keyMap: KeyBinding[];
}) {
  const [isMaximized, setIsMaximized] = useState(false);

  // Handle escape key to close maximized editor
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMaximized) {
        setIsMaximized(false);
      }
    };

    if (isMaximized) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isMaximized]);

  // Handle clicking outside to close maximized editor
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsMaximized(false);
    }
  };

  return (
    <>
      {/* Normal editor container */}
      <div
        className={cn("relative min-h-[1.5rem]", isMaximized && "opacity-20")}
      >
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <CodeMirrorEditor
            key="editor"
            className="text-base sm:text-sm"
            language={language}
            placeholder={placeholder}
            value={localSource}
            onValueChange={handleSourceChange}
            autoFocus={autoFocus && !isMaximized}
            onFocus={handleFocus}
            keyMap={keyMap}
            onBlur={onBlur}
            enableLineWrapping={enableLineWrapping}
          />
        </ErrorBoundary>
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-1 right-1 h-6 w-6 p-1 sm:hidden"
          onClick={() => setIsMaximized(true)}
          aria-label="Maximize editor"
        >
          <Maximize2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Maximized editor overlay */}
      {isMaximized && (
        <div
          className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <div
            className="bg-background absolute inset-0"
            onClick={(e) => e.stopPropagation()}
          >
            <ErrorBoundary FallbackComponent={ErrorFallback}>
              <CodeMirrorEditor
                key="maximized-editor"
                className="bg-background h-full text-base sm:text-sm"
                maxHeight="100vh"
                language={language}
                placeholder={placeholder}
                value={localSource}
                onValueChange={handleSourceChange}
                autoFocus={true}
                onFocus={handleFocus}
                keyMap={keyMap}
                onBlur={onBlur}
                enableLineWrapping={enableLineWrapping}
              />
            </ErrorBoundary>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-1 right-1 h-6 w-6 p-1"
              onClick={() => setIsMaximized(false)}
              aria-label="Minimize editor"
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
