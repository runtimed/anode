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

import { SupportedLanguage, SupportedLspLanguage } from "@/types/misc.js";
import { sql } from "@codemirror/lang-sql";
import { useCodeMirror } from "@uiw/react-codemirror";
import { baseExtensions, aiBaseExtensions } from "./baseExtensions.js";
import { createLSPExtension, isLSPAvailable } from "./lspConfig.js";

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
  enableLSP?: boolean;
  documentUri?: string;
};

function languageExtension(language: SupportedLanguage) {
  if (language === "python") {
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
      enableLSP = false,
      documentUri,
    },
    ref
  ) => {
    const editorRef = useRef<HTMLDivElement | null>(null);
    const editorViewRef = useRef<EditorView | null>(null);

    const langExtension = useMemo(
      () => languageExtension(language),
      [language]
    );

    const extensions = useMemo(() => {
      const selectedBaseExtensions = disableAutocompletion
        ? aiBaseExtensions
        : baseExtensions;

      if (enableLSP && isLSPAvailable(language) && documentUri) {
        const lspExtension = createLSPExtension(
          language as SupportedLspLanguage,
          documentUri
        );
        if (lspExtension) {
          selectedBaseExtensions.push(lspExtension);
        }
      }

      const exts = [
        keymap.of(keyMap || []),
        ...selectedBaseExtensions,
        langExtension,
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
      enableLSP,
      language,
      documentUri,
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
