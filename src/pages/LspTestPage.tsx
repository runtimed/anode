import { useCodeMirror } from "@uiw/react-codemirror";
import { useEffect, useRef, useState } from "react";
import { python } from "@codemirror/lang-python";
// import { githubLight } from "@uiw/codemirror-theme-github";
// import { languageServer } from "@marimo-team/codemirror-languageserver";
// import { LSP_SERVERS } from "@/components/notebook/codemirror/lspConfig";

// const lspExtension = languageServer({
//   serverUri: LSP_SERVERS.python.url,
//   rootUri: "file:///",
//   workspaceFolders: [{ name: "workspace", uri: "file:///" }],
//   documentUri: "file:///path/to/test.py",
//   languageId: "python",
//   keyboardShortcuts: {
//     rename: "F2",
//     goToDefinition: "ctrlcmd",
//   },
//   allowHTMLContent: true,
// });

import {
  Transport,
  LSPClient,
  languageServerExtensions,
} from "@codemirror/lsp-client";

function simpleWebSocketTransport(uri: string): Promise<Transport> {
  let handlers: ((value: string) => void)[] = [];
  let sock = new WebSocket(uri);
  sock.onmessage = (e) => {
    console.log(
      "Received message from WebSocket:",
      JSON.parse(e.data.toString())
    );
    for (let h of handlers) h(e.data.toString());
  };
  return new Promise((resolve) => {
    sock.onopen = () =>
      resolve({
        send(message: string) {
          sock.send(message);
        },
        subscribe(handler: (value: string) => void) {
          console.log("Subscribed to WebSocket");
          handlers.push(handler);
        },
        unsubscribe(handler: (value: string) => void) {
          handlers = handlers.filter((h) => h != handler);
        },
      });
  });
}

let transport = await simpleWebSocketTransport("ws://localhost:3001/pyright");
let client = new LSPClient({ extensions: languageServerExtensions() }).connect(
  transport
);

const extensions = [python(), client.plugin("file:///some/file.py", "python")];

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
    basicSetup: true,
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
