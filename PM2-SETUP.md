# PM2 Development Setup

**Note**: This is an alternative development setup using PM2 process management. The default recommended workflow is to use the integrated development server with `pnpm dev`, but PM2 offers additional features like automatic incognito window launching and process orchestration.

## Current Recommended Workflow

```bash
# Start integrated development server (recommended)
pnpm dev

# In a different terminal, run the sync engine
pnpm dev:sync

# Start Python runtime (get command from notebook UI)
NOTEBOOK_ID=your-notebook-id pnpm dev:runtime
```

## PM2 Setup

This setup uses PM2 to manage your development processes and automatically watch for changes in the schema.

### Quick Start

Install pm2 globally. Although it's possible to use `pm2` without installing, it's much more annoying. Running commands like `pm2 logs` or `pm2 delete all` are common workflows. If you don't want to use the global, you can do `pnpm exec pm2 <whatever>`.

```bash
pnpm add -g pm2
# or with npm
npm install -g pm2
```

```bash
# Start all processes
pnpm dev:pm2

# Or manually start with PM2
pm2 start ecosystem.config.json

# Use different port if needed
ANODE_DEV_SERVER_PORT=5174 pnpm dev:pm2
```

## PM2 Commands

```bash
# View status of all processes
pm2 status

# View logs
pm2 logs

# View logs for specific process
pm2 logs web
pm2 logs sync
pm2 logs nb
pm2 logs watcher

# Restart all processes
pm2 restart all

# Stop all processes
pm2 stop all

# Delete all processes
pm2 delete all
```

### Process Names

- `web`: Runs `pnpm run dev` (Vite development server with integrated Cloudflare Workers on port 5173)
- `sync`: Runs `pnpm run dev:sync` (Cloudflare Worker backend on port 8787)
- `nb`: Runs `./scripts/start-nb.sh` (Deno runtime agent with unique notebook ID)
- `watcher`: Monitors the schema file and triggers updates

### Runtime Process Details

The `nb` process runs `scripts/start-nb.sh` which:

- Sets `DEV_PORT=5173`
- Generates a unique notebook ID using timestamp and random hex
- Opens a browser tab to `http://localhost:5173/?notebook=$NOTEBOOK_ID`
- Starts the Deno runtime agent with debug logging

### Architecture Options

#### Integrated Server (Default)

The `web` process runs an integrated server that includes:

- Frontend assets (React app)
- Backend API (Cloudflare Workers runtime)
- WebSocket sync (`/livestore`)
- Artifact storage endpoints

No separate sync server is needed thanks to the Cloudflare Vite plugin integration.

#### Separate Sync Server (PM2)

When using PM2, you can optionally run a separate sync server:

- `web`: Frontend only (Vite dev server on port 5173)
- `sync`: Backend API (Cloudflare Worker on port 8787)

This separation can be useful for debugging backend issues or when you need to run the backend independently.

### Port Configuration

By default, the integrated server runs on port 5173. To use a different port:

```bash
ANODE_DEV_SERVER_PORT=5174 pnpm dev:pm2
```

## PM2 vs Integrated Server

### Integrated Server (`pnpm dev`)

- **Simplified workflow**: Single command to start everything
- **Hot reload stability**: Environment file changes are ignored to prevent crashes
- **Better error handling**: Unified error reporting and recovery
- **Faster startup**: No PM2 overhead or process coordination

### PM2 Advantages

- **Automatic browser launching**: Opens incognito windows for testing
- **Schema development**: Automatic restarts when schema changes
- **Process isolation**: Better debugging with separate process logs
- **Development orchestration**: Running multiple notebooks simultaneously
- **Process management**: Easy restart, stop, and monitoring of services

## Troubleshooting

If the file watcher isn't working:

1. Check if the file path exists: `ls -la ../runt/packages/schema/mod.ts`
2. Check PM2 logs: `pm2 logs watcher`
3. Restart the file watcher: `pm2 restart watcher`

### Manual Testing

To test the file watcher manually, you can touch the watched file:

```bash
touch ../runt/packages/schema/mod.ts
```

This should trigger the update process and restart the development servers.

### Development Workflow

1. **Start development**: `pnpm dev:pm2`
2. **Make changes** to `../runt/packages/schema/mod.ts`
3. **Auto-restart**: The watcher automatically updates dependencies and restarts services
4. **Browser**: Automatically refreshes with new changes

### Additional Troubleshooting

### `"cannot create file"` error in web browser console

Fix: `pm2 restart all`

Not sure why this happens, but restarting

### `"Something went wrong - this should never happen"` in LiveStore devtools

If you see this in the LiveStore devtools...

```
Something went wrong - this should never happen:
[@livestore/react:useQuery] Error running query: LiveStore.SqliteError
```

Close the incognito tabs and run:

```bash
pm2 stop all && pm2 delete all && pnpm dev:pm2
```

### Types not updating in VSCode

When you have the watcher from PM2 running, and update the schema, you won't see types reflected in VSCode. For example, updating a table column name in the schema in the `runt` repo, you won't see VSCode show a type error for the wrong column name. Open the VSCode command palette and run "TypeScript: Restart TS Server".

### Things won't update, or you're getting confusing errors

Make sure you only have an incognito window (or Chrome profile) with no other anode tabs. Once you close all tabs, do a hard refresh of the notebook (press **Ctrl+Shift+R** or **Cmd+Shift+R** in your browser).

### Caveats

Clicking the "+ Notebook" button the browser won't work well in development. You won't get a new notebook backend and running it manually means you won't get any benefits from PM2 orchestration. To create a new notebook, it's often easier to do this:

```bash
pm2 restart all
```

## Switching Between PM2 and Integrated Server

### From PM2 to Integrated Server

1. **Stop PM2 processes**: `pm2 stop all && pm2 delete all`
2. **Start integrated server**: `pnpm dev`
3. **Start runtime manually**: Get command from notebook UI, then run `NOTEBOOK_ID=your-id pnpm dev:runtime`

### From Integrated Server to PM2

1. **Stop integrated server**: `Ctrl+C` in the terminal
2. **Start PM2**: `pnpm dev:pm2`
3. **Runtime starts automatically**: PM2 handles runtime startup and browser launching

Both approaches provide the same core functionality with different management styles.
