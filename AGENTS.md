# AI Agent Development Context

This document provides essential context for AI assistants working on the Anode project.

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

### **Rich Output System**
- **Multiple media types**: text/plain, text/markdown, text/html, image/svg+xml
- **Pandas DataFrames**: Professional HTML table styling with borders and formatting
- **Matplotlib plots**: SVG vector graphics with crisp rendering
- **AI responses**: Rich markdown with syntax highlighting and code blocks
- **Media type prioritization**: Best format automatically selected for display
- **Fallback support**: Always includes plain text as backup

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
```

## Current Working State
## What's Working ✅

- ✅ **Instant Python execution** with zero polling delays
- ✅ **Rich output rendering** - HTML tables, SVG plots, markdown, JSON
- ✅ **Pandas DataFrames** with styled HTML table output
- ✅ **Matplotlib plots** as crisp SVG vector graphics
- ✅ **Real-time collaboration** across multiple users  
- ✅ **Reactive architecture** using LiveStore's `queryDb` subscriptions
- ✅ **Multiple isolated notebooks** with separate kernels
- ✅ **AI cell integration** with mock responses and markdown rendering
- ✅ **Offline-first operation** with sync when connected
- ✅ **Event sourcing** for complete history and debugging
- ✅ **Session management** with kernel isolation
- ✅ **Comprehensive testing** (68 passing tests)

## Next Phase: Real AI Integration & Automation 🤖

**Priority Focus**: AI ↔ Python ↔ User interactions with enterprise-grade features

### Immediate Goals
- **Real AI API Integration** - Replace mock responses with OpenAI, Anthropic, local model calls
- **Automatic Kernel Management** - One-click notebook startup with auto-kernel lifecycle
- **Authentication System** - Google OAuth with proper session management
- **Code Completions** - LSP + kernel-based suggestions with Pyodide integration
- **SQL Cell Implementation** - Real database connections and query execution

### Rich Output System ✅ COMPLETED
- **Multiple Media Types** - text/plain, text/markdown, text/html, image/svg+xml
- **Pandas DataFrames** - Professional HTML table styling with proper formatting
- **Matplotlib Integration** - SVG vector graphics with interactive rendering
- **AI Markdown Responses** - Rich formatted responses with syntax highlighting
- **Media Type Detection** - Automatic selection of best display format

### Medium-term Roadmap
- **Interactive Outputs** - Widgets, 3D plots, and dynamic visualizations
- **Real-time Collaboration** - Live cursors and presence indicators
- **Advanced Cell Operations** - Multi-select, drag-and-drop reordering
- **Performance Optimization** - Handle large notebooks and datasets efficiently

### Recent Major Achievements ✅
- ✅ **Schema Architecture Simplification** - Eliminated build complexity with direct TypeScript imports
- ✅ **Rich Output System** - HTML tables, SVG plots, markdown rendering
- ✅ **Pandas DataFrame Support** - Professional table styling matching Jupyter quality
- ✅ **Matplotlib Integration** - Crisp vector graphics with proper rendering
- ✅ **Fluid notebook navigation** with arrow keys
- ✅ **Always-on textareas** replacing click-to-edit model
- ✅ **Clean, focus-driven interface** design
- ✅ **Standard keyboard shortcuts** (Shift+Enter, Ctrl+Enter)
- ✅ **Consistent behavior** across all cell types

## Important Considerations

### Schema Design
- **Direct TypeScript imports**: `shared/schema.ts` provides zero-build-step imports with full type inference across all packages
- **Single source of truth**: No compiled artifacts needed - TypeScript handles type checking from source
- Single `notebook` table per store (not `notebooks`)
- `kernelSessions` and `executionQueue` tables for lifecycle management
- **No timestamp fields** - eliminated for simplicity and stability (LiveStore handles timing automatically)

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
├── start-dev.sh          # Development startup script
├── reset-local-storage.cjs  # Clean development state
├── package.json          # Root workspace configuration
└── pnpm-workspace.yaml   # Dependency catalog
```

## Troubleshooting

### Common Issues
- **Schema updates**: No build step required - changes to `shared/schema.ts` are immediately available to all packages
- **Type errors**: TypeScript now catches invalid queries and schema mismatches at compile time
- **Sync issues**: Check document worker deployment
- **Execution not working**: Start kernel manually with `NOTEBOOK_ID=your-notebook-id pnpm dev:kernel`
- **Stale state**: Run `pnpm reset-storage` to clear everything

### Debugging
- Browser console for client-side issues
- Wrangler logs for worker debugging
- Terminal output for kernel server issues
- Comprehensive logging in kernel for execution flow

## Notes for AI Assistants

### Current State - Fully Operational + Rich Outputs
- **Zero-latency execution** with reactive architecture breakthrough
- **Rich output rendering** ✅ COMPLETED - HTML tables, SVG plots, markdown
- **AI cell integration** ✅ COMPLETED - Unified execution queue system
- **Pandas DataFrame support** ✅ COMPLETED - Professional HTML table styling
- **Matplotlib integration** ✅ COMPLETED - SVG vector graphics rendering
- **Mock AI responses** ✅ WORKING - Rich markdown formatting
- Manual kernel management (automation planned)
- Simplified schemas for reliability and rapid development
- Each notebook = separate LiveStore database for clean isolation
- **Stable reactive architecture** leveraging LiveStore's capabilities
- Ready for real AI API integration and advanced features

### Communication Style
- Use authentic developer voice - uncertainty is fine, just be explicit
- Focus on AI ↔ Python ↔ User interaction goals as primary differentiator
- Acknowledge both technical, UX, and rich output achievements completed
- Emphasize production readiness and Jupyter-quality output rendering
- Balance current capabilities with enterprise collaboration roadmap

### Key Insights for Development
- **Reactive architecture breakthrough** - Zero-latency execution achieved
- **Rich output system completion** - HTML tables, SVG plots, markdown rendering
- **Pandas DataFrame integration** - Professional styling matching Jupyter quality
- **Matplotlib SVG rendering** - Crisp vector graphics with proper display
- **Fluid UX transformation** - Jupyter-like navigation and interaction completed
- **Unified execution system** - AI cells work exactly like code cells through execution queue
- **Zero-build schema architecture** - Direct TypeScript imports eliminate build complexity while maintaining full type safety
- Event sourcing provides excellent debugging and audit capabilities  
- Local-first design enables offline work and instant responsiveness
- **Proper event deferral** resolves LiveStore execution segment conflicts effectively
- Session-based kernel management enables clean isolation and scaling
- **Focus-based UI patterns** create clean, keyboard-driven workflows
- **Consistent cross-cell behavior** enables predictable user experience
- **AI integration architecture** - Mock responses working, ready for real API integration

**Current Development Cycle**: Major UX improvements, rich output system, and schema architecture simplification completed, creating a fluid notebook experience with Jupyter-quality output rendering and zero-build-step development while maintaining real-time collaboration advantages.

The system provides a **production-ready foundation** for AI-native collaborative notebooks with modern UX, professional-quality output rendering, and is positioned for advanced enterprise features.

## Important Note on Timestamps

**Do NOT use manual timestamps in code or events.** LiveStore automatically handles all timing through its event sourcing system. Focus development on features and architecture rather than timestamp management - this was a key lesson learned that improved system stability significantly.