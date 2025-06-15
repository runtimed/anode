# AI Agent Development Context

This document provides essential context for AI assistants working on the Anode project.

For current work state and immediate next steps, see `HANDOFF.md` - it focuses on where development was left off and what to work on next.

## Project Overview

Anode is a real-time collaborative notebook system built on LiveStore, an event-sourcing based local-first data synchronization library. The project uses a monorepo structure with TypeScript and pnpm workspaces.

**Current Status**: Fully operational with zero-latency Python execution and rich output rendering.

## Architecture

- **Shared Schema** (`shared/schema.ts`): LiveStore schema definitions (events, state, materializers) - TypeScript source file directly imported by all packages with full type inference
- **Web Client** (`@anode/web-client`): React-based web interface
- **Document Worker** (`@anode/docworker`): Cloudflare Worker for sync backend
- **Kernel Client** (`@anode/dev-server-kernel-ls-client`): Python execution server (manual start per notebook)

## Key Dependencies

- **LiveStore**: Event-sourcing library for local-first apps
- **Effect**: Functional programming library for TypeScript
- **React**: UI framework
- **TypeScript**: Primary language

## Current Working State

### What's Working ✅
- ✅ **Instant Python execution** with zero polling delays
- ✅ **Rich output rendering** - HTML tables, SVG plots, markdown, JSON
- ✅ **Pandas DataFrames** with styled HTML table output
- ✅ **Matplotlib plots** as crisp SVG vector graphics
- ✅ **Real-time collaboration** across multiple users  
- ✅ **AI cell integration** with mock responses and markdown rendering
- ✅ **Offline-first operation** with sync when connected
- ✅ **Comprehensive testing** (60 passing tests)

### Core Architecture Features
- `NOTEBOOK_ID = STORE_ID`: Each notebook gets its own LiveStore database
- **Reactive execution**: `executionRequested` → `executionAssigned` → `executionStarted` → `executionCompleted`
- **Zero-latency**: Kernels use reactive `queryDb` subscriptions for instant work detection
- **Session-based kernels**: Each kernel restart gets unique `sessionId`

## Development Commands

```bash
# Start core services (web + sync)
pnpm dev

# Start kernel for specific notebook (manual)
NOTEBOOK_ID=notebook-123-abc pnpm dev:kernel

# Utilities
pnpm reset-storage  # Clear all local storage
```

## Next Phase: Real AI Integration

**Priority Focus**: Replace mock AI responses with real API integration

### Immediate Goals
- **Real AI API Integration** - OpenAI, Anthropic, local model calls
- **Automatic Kernel Management** - One-click notebook startup
- **Authentication System** - Google OAuth with proper session management
- **Code Completions** - LSP + kernel-based suggestions
- **SQL Cell Implementation** - Real database connections

## Important Considerations

### Schema Design
- **Direct TypeScript imports**: `shared/schema.ts` provides zero-build-step imports with full type inference across all packages
- **Single source of truth**: No compiled artifacts needed - TypeScript handles type checking from source
- **No timestamp fields** - LiveStore handles timing automatically

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
├── shared/
│   └── schema.ts         # LiveStore schema - TypeScript source directly imported by all packages
├── packages/
│   ├── web-client/       # React web application
│   ├── docworker/        # Cloudflare Worker sync backend
│   └── dev-server-kernel-ls-client/  # Python kernel server
├── package.json          # Root workspace configuration
└── pnpm-workspace.yaml   # Dependency catalog
```

## Notes for AI Assistants

### Current State - Ready for AI Integration
- **Zero-latency execution** with reactive architecture
- **Rich output rendering** completed - HTML tables, SVG plots, markdown
- **Mock AI responses** working - ready for real API integration
- **Zero-build schema architecture** - Direct TypeScript imports eliminate build complexity
- **Production-ready foundation** for AI-native collaborative notebooks

### Key Development Insights
- **Reactive architecture breakthrough** - Zero-latency execution achieved
- **Unified execution system** - AI cells work exactly like code cells through execution queue
- **Event sourcing** provides excellent debugging and audit capabilities  
- **Proper event deferral** resolves LiveStore execution segment conflicts
- **Focus-based UI patterns** create clean, keyboard-driven workflows

### Communication Style
- Use authentic developer voice - uncertainty is fine, just be explicit
- Focus on AI ↔ Python ↔ User interaction goals as primary differentiator
- Emphasize production readiness and Jupyter-quality output rendering

## Important Note on Timestamps

**Do NOT use manual timestamps in code or events.** LiveStore automatically handles all timing through its event sourcing system. Focus development on features and architecture rather than timestamp management.