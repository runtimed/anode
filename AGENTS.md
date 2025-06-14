# AI Agent Development Context

This document provides essential context for AI assistants working on the Anode project.

## Project Overview

Anode is a real-time collaborative notebook system built on LiveStore, an event-sourcing based local-first data synchronization library. The project uses a monorepo structure with TypeScript and pnpm workspaces.

**Current Status**: The system is fully operational with working Python code execution using a breakthrough reactive architecture.

## Architecture

- **Schema Package** (`@anode/schema`): LiveStore schema definitions (events, state, materializers)
- **Web Client** (`@anode/web-client`): React-based web interface
- **Document Worker** (`@anode/docworker`): Cloudflare Worker for sync backend
- **Kernel Client** (`@anode/dev-server-kernel-ls-client`): Python execution server (manual start per notebook)

## Key Dependencies

- **LiveStore**: Event-sourcing library for local-first apps
- **Effect**: Functional programming library for TypeScript
- **React**: UI framework
- **TypeScript**: Primary language

## Current Architecture (December 2024)

### **Simplified Notebook/Store Relationship**
- `NOTEBOOK_ID = STORE_ID`: Each notebook gets its own LiveStore database
- URL routing: Access notebooks via `?notebook=notebook-id`
- Single notebook per store eliminates data boundary confusion
- All events naturally scoped to one notebook

### **Reactive Execution Queue System**
- Flow: `executionRequested` → `executionAssigned` → `executionStarted` → `executionCompleted`
- **Kernels use reactive `queryDb` subscriptions** for instant work detection (no polling)
- **Zero-latency execution** - cells execute immediately when run
- Session-based assignment for future auth enforcement
- Currently working end-to-end with lightning-fast response

### **Kernel Session Tracking**
- Each kernel restart gets unique `sessionId`
- 30-second heartbeat mechanism
- Session IDs tracked in execution queue
- Manual kernel management (start one per notebook)

## Development Setup

### Common Commands
```bash
# Start core services (web + sync)
pnpm dev

# Start kernel for specific notebook (manual)
NOTEBOOK_ID=notebook-123-abc pnpm dev:kernel

# Individual services
pnpm dev:web-only
pnpm dev:sync-only

# Development utilities
pnpm reset-storage  # Clear all local storage
pnpm build:schema   # Required after schema changes
```

## Current Working State

### ✅ What's Working
- Kernel startup and registration
- Event sequencing without conflicts
- **Instant reactive work queue management** (zero polling delays)
- Python code execution via Pyodide
- Output generation and storage
- Multiple notebooks with isolated kernels
- **Real-time reactive subscriptions** using LiveStore's `queryDb`
- **Lightning-fast execution response** with proper race condition handling

### ⚠️ Known Issues
- Tests need cleanup (reference removed timestamp fields) - partially resolved
- Manual kernel lifecycle management
- No authentication (insecure tokens)

## Important Considerations

### Schema Design
- Schema package must be built before dependent packages can consume changes
- Single `notebook` table per store (not `notebooks`)
- `kernelSessions` and `executionQueue` tables for lifecycle management
- **No timestamp fields** - eliminated for simplicity and stability

### Local-First Architecture
- All data operations happen locally first
- Events synced across clients via document worker
- SQLite provides local reactive state per notebook
- Network connectivity optional

### Code Style
- Prefer functional programming patterns (Effect library)
- Event sourcing over direct state mutations
- Reactive queries over imperative data fetching
- TypeScript strict mode enabled

## File Structure
```
anode/
├── packages/
│   ├── schema/           # LiveStore schema definitions
│   ├── web-client/       # React web application
│   ├── docworker/        # Cloudflare Worker sync backend
│   └── dev-server-kernel-ls-client/  # Python kernel server
├── start-dev.sh          # Development startup script
├── reset-local-storage.cjs  # Clean development state
├── package.json          # Root workspace configuration
└── pnpm-workspace.yaml   # Dependency catalog
```

## Troubleshooting

### Common Issues
- **Build failures**: Run `pnpm build:schema` first
- **Sync issues**: Check document worker deployment
- **Execution not working**: Start kernel manually with `NOTEBOOK_ID=your-notebook-id pnpm dev:kernel`
- **Stale state**: Run `pnpm reset-storage` to clear everything

### Debugging
- Browser console for client-side issues
- Wrangler logs for worker debugging
- Terminal output for kernel server issues
- Comprehensive logging in kernel for execution flow

## Notes for AI Assistants

### Current State
- **Reactive execution flow** working with instant response
- Manual kernel management (one per notebook)
- Simplified schema without timestamps
- Each notebook = separate LiveStore database for isolation
- **Breakthrough reactive architecture** using LiveStore's intended design patterns

### Communication Style
- Use authentic developer voice - uncertainty is fine, just be explicit
- Show honest assessment of current state vs future goals
- Acknowledge rough edges rather than polishing everything
- Write like documenting for teammates, not marketing
- Be concise but complete

### Key Insights for Development
- Simple schemas beat complex ones for prototypes
- **Reactive subscriptions are superior to polling** when implemented correctly with proper race condition handling
- Database query/schema alignment is critical
- Initial sync timing matters for event sequencing
- Comprehensive logging helps debug distributed systems
- **Event deferral** (`setTimeout(..., 0)`) resolves LiveStore reactive system conflicts
- **Zero-latency execution** is achievable with LiveStore's reactive `queryDb` subscriptions

The system provides a solid foundation for collaborative notebook execution and can be extended incrementally.