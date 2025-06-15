# AI Agent Development Context

This document provides essential context for AI assistants working on the Anode project.

## Project Overview

Anode is a real-time collaborative notebook system built on LiveStore, an event-sourcing based local-first data synchronization library. The project uses a monorepo structure with TypeScript and pnpm workspaces.

**Current Status**: Fully operational with zero-latency Python execution.

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

## Current Architecture - Fully Operational

### **Simplified Notebook/Store Relationship**
- `NOTEBOOK_ID = STORE_ID`: Each notebook gets its own LiveStore database
- URL routing: Access notebooks via `?notebook=notebook-id`
- Single notebook per store eliminates data boundary confusion
- All events naturally scoped to one notebook

### **Reactive Execution Queue System**
- Flow: `executionRequested` → `executionAssigned` → `executionStarted` → `executionCompleted`
- **Kernels use reactive `queryDb` subscriptions** for instant work detection (no polling)
- **Zero-latency execution** - cells execute immediately when run
- Session-based assignment with auth enforcement planned
- **Fully operational** - working end-to-end with lightning-fast response

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
## What's Working ✅

- ✅ **Instant Python execution** with zero polling delays
- ✅ **Real-time collaboration** across multiple users  
- ✅ **Reactive architecture** using LiveStore's `queryDb` subscriptions
- ✅ **Multiple isolated notebooks** with separate kernels
- ✅ **Rich output display** for Python results
- ✅ **Offline-first operation** with sync when connected
- ✅ **Event sourcing** for complete history and debugging
- ✅ **Session management** with kernel isolation
- ✅ **Comprehensive testing** (68 passing tests)

## Next Phase: AI Integration & UX Polish 🤖

**Priority Focus**: AI ↔ Python ↔ User interactions with fluid notebook UX

### Immediate Goals
- **Notebook UX Improvements** - Fluid cell navigation and Jupyter-like interaction
- **AI Cell Architecture** - Notebook-aware AI assistance
- **Code Completions** - LSP + kernel-based suggestions  
- **Authentication** - Google OAuth with session management
- **Kernel Lifecycle** - Automatic startup and management

### Current UX Issues to Address
- Click-to-edit model breaks notebook flow
- No keyboard navigation between cells (arrow keys)
- Heavy card UI feels cluttered vs clean notebook interfaces
- Hover-only controls are hard to discover
- Missing standard execution shortcuts (Shift+Enter, Ctrl+Enter)

### Technical Debt
- Manual kernel lifecycle management (being addressed)
- Authentication system (Google OAuth planned)
- Enhanced error handling and recovery
- Cell interaction model needs modernization

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

### Current State - Fully Operational
- **Zero-latency execution** with reactive architecture breakthrough
- Manual kernel management (automation planned)
- Simplified schemas for reliability and rapid development
- Each notebook = separate LiveStore database for clean isolation
- **Stable reactive architecture** leveraging LiveStore's capabilities
- Ready for AI integration and advanced features

### Communication Style
- Use authentic developer voice - uncertainty is fine, just be explicit
- Focus on AI ↔ Python ↔ User interaction goals
- Acknowledge current production readiness while planning next phase
- Emphasize technical achievements and breakthrough architecture
- Balance current capabilities with AI integration roadmap

### Key Insights for Development
- **Reactive architecture breakthrough** - Zero-latency execution achieved
- Simple schemas enable rapid prototyping and reliable operation
- Event sourcing provides excellent debugging and audit capabilities  
- Local-first design enables offline work and instant responsiveness
- **Proper event deferral** resolves LiveStore execution segment conflicts effectively
- Session-based kernel management enables clean isolation and scaling
- **AI integration readiness** - Architecture supports context-aware AI cells
- **UX modernization needed** - Current cell interaction model needs Jupyter-like fluidity

The system provides a **solid foundation** for AI-native collaborative notebooks and is positioned for the next phase of intelligent features.