/**
 * Generate a document URI for LSP based on notebook and cell information
 */
export function generateDocumentUri(
  notebookId: string,
  cellId: string,
  language: string
): string {
  // Create a file-like URI that LSP servers can understand
  // Format: file:///notebook/{notebookId}/cell/{cellId}.{extension}
  const extension = getFileExtension(language);
  return `file:///notebook/${notebookId}/cell/${cellId}.${extension}`;
}

/**
 * Get file extension for a given language
 */
function getFileExtension(language: string): string {
  switch (language.toLowerCase()) {
    case "python":
      return "py";
    case "typescript":
      return "ts";
    case "javascript":
      return "js";
    case "sql":
      return "sql";
    case "markdown":
      return "md";
    case "json":
      return "json";
    case "yaml":
    case "yml":
      return "yaml";
    case "html":
      return "html";
    case "css":
      return "css";
    case "scss":
      return "scss";
    case "less":
      return "less";
    case "xml":
      return "xml";
    case "rust":
      return "rs";
    case "go":
      return "go";
    case "java":
      return "java";
    case "c":
      return "c";
    case "cpp":
    case "c++":
      return "cpp";
    case "csharp":
    case "c#":
      return "cs";
    case "php":
      return "php";
    case "ruby":
      return "rb";
    case "swift":
      return "swift";
    case "kotlin":
      return "kt";
    case "scala":
      return "scala";
    case "clojure":
      return "clj";
    case "haskell":
      return "hs";
    case "ocaml":
      return "ml";
    case "fsharp":
    case "f#":
      return "fs";
    case "lua":
      return "lua";
    case "perl":
      return "pl";
    case "r":
      return "r";
    case "matlab":
      return "m";
    case "shell":
    case "bash":
      return "sh";
    case "powershell":
      return "ps1";
    case "dockerfile":
      return "Dockerfile";
    case "makefile":
      return "Makefile";
    default:
      return "txt";
  }
}

/**
 * Extract notebook ID from document URI
 */
export function extractNotebookIdFromUri(uri: string): string | null {
  const match = uri.match(/file:\/\/\/notebook\/([^/]+)\/cell\//);
  return match ? match[1] : null;
}

/**
 * Extract cell ID from document URI
 */
export function extractCellIdFromUri(uri: string): string | null {
  const match = uri.match(/file:\/\/\/notebook\/[^/]+\/cell\/([^.]+)\./);
  return match ? match[1] : null;
}
