import { basicSetup } from "@/components/notebook/codemirror/baseExtensions";
import { python } from "@codemirror/lang-python";
import { useCodeMirror } from "@uiw/react-codemirror";
import { useEffect, useRef, useState } from "react";

import { LSP_SERVERS } from "@/components/notebook/codemirror/lspConfig";
import { languageServer } from "@marimo-team/codemirror-languageserver";

const lspExtension = languageServer({
  serverUri: LSP_SERVERS.python.url,
  rootUri: "file:///Users/mm/p/anode/lsp",
  workspaceFolders: [
    { name: "workspace", uri: "file:///Users/mm/p/anode/lsp" },
  ],
  documentUri: "file:///Users/mm/p/anode/lsp/test.py",
  languageId: "python",
  keyboardShortcuts: {
    rename: "F2",
    goToDefinition: "ctrlcmd",
  },
  allowHTMLContent: true,
});

const extensions = [basicSetup, python(), lspExtension];

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
    // theme: githubLight,
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
