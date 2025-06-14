# Anode

A real-time collaborative notebook system built with LiveStore event sourcing.

**Current Status: ✅ FULLY OPERATIONAL** - Python code execution working end-to-end with reactive architecture.

## Architecture

- **Schema Package** (`@anode/schema`): LiveStore schema definitions
- **Web Client** (`@anode/web-client`): React-based web interface  
- **Document Worker** (`@anode/docworker`): Cloudflare Worker for sync backend
- **Kernel Client** (`@anode/dev-server-kernel-ls-client`): Python execution server

### Key Design
- Each notebook = one LiveStore store (`NOTEBOOK_ID = STORE_ID`)
- Execution queue system: `pending` → `assigned` → `executing` → `completed`
- **Reactive kernel architecture** using LiveStore's `queryDb` subscriptions
- Manual kernel management (start one per notebook)

## Quick Start

### 1. Start Core Services
```bash
pnpm install
pnpm dev  # Starts web client + sync backend
```

### 2. Create Notebook
1. Open http://localhost:5173
2. URL gets notebook ID: `?notebook=notebook-123-abc`
3. Create cells and edit

### 3. Enable Python Execution
```bash
# In new terminal - use your actual notebook ID
NOTEBOOK_ID=notebook-123-abc pnpm dev:kernel
```

### 4. Execute Code
- Add code cell in web interface
- Write Python: `import random; random.random()`
- Press Ctrl+Enter or click Run
- See results appear in real-time

## What's Working

- ✅ Real-time collaborative editing
- ✅ Python code execution via Pyodide
- ✅ Event sourcing and sync
- ✅ **Reactive work queue management** (instant response)
- ✅ Multiple isolated notebooks
- ✅ Output generation and display
- ✅ Zero-latency execution (no polling delays)

## Development Commands

```bash
# Core development
pnpm dev                              # Start web + sync
NOTEBOOK_ID=your-id pnpm dev:kernel   # Start kernel

# Utilities
pnpm reset-storage                    # Clear all data
pnpm build:schema                     # Build schema after changes

# Individual services
pnpm dev:web-only                     # Web client only
pnpm dev:sync-only                    # Sync backend only
```

## Project Structure

```
packages/
├── schema/                    # LiveStore events and tables
├── web-client/               # React notebook interface
├── docworker/                # Cloudflare Workers sync
└── dev-server-kernel-ls-client/  # Python kernel process
```

## Architecture Notes

**Simplified Schema**: Removed all timestamp fields to eliminate complexity and database errors. Simple schemas are more reliable for prototypes.

**Reactive Over Polling**: Kernels use LiveStore's `queryDb` reactive subscriptions for instant work detection. No more polling delays - executions start immediately when cells are run.

**One Store Per Notebook**: Each notebook gets its own LiveStore database for clean isolation.

## Troubleshooting

**Build failures**: Run `pnpm build:schema` first
**Execution not working**: Start kernel with correct `NOTEBOOK_ID`
**Stale state**: Run `pnpm reset-storage`
**Slow execution**: Should be instant with reactive architecture - check kernel logs for errors

## Next Steps

1. Clean up tests (remove timestamp field references)
2. Add error recovery for kernel restarts  
3. Improve kernel lifecycle management
4. Add proper authentication

The system provides a solid foundation for collaborative notebook execution with **instant reactive execution** and can be extended incrementally.