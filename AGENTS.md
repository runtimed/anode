# AI Agent Development Context

This document provides essential context for AI assistants working on the Anode project.

## Project Overview

Anode is a real-time collaborative notebook system built on LiveStore, an event-sourcing based local-first data synchronization library. The project uses a monorepo structure with TypeScript and pnpm workspaces.

## Architecture

- **Schema Package** (`@anode/schema`): Contains LiveStore schema definitions (events, state, materializers)
- **Web Client** (`@anode/web-client`): React-based web interface
- **Document Worker** (`@anode/docworker`): Cloudflare Worker for sync backend
- **Kernel Client** (`@anode/dev-server-kernel-ls-client`): Python execution server (manual start per notebook)

## Key Dependencies

The project heavily relies on:
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

### **Execution Queue System**
- Replaced direct event processing with proper work queue
- Flow: `executionRequested` → `executionAssigned` → `executionStarted` → `executionCompleted`
- Kernels claim work from queue instead of processing all events
- Session-based assignment for future auth enforcement

### **Kernel Session Tracking**
- Each kernel restart gets unique `sessionId`
- 30-second heartbeat mechanism
- Session IDs tracked in execution queue
- **Future**: Document worker will validate kernel permissions

## LiveStore Documentation

For LiveStore-specific questions, reference the complete documentation:
```
@fetch https://docs.livestore.dev/llms-full.txt
```

This provides comprehensive information about:
- Event sourcing patterns
- Schema definitions and materializers
- Reactive queries and state management
- Sync providers and adapters
- Platform-specific implementations

## Development Setup

### Package Dependencies
- Packages use `workspace:*` for internal dependencies
- External dependencies managed via pnpm catalog in `pnpm-workspace.yaml`
- TypeScript project references configured for efficient builds

### Build System
Two approaches available:
1. **Watch Mode**: `pnpm dev` - Individual package watchers
2. **Project References**: `pnpm dev:tsc` - TypeScript incremental builds

### Common Commands
```bash
# Start core services (web + sync)
./start-dev.sh
# OR
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

## Important Considerations

### Schema Changes
- Schema package must be built before dependent packages can consume changes
- **Current**: Single `notebook` table per store (not `notebooks`)
- Added `kernelSessions` and `executionQueue` tables for lifecycle management
- Event schema changes require backwards compatibility

### Local-First Architecture
- All data operations happen locally first
- Events are synced across clients via the document worker
- SQLite provides local reactive state per notebook
- Network connectivity is optional
- **Current**: Manual kernel lifecycle management

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
│   └── dev-server-kernel-ls-client/  # Python kernel server (manual)
├── start-dev.sh          # Development startup script
├── reset-local-storage.cjs  # Clean development state
├── package.json          # Root workspace configuration
└── pnpm-workspace.yaml   # Dependency catalog
```

## Troubleshooting

### Common Issues
- **Build failures**: Ensure schema is built first (`pnpm build:schema`)
- **Type errors**: Fixed - proper TypeScript throughout codebase
- **Runtime errors**: Verify LiveStore adapter configuration
- **Sync issues**: Check document worker deployment
- **Execution not working**: Start kernel manually with `NOTEBOOK_ID=your-notebook-id pnpm dev:kernel`
- **Stale state**: Run `pnpm reset-storage` to clear everything

### Debugging
- Use LiveStore devtools for state inspection
- Browser console for client-side issues
- Wrangler logs for worker debugging
- Terminal output for kernel server issues

## Notes for AI Assistants

- This is exploratory/prototype code - avoid marketing language
- Focus on technical implementation over feature descriptions
- Reference LiveStore docs for event-sourcing patterns
- Consider backwards compatibility for schema changes
- **Current state**: Manual kernel management, basic execution queue working
- **Known issues**: LiveStore reactivity errors, no kernel permission enforcement yet
- Each notebook = separate LiveStore database for isolation

### Communication Style
- Use authentic developer voice - "beginnings at least...", "note: we can use X in future", uncertainty is fine just be explicit
- Show honest assessment of current state vs. aspirational goals
- Acknowledge rough edges and incomplete work rather than polishing everything
- Write like you're documenting for teammates, not marketing to users
- Be concise but complete - cover what matters without being verbose
