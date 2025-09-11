import {
  languageServer,
  languageServerWithClient,
  LanguageServerClient,
} from "@marimo-team/codemirror-languageserver";
import { WebSocketTransport } from "@open-rpc/client-js";
import { Extension } from "@codemirror/state";
import { SupportedLspLanguage, SupportedLanguage } from "@/types/misc.js";

// LSP server configurations for different languages
export const LSP_SERVERS = {
  python: {
    // Python LSP server (e.g., Pyright, Pylsp, etc.)
    // You can configure this to point to your preferred Python LSP server
    url: "ws://localhost:3001", // Example Pyright server
    languageId: "python",
  },
  // typescript: {
  //   // TypeScript LSP server
  //   url: "ws://localhost:3002/typescript", // Example TypeScript server
  //   languageId: "typescript",
  // },
  // javascript: {
  //   // JavaScript LSP server
  //   url: "ws://localhost:3002/javascript", // Example JavaScript server
  //   languageId: "javascript",
  // },
  // sql: {
  //   // SQL LSP server (e.g., SQL Language Server)
  //   url: "ws://localhost:3003/sql", // Example SQL server
  //   languageId: "sql",
  // },
} as const satisfies Record<
  Exclude<SupportedLspLanguage, undefined>,
  { url: string; languageId: string }
>;

// Global LSP client instances to share across editors
const lspClients = new Map<SupportedLspLanguage, LanguageServerClient>();

(window as any).getLSPClients = () => lspClients;

/**
 * Get or create an LSP client for a specific language
 */
function getLSPClient(
  language: SupportedLspLanguage
): LanguageServerClient | null {
  if (!language) {
    return null;
  }

  const config = LSP_SERVERS[language];
  if (!config) {
    return null;
  }

  if (lspClients.has(language)) {
    return lspClients.get(language)!;
  }

  try {
    const transport = new WebSocketTransport(config.url);
    const client = new LanguageServerClient({
      transport,
      rootUri: "file:///Users/mm/p/anode/lsp",
      workspaceFolders: [
        { name: "workspace", uri: "file:///Users/mm/p/anode/lsp" },
      ],
    });

    lspClients.set(language, client);
    return client;
  } catch (error) {
    console.warn(`Failed to create LSP client for ${language}:`, error);
    return null;
  }
}

const lspExtensions = new Map<SupportedLspLanguage, Extension>();

function getLspExtension(
  client: LanguageServerClient,
  language: SupportedLspLanguage,
  documentUri: string
): Extension {
  if (lspExtensions.has(language)) {
    return lspExtensions.get(language)!;
  }

  const config = LSP_SERVERS[language];
  if (!config) {
    return [];
  }

  const extension = languageServerWithClient({
    client,
    documentUri,
    languageId: config.languageId,
    keyboardShortcuts: {
      rename: "F2",
      goToDefinition: "ctrlcmd",
    },
    allowHTMLContent: true,
  });

  lspExtensions.set(language, extension);
  return extension;
}

/**
 * Create LSP extension for a specific language and document
 */
export function createLSPExtension(
  language: SupportedLspLanguage,
  documentUri: string
): Extension {
  const client = getLSPClient(language);
  if (!client) {
    return [];
  }

  return getLspExtension(client, language, documentUri);
}

/**
 * Create LSP extension with direct transport (for single editor instances)
 */
export function createLSPExtensionWithTransport(
  language: SupportedLspLanguage,
  documentUri: string
): Extension {
  if (!language || !documentUri) {
    return [];
  }

  const config = LSP_SERVERS[language];
  if (!config) {
    return [];
  }

  try {
    return languageServer({
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
  } catch (error) {
    console.warn(`Failed to create LSP server for ${language}:`, error);
    return [];
  }
}

/**
 * Check if LSP is available for a language
 */
export function isLSPAvailable(language: SupportedLanguage): boolean {
  if (!language) {
    return false;
  }
  return language in LSP_SERVERS;
}

/**
 * Get LSP server configuration for a language
 */
export function getLSPConfig(language: SupportedLanguage) {
  if (!language) {
    return null;
  }
  return LSP_SERVERS[language as keyof typeof LSP_SERVERS] || null;
}

/**
 * Clean up LSP clients (call when shutting down the application)
 */
export function cleanupLSPClients(): void {
  lspClients.forEach((client) => {
    try {
      // Note: The LanguageServerClient may not have a dispose method
      // This is a placeholder for cleanup if needed
      if ("dispose" in client && typeof client.dispose === "function") {
        client.dispose();
      }
    } catch (error) {
      console.warn("Error disposing LSP client:", error);
    }
  });
  lspClients.clear();
}
