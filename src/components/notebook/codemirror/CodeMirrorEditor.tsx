import { python } from "@codemirror/lang-python";
import {
  KeyBinding,
  keymap,
  placeholder as placeholderExt,
  EditorView,
} from "@codemirror/view";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { markdown } from "@codemirror/lang-markdown";

import { SupportedLanguage } from "@/types/misc.js";
import { sql } from "@codemirror/lang-sql";
import { useCodeMirror } from "@uiw/react-codemirror";
import { baseExtensions, aiBaseExtensions } from "./baseExtensions.js";
import { OtherUserPresence, updatePresenceStateEffect } from "./presence.js";
import { Button } from "@/components/ui/button";

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
  otherUserPresence?: OtherUserPresence;
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
  otherUserPresence,
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);

  const langExtension = useMemo(() => languageExtension(language), [language]);

  const extensions = useMemo(() => {
    const selectedBaseExtensions = disableAutocompletion
      ? aiBaseExtensions
      : baseExtensions;

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
  ]);

  const handleChange = useCallback(
    (val: string) => {
      onValueChange?.(val);
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
    maxHeight,
    value,
    onChange: handleChange,
    autoFocus,
  });

  useEffect(() => {
    if (editorRef.current) {
      setContainer(editorRef.current);
    }
  }, [setContainer]);

  useEffect(() => {
    if (otherUserPresence) {
      console.log("otherUserPresence", otherUserPresence);
      const val = updatePresenceStateEffect.of(otherUserPresence);
      view?.dispatch({
        effects: [val],
      });
    }
  }, [otherUserPresence, view]);

  return (
    <>
      <div
        ref={editorRef}
        onBlur={onBlur}
        onFocus={handleFocus}
        className={className}
      />
      {otherUserPresence && (
        <div className="">
          <div className="text-xs text-gray-500">
            {otherUserPresence.userId}
            {otherUserPresence.ranges.map((range) => (
              <div key={range.from}>
                {range.from} - {range.to}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
