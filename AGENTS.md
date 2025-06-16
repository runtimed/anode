# AI Agent Development Context

This document provides essential context for AI assistants working on the Anode project.

For current work state and immediate next steps, see `HANDOFF.md` - it focuses on where development was left off and what to work on next.

## Project Overview

Anode is a real-time collaborative notebook system built on LiveStore, an event-sourcing based local-first data synchronization library. The project uses a monorepo structure with TypeScript and pnpm workspaces.

**Current Status**: Fully operational with zero-latency Python execution, enhanced IPython display system, and rich output rendering.

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
- ✅ **Enhanced IPython Display System** - Full Jupyter-compatible display hooks and publishers
- ✅ **Instant Python execution** with zero polling delays and stream consolidation
- ✅ **Rich output rendering** - HTML tables, SVG plots, markdown, JSON with proper MIME type handling
- ✅ **IPython.display functions** - display(), clear_output(), HTML(), Markdown() all work correctly
- ✅ **Rich object representations** - _repr_html_(), _repr_markdown_(), etc. fully supported
- ✅ **Pandas DataFrames** with styled HTML table output
- ✅ **Matplotlib plots** as crisp SVG vector graphics with zero-latency display
- ✅ **Stream output consolidation** - Clean text blocks with proper newline handling
- ✅ **Quote-safe execution** - Handles complex code with quotes, escapes, and special characters
- ✅ **Real-time collaboration** across multiple users  
- ✅ **AI cell integration** with mock responses and markdown rendering
- ✅ **Offline-first operation** with sync when connected
- ✅ **Robust testing suite** with extensive display system coverage and growing test base for ongoing development

### Core Architecture Features
- `NOTEBOOK_ID = STORE_ID`: Each notebook gets its own LiveStore database
- **Enhanced IPython Integration**: Custom display hooks and publishers provide full Jupyter compatibility
- **Reactive execution**: `executionRequested` → `executionAssigned` → `executionStarted` → `executionCompleted`
- **Zero-latency**: Kernels use reactive `queryDb` subscriptions for instant work detection
- **Stream consolidation**: Multiple stdout/stderr lines merge into clean text blocks with real-time updates
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

## Next Phase: Advanced Display Features & AI Integration

**Priority Focus**: Build on enhanced display system for advanced features

### Immediate Goals (Phase 2)
- **Updateable Outputs by ID** - Enable real-time streaming updates with clean consolidation
- **Interactive Widgets** - IPython widgets support for dynamic UI elements
- **Real AI API Integration** - OpenAI, Anthropic, local model calls with rich display
- **Automatic Kernel Management** - One-click notebook startup
- **Authentication System** - Google OAuth with proper session management
- **Advanced Visualizations** - 3D plots, interactive charts, custom display components

### Phase 3 Goals
- **Code Completions** - LSP + kernel-based suggestions
- **SQL Cell Implementation** - Real database connections with table display
- **AI-Generated Visualizations** - Smart chart recommendations and generation
- **Collaborative Widgets** - Real-time shared interactive components

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

### Current State - Enhanced Display System Complete
- **Full IPython compatibility** with custom display hooks and publishers
- **Zero-latency execution** with reactive architecture and stream consolidation
- **Rich output rendering** completed - HTML tables, SVG plots, markdown, JSON
- **Quote-safe code execution** via direct Python function calls
- **Consolidated testing** - 22 comprehensive tests with 16x faster execution (15s vs 4+ minutes)
- **Mock AI responses** working - ready for real API integration with rich display
- **Zero-build schema architecture** - Direct TypeScript imports eliminate build complexity
- **Production-ready foundation** for AI-native collaborative notebooks

### Key Development Insights
- **IPython integration breakthrough** - Proper display system without jupyterlite complexity
- **Stream consolidation pattern** - Real-time updates with clean UI presentation
- **Direct function calls** - Eliminates quote escaping issues entirely
- **Reactive architecture** - Zero-latency execution achieved
- **Unified execution system** - AI cells work exactly like code cells through execution queue
- **Event sourcing** provides excellent debugging and audit capabilities  
- **Proper event deferral** resolves LiveStore execution segment conflicts
- **Focus-based UI patterns** create clean, keyboard-driven workflows

### Next Architecture Goal: Updateable Outputs
The current stream consolidation works by updating existing outputs in-place. The next major improvement is making this pattern work for all output types with unique IDs, enabling:
- Real-time progress bars and status updates
- Streaming text generation for AI responses
- Dynamic chart updates during computation
- Collaborative real-time output sharing

### Communication Style
- Use authentic developer voice - uncertainty is fine, just be explicit
- Focus on AI ↔ Python ↔ User interaction goals as primary differentiator
- Emphasize production readiness and Jupyter-quality output rendering

## Important Note on Timestamps

**Do NOT use manual timestamps in code or events.** LiveStore automatically handles all timing through its event sourcing system. Focus development on features and architecture rather than timestamp management.