import { useCodeMirror } from "@uiw/react-codemirror";
import { useEffect, useRef, useState } from "react";
import { baseExtensions } from "@/components/notebook/codemirror/baseExtensions";
import { python } from "@codemirror/lang-python";

const extensions = [...baseExtensions, python()];

const defaultCode = `
def add(a: int, b: int):
  return a + b

add(3, 6)
`.trim();

export const LspTestPage = () => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [value, setValue] = useState(defaultCode);

  const { setContainer } = useCodeMirror({
    container: editorRef.current,
    extensions,
    basicSetup: false,
    maxHeight: "100%",
    value,
    onChange: setValue,
    autoFocus: true,
  });

  useEffect(() => {
    if (editorRef.current) {
      setContainer(editorRef.current);
    }
  }, [setContainer]);

  return <div ref={editorRef} />;
};
