# PM2 Development Setup

This setup uses PM2 to manage your development processes and automatically watch for changes in the schema.

## Quick Start

```bash
# Start all processes
pnpm dev:pm2

# Or manually start with PM2
pnpm exec pm2 start ecosystem.config.json

# Use different port if needed
ANODE_DEV_SERVER_PORT=5174 pnpm dev:pm2
```

## PM2 Commands

```bash
# View status of all processes
pnpm exec pm2 status

# View logs
pnpm exec pm2 logs

# View logs for specific process
pnpm exec pm2 logs web
pnpm exec pm2 logs nb
pnpm exec pm2 logs watcher

# Restart all processes
pnpm exec pm2 restart all

# Stop all processes
pnpm exec pm2 stop all

# Delete all processes
pnpm exec pm2 delete all
```

## Process Names

- `web`: Runs `pnpm run dev` (Vite development server with integrated Cloudflare Workers on port 5173)
- `nb`: Runs `./scripts/start-runtime.sh` (Deno runtime agent with unique notebook ID)
- `watcher`: Monitors the schema file and triggers updates

## Runtime Process Details

The `nb` process runs `scripts/start-runtime.sh` which:

- Sets `DEV_PORT=5173`
- Generates a unique notebook ID using timestamp and random hex
- Opens a browser tab to `http://localhost:5173/?notebook=$NOTEBOOK_ID`
- Starts the Deno runtime agent with debug logging

## Single-Server Architecture

The `web` process now runs an integrated server that includes:

- Frontend assets (React app)
- Backend API (Cloudflare Workers runtime)
- WebSocket sync (`/livestore`)
- Artifact storage endpoints

No separate sync server is needed thanks to the Cloudflare Vite plugin integration.

## Port Configuration

By default, the integrated server runs on port 5173. To use a different port:

```bash
ANODE_DEV_SERVER_PORT=5174 pnpm dev:pm2
```

## Troubleshooting

If the file watcher isn't working:

1. Check if the file path exists: `ls -la ../runt/packages/schema/mod.ts`
2. Check PM2 logs: `pnpm exec pm2 logs watcher`
3. Restart the file watcher: `pnpm exec pm2 restart watcher`

## Manual Testing

To test the file watcher manually, you can touch the watched file:

```bash
touch ../runt/packages/schema/mod.ts
```

This should trigger the update process and restart the development servers.

## Development Workflow

1. **Start development**: `pnpm run dev`
2. **Make changes** to `../runt/packages/schema/mod.ts`
3. **Auto-restart**: The watcher automatically updates dependencies and restarts services
4. **Browser**: Automatically refreshes with new changes

## Troubleshooting

### `"cannot create file"` error in web browser console

Fix: `pnpm exec pm2 restart all`

Not sure why this happens, but restarting

### `"Something went wrong - this should never happen"` in LiveStore devtools

If you see this in the LiveStore devtools...

```
Something went wrong - this should never happen:
[@livestore/react:useQuery] Error running query: LiveStore.SqliteError
```

Close the incognito tabs and run:

```bash
pnpm exec pm2 stop all && pnpm exec pm2 delete all && pnpm dev:pm2
```

### Types not updating in VSCode

When you have the watcher from PM2 running, and update the schema, you won't see types reflected in VSCode. For example, updating a table column name in the schema in the `runt` repo, you won't see VSCode show a type error for the wrong column name. Open the VSCode command palette and run "TypeScript: Restart TS Server".

### Things won't update, or you're getting confusing errors

Make sure you only have an incognito window (or Chrome profile) with no other anode tabs. Once you close all tabs, do a hard refresh of the notebook (press **Ctrl+Shift+R** or **Cmd+Shift+R** in your browser).

## Caveats

Clicking the "+ Notebook" button the browser won't work well in development. You won't get a new notebook backend and running it manually means you won't get any benefits from PM2 orhestration. To create a new notebook, it's often easier to do this:

```bash
pnpm exec pm2 restart all
```
