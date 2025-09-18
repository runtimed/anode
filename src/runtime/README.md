# Console Runtime Launcher

A simple utility for launching and experimenting with runtime agents directly from the Chrome DevTools console. No registry abstractions, no providers - just direct `RuntimeAgent` creation for rapid experimentation.

## Overview

This launcher provides a minimal interface to create and manage runtime agents using `@runtimed/agent-core` directly. It's designed for:

- **Rapid experimentation** with runtime agents
- **Debugging** agent behavior without UI complexity  
- **Testing** new execution handlers
- **Learning** how `RuntimeAgent` works

## Quick Start

1. **Navigate to any notebook** (e.g., `http://localhost:5173/notebook/some-id`)

2. **Open Chrome DevTools** (F12)

3. **Check launcher status**:
   ```javascript
   window.__RUNT_LAUNCHER__.getStatus()
   ```

4. **Launch HTML runtime agent**:
   ```javascript
   await window.__RUNT_LAUNCHER__.launchHtmlAgent()
   ```

5. **Create and run an HTML cell** - it will execute through your agent!

## Available Commands

### `window.__RUNT_LAUNCHER__.getStatus()`
Returns current launcher state:
```javascript
{
  hasAgent: true,
  agentType: "html",
  sessionId: "console-html-abc123-1234567890",
  notebookId: "notebook-xyz", 
  storeConnected: true,
  authConfigured: true,
  error: null
}
```

### `await window.__RUNT_LAUNCHER__.launchHtmlAgent()`
Launches HTML runtime agent:
- **Capabilities**: HTML code execution
- **Handler**: Renders HTML directly using `context.display()`
- **Returns**: `RuntimeAgent` instance

### `await window.__RUNT_LAUNCHER__.launchPythonAgent()`  
Launches Python runtime agent placeholder:
- **Capabilities**: Full Python + AI + SQL (placeholder)
- **Handler**: Currently logs execution (would delegate to external agent)
- **Returns**: `RuntimeAgent` instance

### `await window.__RUNT_LAUNCHER__.shutdown()`
Shuts down the current runtime agent cleanly.

### `window.__RUNT_LAUNCHER__.getCurrentNotebookId()`
Returns notebook ID from current URL, or `null` if not in a notebook.

## Usage Examples

### Basic HTML Execution
```javascript
// Launch HTML agent
const agent = await window.__RUNT_LAUNCHER__.launchHtmlAgent();

// Create a cell with HTML content
// (use notebook UI to create cell with HTML code)

// Agent will automatically execute the cell when you run it
```

### Debugging Agent State  
```javascript
// Get detailed status
const status = window.__RUNT_LAUNCHER__.getStatus();
console.log('Agent status:', status);

// Access the agent directly (if active)
const agent = window.__RUNT_LAUNCHER__.currentAgent;
console.log('Runtime config:', agent?.config);
console.log('Session ID:', agent?.sessionId);
```

### Multiple Agent Testing
```javascript
// Test different agent types
await window.__RUNT_LAUNCHER__.launchHtmlAgent();
// ... test HTML execution ...

await window.__RUNT_LAUNCHER__.launchPythonAgent(); 
// ... test Python execution (placeholder) ...

await window.__RUNT_LAUNCHER__.shutdown();
```

## Architecture

```
Console Launcher
├── ConsoleLauncher class
│   ├── Manages single active RuntimeAgent
│   ├── Handles LiveStore connection
│   └── Provides execution handlers
├── Execution Handlers
│   ├── HTML handler (renders HTML via context.display)
│   └── Python handler (placeholder)  
└── Auto-setup (in notebook pages)
    ├── Injects LiveStore instance
    ├── Configures authentication
    └── Exposes global launcher API
```

## Execution Flow

1. **Agent Creation**: Uses `RuntimeAgent` from `@runtimed/agent-core`
2. **Configuration**: Creates `RuntimeConfig` with notebook/auth details
3. **Handler Registration**: Registers execution handler for cell types
4. **LiveStore Integration**: Connects to existing store via adapter
5. **Execution**: Processes execution queue events, calls handlers

## Adding Custom Execution Handlers

```javascript
// Example: Custom JavaScript execution handler
function createJsExecutionHandler() {
  return async (context) => {
    const { cell } = context;
    
    if (cell.cellType !== "code") {
      return { success: false, error: "JS handler only supports code cells" };
    }
    
    try {
      // Execute JavaScript code
      const result = eval(cell.source);
      
      // Display result
      await context.display({
        "text/plain": String(result),
        "application/json": result,
      });
      
      return { success: true };
    } catch (error) {
      context.error("JavaScriptError", error.message, []);
      return { success: false, error: error.message };
    }
  };
}

// Use it:
const agent = new RuntimeAgent(config, capabilities);
agent.onExecution(createJsExecutionHandler());
await agent.start();
```

## Troubleshooting

### "No notebook ID found in URL"
- Ensure you're on a notebook page (`/notebook/{id}`)
- Check URL format: `http://localhost:5173/notebook/notebook-xyz`

### "No LiveStore instance"  
- Ensure you're in a notebook page where LiveStore is initialized
- Try refreshing the page
- Check browser console for setup messages

### "No authentication configured"
- Auto-setup should handle this in notebook pages
- Manually configure: `window.__RUNT_LAUNCHER__.setAuth(userId, token)`

### "Agent fails to start"
- Check if dev sync server is running: `pnpm dev:sync`  
- Verify WebSocket connection to `ws://localhost:8787`
- Check browser network tab for connection errors

## Development Debug Commands

```javascript
// Debug authentication state
window.__RUNT_DEBUG__.debugAuth();

// Access launcher instance directly
window.__RUNT_DEBUG__.launcher;

// Check LiveStore connection
window.__RUNT_LAUNCHER__.getStatus().storeConnected;
```

## Architecture Benefits

- **No Abstractions**: Direct `RuntimeAgent` usage, minimal wrapper
- **No Registry**: Single active agent, simple state management  
- **No Providers**: Uses existing LiveStore connection
- **Fast Iteration**: Immediate agent creation and testing
- **Console-First**: Built for DevTools experimentation

## Next Steps

This launcher is perfect for:

1. **Testing new execution handlers** before building UI
2. **Debugging agent behavior** in isolation
3. **Experimenting with RuntimeAgent features** 
4. **Prototyping agent capabilities** rapidly

Once you validate agent behavior here, you can build proper UI integration using the same `RuntimeAgent` patterns.