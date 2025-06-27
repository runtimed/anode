import { python } from "@codemirror/lang-python";
import { EditorState } from "@codemirror/state";
import { githubLight } from "@uiw/codemirror-theme-github";
import { EditorView } from "codemirror";
import { useEffect, useRef } from "react";

import { CellBase } from "./CellBase.js";
import { markdown } from "@codemirror/lang-markdown";

type CodeMirrorEditorProps = {
  value: string;
  language: string;
  onChange: (e: { target: { value: string } }) => void;
  autoFocus?: boolean;
  isMaximized?: boolean;
  onKeyDown?: (e: KeyboardEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

export const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  language,
  onChange,
  autoFocus,
  isMaximized,
  onKeyDown,
  onFocus,
  onBlur,
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    let extensions = [githubLight];
    if (language === "python") {
      extensions.push(python());
    } else if (language === "markdown") {
      extensions.push(markdown());
    }
    const state = EditorState.create({
      doc: value,
      extensions: [
        ...extensions,
        EditorView.updateListener.of((v) => {
          if (v.docChanged) {
            const newValue = v.state.doc.toString();
            if (newValue !== value) onChange({ target: { value: newValue } });
          }
        }),
        EditorView.domEventHandlers({
          blur: onBlur,
          focus: onFocus,
          keydown: onKeyDown,
        }),
        autoFocus ? EditorView.editable.of(true) : [],
      ],
    });
    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    });
    if (autoFocus && viewRef.current) {
      viewRef.current.focus();
    }
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [editorRef, language, autoFocus]);

  useEffect(() => {
    if (viewRef.current) {
      const currentValue = viewRef.current.state.doc.toString();
      if (currentValue !== value) {
        viewRef.current.dispatch({
          changes: { from: 0, to: currentValue.length, insert: value },
        });
      }
    }
  }, [value]);

  return (
    <CellBase isMaximized={isMaximized} asChild>
      <div ref={editorRef} />
    </CellBase>
  );
};
