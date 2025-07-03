import { python } from "@codemirror/lang-python";
import {
  EditorView,
  KeyBinding,
  keymap,
  placeholder as placeholderExt,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
} from "@codemirror/view";
import { githubLight } from "@uiw/codemirror-theme-github";
import { useEffect, useRef, useMemo, useCallback } from "react";

import { markdown } from "@codemirror/lang-markdown";
import { CellBase } from "./CellBase.js";

import { SupportedLanguage } from "@/types/misc.js";
import { sql } from "@codemirror/lang-sql";
import { useCodeMirror } from "@uiw/react-codemirror";
import { EditorState } from "@codemirror/state";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
  indentOnInput,
  bracketMatching,
} from "@codemirror/language";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
} from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";

// Custom setup without line numbers and gutters
const customSetup = [
  // Replace non-printable characters with placeholders
  highlightSpecialChars(),
  // The undo history
  history(),
  // Replace native cursor/selection with our own
  drawSelection(),
  // Show a drop cursor when dragging over the editor
  dropCursor(),
  // Allow multiple cursors/selections
  EditorState.allowMultipleSelections.of(true),
  // Re-indent lines when typing specific input
  indentOnInput(),
  // Highlight syntax with a default style
  syntaxHighlighting(defaultHighlightStyle),
  // Highlight matching brackets near cursor
  bracketMatching(),
  // Automatically close brackets
  closeBrackets(),
  // Load the autocompletion system
  autocompletion(),
  // Allow alt-drag to select rectangular regions
  rectangularSelection(),
  // Show a crosshair cursor when rectangular selecting
  crosshairCursor(),
  // Highlight matching search results
  highlightSelectionMatches(),
  // Key bindings
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...completionKeymap,
    ...lintKeymap,
  ]),
];

const baseExtensions = [
  ...customSetup,
  githubLight,
  EditorView.theme({
    // Disable active line highlighting
    ".cm-activeLine": {
      backgroundColor: "transparent !important",
    },
    ".cm-focused .cm-activeLine": {
      backgroundColor: "transparent !important",
    },
    // Remove any gutter styling
    ".cm-gutters": {
      display: "none !important",
    },
    // Ensure editor content takes full width
    ".cm-content": {
      padding: "0 !important",
    },
    // Remove all borders and outlines from editor
    ".cm-editor": {
      border: "none !important",
      outline: "none !important",
    },
    ".cm-focused": {
      outline: "none !important",
      border: "none !important",
    },
    ".cm-focused.cm-editor": {
      outline: "none !important",
      border: "none !important",
      boxShadow: "none !important",
    },
    // Override any theme borders
    "&.cm-focused": {
      outline: "none !important",
      border: "none !important",
    },
    // Remove any dotted borders from focus states
    ".cm-focused .cm-scroller": {
      outline: "none !important",
      border: "none !important",
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
