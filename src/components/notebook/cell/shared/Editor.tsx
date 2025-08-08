import { cn } from "@/lib/utils";
import { KeyBinding } from "@codemirror/view";
import { SupportedLanguage } from "@/types/misc.js";
import { Maximize2, Minimize2 } from "lucide-react";
import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Button } from "@/components/ui/button";
import {
  CodeMirrorEditor,
  CodeMirrorEditorRef,
} from "@/components/notebook/codemirror/CodeMirrorEditor";
import { ErrorBoundary } from "react-error-boundary";

const ErrorFallback = () => {
  return <div>Error rendering editor</div>;
};

export interface EditorRef {
  focus: () => void;
  setCursorPosition: (position: "start" | "end") => void;
  getEditor: () => any;
}

interface EditorProps {
  localSource: string;
  handleSourceChange: (source: string) => void;
  onBlur: () => void;
  handleFocus: () => void;
  language?: SupportedLanguage;
  placeholder?: string;
  enableLineWrapping?: boolean;
  autoFocus: boolean;
  keyMap: KeyBinding[];
}

export const Editor = forwardRef<EditorRef, EditorProps>(
  (
    {
      localSource,
      handleSourceChange,
      handleFocus,
      onBlur,
      language,
      placeholder,
      enableLineWrapping,
      autoFocus,
      keyMap,
    },
    ref
  ) => {
    const [isMaximized, setIsMaximized] = useState(false);
    const normalEditorRef = useRef<CodeMirrorEditorRef>(null);
    const maximizedEditorRef = useRef<CodeMirrorEditorRef>(null);

    // Expose methods via ref - forward to the active editor
    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          const activeEditor = isMaximized
            ? maximizedEditorRef.current
            : normalEditorRef.current;
          activeEditor?.focus();
        },
        setCursorPosition: (position: "start" | "end") => {
          const activeEditor = isMaximized
            ? maximizedEditorRef.current
            : normalEditorRef.current;
          activeEditor?.setCursorPosition(position);
        },
        getEditor: () => {
          const activeEditor = isMaximized
            ? maximizedEditorRef.current
            : normalEditorRef.current;
          return activeEditor?.getEditor();
        },
      }),
      [isMaximized]
    );

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

    return (
      <>
        {/* Normal Editor */}
        <div
          className={cn(
            "relative transition-opacity duration-200",
            isMaximized ? "pointer-events-none opacity-0" : "opacity-100"
          )}
        >
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <CodeMirrorEditor
              ref={normalEditorRef}
              key="editor"
              className="text-base sm:text-sm"
              language={language}
              placeholder={placeholder}
              value={localSource}
              onValueChange={handleSourceChange}
              autoFocus={autoFocus && !isMaximized}
              onFocus={handleFocus}
              onBlur={onBlur}
              keyMap={keyMap}
              enableLineWrapping={enableLineWrapping}
            />
          </ErrorBoundary>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => setIsMaximized(true)}
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Maximized Editor Overlay */}
        {isMaximized && (
          <div className="bg-background fixed inset-0 z-50">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b p-2">
                <span className="text-sm font-medium">Expanded Editor</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMaximized(false)}
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                <ErrorBoundary FallbackComponent={ErrorFallback}>
                  <CodeMirrorEditor
                    ref={maximizedEditorRef}
                    key="maximized-editor"
                    className="bg-background h-full text-base sm:text-sm"
                    maxHeight="100vh"
                    language={language}
                    placeholder={placeholder}
                    value={localSource}
                    onValueChange={handleSourceChange}
                    autoFocus={true}
                    onFocus={handleFocus}
                    onBlur={onBlur}
                    keyMap={keyMap}
                    enableLineWrapping={enableLineWrapping}
                  />
                </ErrorBoundary>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
);

Editor.displayName = "Editor";
