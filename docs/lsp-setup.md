# Language Server Protocol (LSP) Setup

This document explains how to set up Language Server Protocol (LSP) support in Anode for enhanced code editing features like autocompletion, error checking, and go-to-definition.

## Features

With LSP enabled, you get:

- 🔍 **Code Completion** - Intelligent autocompletion with support for snippets
- 💡 **Hover Information** - Rich documentation on hover
- ⚠️ **Diagnostics** - Real-time error checking and warnings
- 🔄 **Code Actions** - Quick fixes and refactoring suggestions
- 🏷️ **Symbol Renaming** - Smart symbol renaming across files
- 🎯 **Go to Definition** - Jump to symbol definitions
- 🎨 **Markdown Support** - Rich formatting in hover tooltips and documentation

## Keyboard Shortcuts

- `F2` - Rename symbol under cursor
- `Ctrl/Cmd + Click` - Go to definition
- `Ctrl/Cmd + Space` - Trigger completion manually

## Setup

### 1. Configure LSP Servers

Copy the example configuration file:

```bash
cp lsp-servers.example.json lsp-servers.json
```

Edit `lsp-servers.json` to configure your language servers:

```json
{
  "servers": {
    "python": {
      "url": "ws://localhost:3001/pyright",
      "description": "Pyright Python Language Server",
      "enabled": true
    },
    "typescript": {
      "url": "ws://localhost:3002/typescript",
      "description": "TypeScript Language Server",
      "enabled": true
    }
  }
}
```

### 2. Start Language Servers

You need to run LSP servers for the languages you want to support. Here are some popular options:

#### Python (Pyright)

```bash
# Install pyright
npm install -g pyright

# Start pyright LSP server (example with WebSocket transport)
# You'll need to set up a WebSocket bridge for pyright
```

#### TypeScript/JavaScript

```bash
# Install typescript language server
npm install -g typescript-language-server

# Start the server with WebSocket transport
# You'll need to set up a WebSocket bridge
```

#### SQL

```bash
# Install SQL language server
npm install -g sql-language-server

# Start the server with WebSocket transport
```

### 3. WebSocket Transport Setup

Most LSP servers use stdio transport by default, but the CodeMirror LSP plugin requires WebSocket transport. You'll need to set up a bridge or use a server that supports WebSocket transport directly.

#### Option 1: Use a WebSocket Bridge

Create a simple WebSocket bridge that connects to your LSP server:

```javascript
// Example WebSocket bridge for pyright
const WebSocket = require("ws");
const { spawn } = require("child_process");

const wss = new WebSocket.Server({ port: 3001 });

wss.on("connection", (ws) => {
  const pyright = spawn("pyright", ["--stdio"]);

  ws.on("message", (data) => {
    pyright.stdin.write(data);
  });

  pyright.stdout.on("data", (data) => {
    ws.send(data);
  });

  pyright.stderr.on("data", (data) => {
    console.error("Pyright error:", data.toString());
  });
});
```

#### Option 2: Use LSP Servers with WebSocket Support

Some LSP servers support WebSocket transport directly. Check the documentation for your specific language server.

### 4. Enable LSP in Anode

LSP is enabled by default in the code cells. The system will automatically:

1. Check if an LSP server is configured for the current language
2. Connect to the LSP server if available
3. Provide enhanced editing features

## Configuration

### Server Configuration

Each language server can be configured with:

- `url`: WebSocket URL for the LSP server
- `description`: Human-readable description
- `enabled`: Whether this server should be used

### Global Settings

- `enableLSP`: Master switch for LSP functionality
- `allowHTMLContent`: Allow HTML content in tooltips
- `keyboardShortcuts`: Customize keyboard shortcuts

## Troubleshooting

### LSP Not Working

1. Check that the LSP server is running and accessible
2. Verify the WebSocket URL in your configuration
3. Check the browser console for connection errors
4. Ensure the language server supports the features you're trying to use

### Performance Issues

1. LSP servers can be resource-intensive
2. Consider disabling LSP for large files or notebooks
3. Use appropriate server configurations for your system

### Connection Errors

1. Verify the WebSocket URL is correct
2. Check firewall settings
3. Ensure the LSP server is running
4. Check for CORS issues if running on different ports

## Development

### Adding New Language Support

1. Add the language configuration to `lsp-servers.json`
2. Update the `LSP_SERVERS` configuration in `src/components/notebook/codemirror/lspConfig.ts`
3. Add the file extension mapping in `src/util/documentUri.ts`

### Customizing LSP Behavior

You can customize LSP behavior by modifying:

- `src/components/notebook/codemirror/lspConfig.ts` - Server configurations
- `src/components/notebook/codemirror/baseExtensions.ts` - Extension setup
- `src/util/documentUri.ts` - Document URI generation

## Security Considerations

- LSP servers run locally and have access to your code
- Only connect to trusted LSP servers
- Be cautious with LSP servers that require network access
- Consider using sandboxed environments for untrusted code

## Examples

### Python Development

```python
# With LSP enabled, you'll get:
# - Autocompletion for Python standard library
# - Error checking for syntax and type errors
# - Go-to-definition for functions and classes
# - Hover documentation

import pandas as pd
import numpy as np

# LSP will provide autocompletion for pandas methods
df = pd.DataFrame({'a': [1, 2, 3]})
df.head()  # Hover to see documentation
```

### TypeScript/JavaScript Development

```typescript
// With LSP enabled, you'll get:
// - Type checking
// - Autocompletion for libraries
// - Refactoring suggestions

interface User {
  id: number;
  name: string;
}

const user: User = {
  id: 1,
  name: "John", // LSP will catch type errors
};
```

## Further Reading

- [Language Server Protocol Specification](https://microsoft.github.io/language-server-protocol/)
- [CodeMirror LSP Plugin Documentation](https://github.com/marimo-team/codemirror-languageserver)
- [Pyright Documentation](https://github.com/microsoft/pyright)
- [TypeScript Language Server](https://github.com/typescript-language-server/typescript-language-server)
