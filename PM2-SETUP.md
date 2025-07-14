# PM2 Development Setup

This setup uses PM2 to manage your development processes and automatically watch for changes in the schema.

## Quick Start

```bash
# Start all processes
pnpm dev

# Or manually start with PM2
pm2 start ecosystem.config.json
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

## Process Names

- `web`: Runs `pnpm run dev:web` (Vite development server on port 5173)
- `sync`: Runs `pnpm run dev:sync` (Wrangler development server)
- `nb`: Runs `./scripts/start-runtime.sh` (Deno runtime agent with unique notebook ID)
- `watcher`: Monitors the schema file and triggers updates

## Runtime Process Details

The `nb` process runs `scripts/start-runtime.sh` which:

- Sets `DEV_PORT=5173`
- Generates a unique notebook ID using timestamp and random hex
- Opens a browser tab to `http://localhost:5173/?notebook=$NOTEBOOK_ID`
- Starts the Deno runtime agent with debug logging

## Troubleshooting

If the file watcher isn't working:

1. Check if the file path exists: `ls -la ../runt/packages/schema/mod.ts`
2. Check PM2 logs: `pm2 logs watcher`
3. Restart the file watcher: `pm2 restart watcher`

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
pm2 stop all && pm2 delete all && pnpm dev
```

### Types not updating in VSCode

When you have the watcher from PM2 running, and update the schema, you won't see types reflected in VSCode. For example, updating a table column name in the schema in the `runt` repo, you won't see VSCode show a type error for the wrong column name. Open the VSCode command palette and run "TypeScript: Restart TS Server".

## Caveats

Clicking the "+ Notebook" button the browser won't work well in development. You won't get a new notebook backend and running it manually means you won't get any benefits from PM2 orhestration. To create a new notebook, it's often easier to do this:

```bash
pm2 restart all
```
