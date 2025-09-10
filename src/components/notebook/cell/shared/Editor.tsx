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
import { generateDocumentUri } from "@/util/documentUri.js";
import { isLSPAvailable } from "@/components/notebook/codemirror/baseExtensions.js";

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
  notebookId?: string;
  cellId?: string;
  enableLSP?: boolean;
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
      notebookId,
      cellId,
      enableLSP = false,
    },
    ref
  ) => {
    const [isMaximized, setIsMaximized] = useState(false);
    const normalEditorRef = useRef<CodeMirrorEditorRef>(null);
    const maximizedEditorRef = useRef<CodeMirrorEditorRef>(null);

    // Generate document URI for LSP if enabled
    const documentUri =
      enableLSP && language && notebookId && cellId
        ? generateDocumentUri(notebookId, cellId, language)
        : undefined;

    // Check if LSP should be enabled for this language
    const shouldEnableLSP = Boolean(
      enableLSP && language && isLSPAvailable(language) && documentUri
    );

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
              ref={normalEditorRef}
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
              enableLSP={shouldEnableLSP}
              documentUri={documentUri}
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
                  keyMap={keyMap}
                  onBlur={onBlur}
                  enableLineWrapping={enableLineWrapping}
                  enableLSP={shouldEnableLSP}
                  documentUri={documentUri}
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
);

Editor.displayName = "Editor";
