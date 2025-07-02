import { python } from "@codemirror/lang-python";
import { keymap, placeholder as placeholderExt } from "@codemirror/view";
import { githubLight } from "@uiw/codemirror-theme-github";
import { basicSetup, EditorView } from "codemirror";
import { useCallback, useEffect, useRef } from "react";

import { markdown } from "@codemirror/lang-markdown";
import { CellBase } from "./CellBase.js";

import { SupportedLanguage } from "@/types/misc.js";
import { events } from "@runt/schema";
import { useCodeMirror } from "@uiw/react-codemirror";
import { useStore } from "@livestore/react";
import { sql } from "@codemirror/lang-sql";

const customKeyMap = keymap.of([
  {
    win: "Ctrl-Enter",
    run: () => {
      alert("Ctrl-Enter");
      console.log("Ctrl-Enter");
      return true;
    },
  },
  {
    key: "Shift-Enter",
    run: () => {
      alert("Shift-Enter");
      console.log("Shift-Enter");
      return true;
    },
  },
  {
    mac: "Meta-Enter",
    run: (editor) => {
      const { state } = editor;
      const { selection } = state;
      const cursorPos = selection.main.head;
      const docLength = state.doc.length;

      if (cursorPos === docLength) {
        console.log("Cursor is at the end of the document");
        // You can add your logic here for when cursor is at the end
      } else {
        console.log("Cursor is not at the end of the document");
        // You can add your logic here for when cursor is not at the end
      }
      alert("Meta-Enter");
      console.log("Meta-Enter");
      return true;
    },
  },
  {
    key: "ArrowDown",
    run: (editor) => {
      const { state } = editor;
      const { selection } = state;
      const cursorPos = selection.main.head;
      const docLength = state.doc.length;

      if (cursorPos === docLength) {
        console.log("Cursor is at the end of the document");
        // You can add your logic here for when cursor is at the end
      }
      return false;
    },
  },
  {
    key: "ArrowUp",
    run: (editor) => {
      const { state } = editor;
      const { selection } = state;
      const cursorPos = selection.main.head;

      if (cursorPos === 0) {
        console.log("Cursor is at the start of the document");
        // You can add your logic here for when cursor is at the start
      }
      return false;
    },
  },
]);

// Putting basicSetup last so we can override the default keymap
const extensions = [customKeyMap, basicSetup, githubLight];

// ---

type CodeMirrorEditorProps = {
  value: string;
  language: SupportedLanguage;
  onValueChange: (val: string) => void;
  autoFocus?: boolean;
  isMaximized?: boolean;
  onKeyDown?: (e: KeyboardEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
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
  onKeyDown,
  onFocus,
  onBlur,
  placeholder,
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);

  // const { store } = useStore();
  // const doc = store.useQuery(doc$);

  // const onChange2 = useCallback(
  //   (val: string, viewUpdate: any) => {
  //     console.log("val:", val);
  //     // setValue(val);
  //     store.commit(
  //       events.cellSourceChanged({
  //         source: val,
  //         id: "123",
  //         modifiedBy: "user",
  //       })
  //     );
  //   },
  //   [store]
  // );

  const { setContainer } = useCodeMirror({
    container: editorRef.current,
    extensions: [
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
        // onKeyDownCapture={(e) => {
        //   console.log("e.key:", e.key);
        //   if (e.key === "Enter" && e.shiftKey) {
        //     e.preventDefault();
        //     e.stopPropagation();
        //     alert("Enter+Shift");
        //   }
        // }}
      />
    </CellBase>
  );
};
