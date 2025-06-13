# AI Agent Development Context

This document provides essential context for AI assistants working on the Anode project.

## Project Overview

Anode is a real-time collaborative notebook system built on LiveStore, an event-sourcing based local-first data synchronization library. The project uses a monorepo structure with TypeScript and pnpm workspaces.

## Architecture

- **Schema Package** (`@anode/schema`): Contains LiveStore schema definitions (events, state, materializers)
- **Web Client** (`@anode/web-client`): React-based web interface
- **Document Worker** (`@anode/docworker`): Cloudflare Worker for sync backend
- **Kernel Client** (`@anode/dev-server-kernel-ls-client`): Python execution server

## Key Dependencies

The project heavily relies on:
- **LiveStore**: Event-sourcing library for local-first apps
- **Effect**: Functional programming library for TypeScript
- **React**: UI framework
- **TypeScript**: Primary language

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
# Full development environment
pnpm dev

# TypeScript project references approach
pnpm dev:tsc

# Individual services
pnpm dev:web-only
pnpm dev:kernel
pnpm dev:sync-only

# Build operations
pnpm build:schema
pnpm build:tsc
```

## Important Considerations

### Schema Changes
- Schema package must be built before dependent packages can consume changes
- TypeScript project references handle cross-package dependencies automatically
- Event schema changes require backwards compatibility

### Local-First Architecture
- All data operations happen locally first
- Events are synced across clients via the document worker
- SQLite provides local reactive state
- Network connectivity is optional

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
├── package.json          # Root workspace configuration
└── pnpm-workspace.yaml   # Dependency catalog
```

## Troubleshooting

### Common Issues
- **Build failures**: Ensure schema is built first
- **Type errors**: Check TypeScript project references
- **Runtime errors**: Verify LiveStore adapter configuration
- **Sync issues**: Check document worker deployment

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
- TypeScript project references are preferred for standalone service development