# PM2 Development Setup

This setup uses PM2 to manage your development processes and automatically watch for changes in the schema.

## What it does

1. **Watches** `../runt/packages/schema/mod.ts` for changes
2. **Automatically runs** these commands when the file changes:
   - `rm -rf node_modules/.vite` (clears Vite cache)
   - `pnpm install @runt/schema@file:../runt/packages/schema` (updates schema package)
3. **Restarts** the development processes:
   - `pnpm run dev`
   - `pnpm run dev:sync`

## Quick Start

```bash
# Start all processes
./start-dev.sh

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
pm2 logs anode-dev
pm2 logs anode-sync
pm2 logs file-watcher

# Restart all processes
pm2 restart all

# Stop all processes
pm2 stop all

# Delete all processes
pm2 delete all
```

## Process Names

- `anode-dev`: Runs `pnpm run dev`
- `anode-sync`: Runs `pnpm run dev:sync`
- `file-watcher`: Monitors the schema file

## Files Created

- `ecosystem.config.json`: PM2 configuration
- `watch-script.js`: File watching and command execution logic
- `start-dev.sh`: Convenience script to start everything

## Troubleshooting

If the file watcher isn't working:

1. Check if the file path exists: `ls -la ../runt/packages/schema/mod.ts`
2. Check PM2 logs: `pm2 logs file-watcher`
3. Restart the file watcher: `pm2 restart file-watcher`

## Manual Testing

To test the file watcher manually, you can touch the watched file:

```bash
touch ../runt/packages/schema/mod.ts
```

This should trigger the update process and restart the development servers.
