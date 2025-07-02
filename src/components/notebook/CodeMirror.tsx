import { python } from "@codemirror/lang-python";
import {
  KeyBinding,
  keymap,
  placeholder as placeholderExt,
} from "@codemirror/view";
import { githubLight } from "@uiw/codemirror-theme-github";
import { basicSetup } from "codemirror";
import { useEffect, useRef } from "react";

import { markdown } from "@codemirror/lang-markdown";
import { CellBase } from "./CellBase.js";

import { SupportedLanguage } from "@/types/misc.js";
import { sql } from "@codemirror/lang-sql";
import { useCodeMirror } from "@uiw/react-codemirror";

// Putting basicSetup last so we can override the default keymap
const extensions = [basicSetup, githubLight];

// ---

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

  const { setContainer } = useCodeMirror({
    container: editorRef.current,
    extensions: [
      keymap.of(keyMap || []),
      ...extensions,
      languageExtension(language),
      placeholder ? placeholderExt(placeholder) : [],
    ],
    basicSetup: false,
    value,
    onChange: (val) => {
      console.log("val:", val);
      onValueChange(val);
    },
    autoFocus,
  });

  useEffect(() => {
    if (editorRef.current) {
      setContainer(editorRef.current);
    }
  }, [editorRef.current]);

  return (
    <CellBase isMaximized={isMaximized} asChild>
      <div
        ref={editorRef}
        onBlur={() => {
          console.log("onBlur", editorRef.current);
          onBlur?.();
        }}
        onFocus={() => {
          console.log("onFocus", editorRef.current);
          editorRef.current?.scrollIntoView({ block: "nearest" });
          onFocus?.();
        }}
      />
    </CellBase>
  );
};
