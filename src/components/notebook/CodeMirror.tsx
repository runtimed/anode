import { python } from "@codemirror/lang-python";
import {
  EditorView,
  KeyBinding,
  keymap,
  placeholder as placeholderExt,
} from "@codemirror/view";
import { githubLight } from "@uiw/codemirror-theme-github";
import { basicSetup } from "codemirror";
import { useEffect, useRef, useMemo, useCallback } from "react";

import { markdown } from "@codemirror/lang-markdown";
import { CellBase } from "./CellBase.js";

import { SupportedLanguage } from "@/types/misc.js";
import { sql } from "@codemirror/lang-sql";
import { useCodeMirror } from "@uiw/react-codemirror";

const baseExtensions = [
  basicSetup,
  githubLight,
  EditorView.theme({
    // Disable active line highlighting
    ".cm-activeLine": {
      backgroundColor: "transparent !important",
    },
    ".cm-focused .cm-activeLine": {
      backgroundColor: "transparent !important",
    },
    // Disable gutter active line highlighting
    ".cm-activeLineGutter": {
      backgroundColor: "transparent !important",
    },
    ".cm-focused .cm-activeLineGutter": {
      backgroundColor: "transparent !important",
    },
  }),
];

type CodeMirrorEditorProps = {
  value: string;
  language: SupportedLanguage;
  onValueChange: (val: string) => void;
  autoFocus?: boolean;
  isMaximized?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  keyMap?: KeyBinding[];
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

export const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  language,
  onValueChange,
  autoFocus,
  isMaximized,
  keyMap,
  onFocus,
  onBlur,
  placeholder,
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);

  const langExtension = useMemo(() => languageExtension(language), [language]);

  const extensions = useMemo(() => {
    const exts = [keymap.of(keyMap || []), ...baseExtensions, langExtension];

    if (placeholder) {
      exts.push(placeholderExt(placeholder));
    }

    return exts;
  }, [keyMap, langExtension, placeholder]);

  const handleChange = useCallback(
    (val: string) => {
      onValueChange(val);
    },
    [onValueChange]
  );

  const handleFocus = useCallback(() => {
    editorRef.current?.scrollIntoView({ block: "nearest" });
    onFocus?.();
  }, [onFocus]);

  const { setContainer, view } = useCodeMirror({
    container: editorRef.current,
    extensions,
    basicSetup: false,
    value,
    onChange: handleChange,
    // Handle focus manually
    autoFocus: false,
  });

  useEffect(() => {
    if (editorRef.current) {
      setContainer(editorRef.current);
    }
  }, [setContainer]);

  useEffect(() => {
    if (autoFocus && view) {
      // Defer focus until after the editor has been mounted
      setTimeout(() => {
        view.focus();
      }, 0);
    }
  }, [autoFocus, view]);

  return (
    <CellBase isMaximized={isMaximized} asChild>
      <div ref={editorRef} onBlur={onBlur} onFocus={handleFocus} />
    </CellBase>
  );
};
