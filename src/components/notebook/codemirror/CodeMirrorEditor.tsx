import { python } from "@codemirror/lang-python";
import {
  KeyBinding,
  keymap,
  placeholder as placeholderExt,
  EditorView,
} from "@codemirror/view";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";

import { markdown } from "@codemirror/lang-markdown";

import { SupportedLanguage } from "@/types/misc.js";
import { sql } from "@codemirror/lang-sql";
import { html } from "@codemirror/lang-html";
import { Extension, useCodeMirror } from "@uiw/react-codemirror";
import { baseExtensions, aiBaseExtensions } from "./baseExtensions.js";
import { toast } from "sonner";
import { indentWithTab } from "@codemirror/commands";

export interface CodeMirrorEditorRef {
  focus: () => void;
  setCursorPosition: (position: "start" | "end") => void;
  getEditor: () => EditorView | null;
}

type CodeMirrorEditorProps = {
  value: string;
  language: SupportedLanguage;
  onValueChange?: (val: string) => void;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  keyMap?: KeyBinding[];
  className?: string;
  maxHeight?: string;
  enableLineWrapping?: boolean;
  disableAutocompletion?: boolean;
};

function languageExtension(language: SupportedLanguage) {
  if (language === "html") {
    return html();
  } else if (language === "python") {
    return python();
  } else if (language === "markdown") {
    return markdown();
  } else if (language === "sql") {
    return sql();
  }
  return [];
}

export const CodeMirrorEditor = forwardRef<
  CodeMirrorEditorRef,
  CodeMirrorEditorProps
>(
  (
    {
      className,
      value,
      language,
      onValueChange,
      autoFocus,
      keyMap,
      onFocus,
      onBlur,
      placeholder,
      maxHeight,
      enableLineWrapping = false,
      disableAutocompletion = false,
    },
    ref
  ) => {
    const editorRef = useRef<HTMLDivElement | null>(null);
    const editorViewRef = useRef<EditorView | null>(null);

    const tabBehavior = useMemo(() => {
      return [
        keymap.of([
          {
            key: "Tab",
            shift: (target: EditorView) => {
              if (target.state.doc.length === 0) {
                toast.error("Cell is empty");
                return true;
              }
              return false;
            },
          },
          indentWithTab,
        ]),
      ];
    }, []);

    const langExtension = useMemo(
      () => languageExtension(language),
      [language]
    );

    const extensions = useMemo(() => {
      const selectedBaseExtensions = disableAutocompletion
        ? aiBaseExtensions
        : baseExtensions;

      const exts: Extension[] = [
        keymap.of(keyMap || []),
        ...selectedBaseExtensions,
        langExtension,
        ...tabBehavior,
      ];

      if (placeholder) {
        exts.push(placeholderExt(placeholder));
      }

      if (enableLineWrapping) {
        exts.push(EditorView.lineWrapping);
      }

      return exts;
    }, [
      keyMap,
      langExtension,
      placeholder,
      enableLineWrapping,
      disableAutocompletion,
      tabBehavior,
    ]);

    const handleChange = useCallback(
      (val: string) => {
        onValueChange?.(val);
      },
      [onValueChange]
    );

    const handleFocus = useCallback(() => {
      onFocus?.();
    }, [onFocus]);

    const { setContainer, view } = useCodeMirror({
      container: editorRef.current,
      indentWithTab: false,
      extensions,
      basicSetup: false,
      maxHeight,
      value,
      onChange: handleChange,
      autoFocus,
    });

    // Store the editor view reference
    useEffect(() => {
      editorViewRef.current = view || null;
    }, [view]);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          if (editorViewRef.current) {
            editorViewRef.current.focus();
          }
        },
        setCursorPosition: (position: "start" | "end") => {
          if (editorViewRef.current) {
            const doc = editorViewRef.current.state.doc;
            const pos = position === "start" ? 0 : doc.length;
            editorViewRef.current.dispatch({
              selection: { anchor: pos, head: pos },
              scrollIntoView: true,
            });
          }
        },
        getEditor: () => editorViewRef.current,
      }),
      []
    );

    useEffect(() => {
      if (editorRef.current) {
        setContainer(editorRef.current);
      }
    }, [setContainer]);

    return (
      <div
        ref={editorRef}
        onBlur={onBlur}
        onFocus={handleFocus}
        className={className}
      />
    );
  }
);

CodeMirrorEditor.displayName = "CodeMirrorEditor";
