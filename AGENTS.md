# AI Agent Development Context

This document provides essential context for AI assistants working on the Anode project.

This document provides the current work state and immediate next steps with an honest assessment of what's working versus what needs development. Last updated: January 2025 with comprehensive project analysis.

**Development Workflow**: The user will typically be running the wrangler server and web client in separate tabs. If you need to check work, run a build and/or lints, tests, typechecks. If the user isn't running the dev environment, tell them how to start it at the base of the repo with pnpm.

## Project Overview

Anode is a real-time collaborative notebook system built on LiveStore, an event-sourcing based local-first data synchronization library. The project uses a monorepo structure with TypeScript and pnpm workspaces.

**Current Status**: Production-deployed system with full collaborative editing, complete Python execution with rich outputs, and advanced AI integration. 107 passing tests validate core functionality. Main gap is automated runtime management.

## Architecture

- **Shared Schema** (`shared/schema.ts`): LiveStore schema definitions (events, state, materializers) - TypeScript source file directly imported by all packages with full type inference
- **Web Client** (`@anode/web-client`): React-based web interface
- **Document Worker** (`@anode/docworker`): Cloudflare Worker for sync backend
- **Pyodide Runtime Agent** (`@anode/pyodide-runtime-agent`): Python execution server (manual start per notebook)

## Key Dependencies

- **LiveStore**: Event-sourcing library for local-first apps
- **Effect**: Functional programming library for TypeScript
- **React**: UI framework
- **TypeScript**: Primary language

## Current Working State

### What's Actually Working ✅
- ✅ **LiveStore integration** - Event-sourcing with real-time collaboration working reliably in production
- ✅ **Python execution** - Code cells run Python via Pyodide with rich outputs (matplotlib SVG, pandas HTML, IPython.display)
- ✅ **Real-time collaboration** - Multiple users can edit notebooks simultaneously without conflicts
- ✅ **Cell management** - Create, edit, move, delete cells with proper state sync
- ✅ **Rich output rendering** - Full IPython display support: matplotlib SVG, pandas HTML, colored terminal output
- ✅ **AI integration** - Full notebook context awareness, sees previous cells and their outputs
- ✅ **AI tool calling** - AI can create new cells using OpenAI function calling
- ✅ **Context inclusion controls** - Users can exclude cells from AI context with visibility toggles
- ✅ **Production deployment** - Web client and sync backend deployed to Cloudflare (Pages + Workers)
- ✅ **Authentication** - Google OAuth and fallback token system working in production
- ✅ **Mobile support** - Responsive design with mobile keyboard optimizations
- ✅ **Offline-first operation** - Works without network, syncs when connected
- ✅ **Package caching** - Pre-loading scientific stack (numpy, pandas, matplotlib) for faster startup
- ✅ **Comprehensive testing** - 107 passing tests with good integration coverage, zero TypeScript errors
- ✅ **Runtime restart reliability** - Fixed materializer side effects bug (#34), stable multi-session operation
- ✅ **AI context with outputs** - AI sees execution results, not just source code, for intelligent assistance

### What Needs Enhancement 🚧
- 🚧 **AI tool calling expansion** - AI can only create cells, needs modify/execute functions
- 🚧 **User confirmation flows** - Need UI for confirming AI-initiated actions
- 🚧 **Automated runtime management** - Manual startup creates friction, need one-click kernel startup
- 🚧 **User-attributed kernels** - Need "Bring Your Own Compute" with API tokens
- 🚧 **Kernel health monitoring** - Need automatic failure detection and restart

### Core Architecture Constraints
- `NOTEBOOK_ID = STORE_ID`: Each notebook gets its own LiveStore database
- **Event-sourced state**: All changes flow through LiveStore events
- **Reactive execution**: `executionRequested` → `executionAssigned` → `executionStarted` → `executionCompleted` events, materialized table is an execution queue
- **Direct TypeScript schema**: No build step, imports work across packages
- **Session-based runtimes**: Each runtime restart gets unique `sessionId`
- **One kernel per notebook**: Each notebook has exactly one active kernel at a time

### Kernel-Notebook Relationship

**One Kernel Per Notebook**: Each notebook should have exactly one active kernel at any time. Multiple kernels on the same notebook should only occur during transition periods (kernel restart/handoff).

**Kernel Lifecycle**:
- Notebook created → No kernel (user must start one)
- User starts kernel → Becomes the sole kernel for that notebook
- Kernel crashes/stops → Notebook has no kernel until user starts new one
- Kernel restart → Brief overlap during handoff, then old kernel terminates

**Not Yet Implemented**: Automatic kernel orchestration, graceful handoffs, kernel health monitoring. Currently manual kernel startup creates potential for multiple kernels during transitions.

## Development Commands

```bash
# Setup
pnpm install  # Automatically creates package .env files with defaults

# In separate tabs run
## Tab 1:
pnpm dev:web-only
## Tab 2:
pnpm dev:sync-only

# Start runtime (get command from notebook UI)
# Get runtime command from notebook UI, then:
NOTEBOOK_ID=notebook-id-from-ui pnpm dev:runtime

# Utilities
pnpm reset-storage  # Clear all local storage

# Package caching (Node.js only)
pnpm cache:warm-up     # Pre-load essential packages for faster startup
pnpm cache:stats       # Show cache statistics
pnpm cache:list        # List cached packages
pnpm cache:clear       # Clear package cache
```

## Immediate Priorities

**See [ROADMAP.md](./ROADMAP.md) for detailed implementation plan with tasks, acceptance criteria, and timelines.**

**Priority Focus**: Core functionality is verified and working. Focus is now on expanding AI capabilities and removing kernel startup friction.

### Current Development Phase (Next 2-3 weeks)
1. **Enhanced AI Tool Calling** - Add modify_cell and execute_cell functions beyond cell creation
2. **User Confirmation Flows** - UI dialogs for confirming AI-initiated actions
3. **User-Attributed Kernels** - API token system for "Bring Your Own Compute"
4. **Automated Runtime Management** - One-click kernel startup and health monitoring

**Next Major Features**: SQL cells, interactive widgets, code completions, multi-language support

**For detailed implementation tasks and acceptance criteria, see [ROADMAP.md](./ROADMAP.md)**

## Important Considerations

### Schema Design
- **Direct TypeScript imports**: `shared/schema.ts` provides zero-build-step imports with type inference across all packages

### ⚠️ CRITICAL: Materializer Determinism Requirements

**NEVER use `ctx.query()` in materializers** - This was the root cause of runtime restart bug #34.

LiveStore requires all materializers to be **pure functions without side effects**. Any data needed by a materializer must be passed via the event payload, not looked up during materialization.

**What caused the bug:**
```typescript
// ❌ WRONG - This causes LiveStore.UnexpectedError materializer hash mismatch
"v1.ExecutionCompleted": ({ queueId }, ctx) => {
  const queueEntries = ctx.query(
    tables.executionQueue.select().where({ id: queueId }).limit(1)
  );
  // ... rest of materializer
}
```

**Correct approach:**
```typescript
// ✅ CORRECT - All needed data in event payload
"v1.ExecutionCompleted": ({ queueId, cellId, status }) => [
  tables.executionQueue.update({
    status: status === "success" ? "completed" : "failed"
  }).where({ id: queueId }),
  tables.cells.update({
    executionState: status === "success" ? "completed" : "error"
  }).where({ id: cellId }),
]
```

**Fixed commits for reference:**
- `6e0fb4f`: Fixed ExecutionCompleted/ExecutionCancelled materializers
- `a1bf20d`: Fixed ExecutionStarted materializer

**Rule**: If you need data in a materializer, add it to the event schema and pass it when committing the event. Materializers must be deterministic and reproducible.

### Recent Critical Fixes (Resolved June 2025)

**Runtime Restart Bug (#34) - RESOLVED** ✅

The project recently resolved a major stability issue where 3rd+ runtime sessions would fail to receive work assignments due to LiveStore materializer hash mismatches. This was caused by non-deterministic materializers using `ctx.query()` calls.

**What was broken:**
- ExecutionCompleted, ExecutionCancelled, and ExecutionStarted materializers were using `ctx.query()`
- This made them non-deterministic, causing LiveStore to shut down with "UnexpectedError materializer hash mismatch"
- Runtime restarts would accumulate terminated sessions and eventually fail

**How it was fixed (commits 6e0fb4f and a1bf20d):**
1. **Added cellId to event schemas**: ExecutionCompleted, ExecutionCancelled, ExecutionStarted now include `cellId` in payload
2. **Removed all ctx.query() calls**: Materializers now receive all needed data via event payload
3. **Updated all event commits**: All places that commit these events now pass `cellId` explicitly
4. **Made materializers pure functions**: No side effects, deterministic output for same input

**Impact:** Runtime sessions are now reliable across multiple restarts, enabling future automated runtime management.

**For Future Development:**
- Always check that new materializers are pure functions
- Never use `ctx.query()` in materializers - pass data via event payload
- Reference these commits when adding new execution-related events
- Test runtime restart scenarios when modifying execution flow

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
│   └── schema.ts                    # LiveStore schema - TypeScript source directly imported by all packages
├── packages/
│   ├── web-client/                  # React web application (@anode/web-client)
│   │   ├── src/components/notebook/ # Notebook interface components
│   │   ├── dist/                    # Built assets for Cloudflare Pages deployment
│   │   └── package.json             # Vite + React + LiveStore dependencies
│   ├── docworker/                   # Cloudflare Worker sync backend (@anode/docworker)
│   │   ├── src/index.ts             # Worker entry point with LiveStore sync
│   │   ├── wrangler.toml            # Cloudflare Worker configuration
│   │   └── package.json             # Minimal Worker dependencies
│   └── pyodide-runtime-agent/       # Python runtime server (@anode/pyodide-runtime-agent)
│       ├── src/                     # TypeScript runtime implementation
│       │   ├── runtime-agent.ts     # Main execution coordinator
│       │   ├── pyodide-kernel.ts    # Python execution via Pyodide
│       │   └── openai-client.ts     # AI integration
│       └── package.json             # Node.js runtime dependencies
├── docs/                            # Comprehensive documentation (11 files)
│   ├── README.md                    # Documentation index and navigation
│   ├── runtime-agent-architecture.md # Core system design
│   ├── ai-features.md               # AI integration setup and capabilities
│   ├── display-system.md            # IPython display system architecture
│   ├── display-examples.md          # Rich output usage examples
│   ├── ui-design.md                 # Interface design guidelines
│   ├── TESTING.md                   # Testing strategy and current gaps
│   ├── ai-context-visibility.md     # Context control implementation
│   ├── pyodide_cache.md             # Package caching system
│   ├── ui-enhancements-demo.md      # UI improvement showcase
│   ├── IMPLEMENTATION_SUMMARY.md    # Technical implementation details
│   └── proposals/                   # Architecture proposals (6 files)
│       ├── ai-tool-calling.md       # OpenAI function calling architecture
│       ├── ai-context-controls.md   # Context visibility system
│       ├── completion-system.md     # Code completion design
│       ├── kernel-management.md     # Runtime automation
│       ├── mcp-integration.md       # Model Context Protocol analysis
│       └── updateable-outputs.md    # Jupyter compatibility
├── examples/
│   └── ai-context-demo.md           # AI context demonstration
├── test/                            # Test suite
│   ├── README.md                    # Test documentation
│   ├── basic.test.ts                # Core functionality tests
│   ├── edge-cases.test.ts           # Edge case handling
│   ├── integration/                 # Integration test suite
│   └── fixtures/                    # Test data and mocks
├── scripts/
│   └── setup.js                     # Environment setup automation
├── .github/                         # GitHub configuration
├── AGENTS.md                        # AI agent development context (this file)
├── ROADMAP.md                       # Long-term vision and milestones
├── DEPLOYMENT.md                    # Cloudflare deployment guide
├── CONTRIBUTING.md                  # Contribution guidelines
├── README.md                        # Project overview and quick start
├── package.json                     # Root workspace configuration and scripts
├── pnpm-workspace.yaml              # Workspace definitions
├── vitest.config.ts                 # Test runner configuration
└── tsconfig.json                    # TypeScript project configuration
```

**Deployment Architecture (Cloudflare):**
- **Pages**: Web client deployed to `https://anode.pages.dev`
- **Workers**: Sync backend deployed to `https://anode-docworker.rgbkrk.workers.dev`
- **D1**: Database for production data persistence
- **Secrets**: Authentication tokens and API keys managed via Cloudflare dashboard

## Notes for AI Assistants

**Current Status - Production Deployment Working**
- **LiveStore foundation** - Real-time collaborative editing deployed and stable
- **Full Python execution** - Rich outputs working (matplotlib, pandas, IPython.display)
- **Complete AI integration** - Full notebook context awareness, can create cells
- **Production deployment** - Cloudflare Pages + Workers with authentication
- **Direct TypeScript schema** - No build complexity across packages

### Key Development Insights
- **Production deployment achieved** - Full stack working on Cloudflare infrastructure
- **Rich outputs working** - Complete IPython display compatibility with matplotlib, pandas
- **AI context awareness complete** - AI sees full notebook state including outputs
- **Reactive architecture** eliminates polling delays for execution
- **Manual runtime startup** remains the main friction point for users

### Immediate Technical Goals
- **AI tool calling expansion** - Enable AI to modify content and execute code (beyond creating cells)
- **User-attributed kernels** - API token system for "Bring Your Own Compute"
- **Automated kernel orchestration** - Production runtime provisioning

### Communication Style
- Use authentic developer voice - uncertainty is fine, just be explicit
- Be honest about current prototype status while preserving the collaborative vision
- Focus on proving core functionality works before claiming production readiness
- Emphasize the solid LiveStore foundation and collaborative advantages
- Clarity is essential. Being concise moreso.

## Development Workflow Notes

**User Environment**: The user will typically have:
- Web client running in one tab (`pnpm dev`)
- Wrangler server running in another tab
- Manual runtime startup as needed (`NOTEBOOK_ID=xyz pnpm dev:runtime`)

**Checking Work**: If you need to verify changes:
```bash
# Build and check for issues
pnpm build           # Build all packages
pnpm lint            # Check code style
pnpm test            # Run test suite
pnpm type-check      # TypeScript validation
```

**If User Isn't Running Dev Environment**:
Tell them to start at the base of the repo:
```bash
# Setup environment
pnpm install         # Automatically creates package .env files with defaults

# In separate tabs run
## Tab 1:
pnpm dev:web-only
## Tab 2:
pnpm dev:sync-only

# Warm up package cache for faster Python execution (recommended)
pnpm cache:warm-up   # Pre-loads numpy, pandas, matplotlib, requests, etc.

# In separate terminal, get runtime command from notebook UI
# Then run: NOTEBOOK_ID=notebook-id-from-ui pnpm dev:runtime
```

## Important Development Notes

**⚠️ CRITICAL: Do NOT use `ctx.query()` in materializers.** This causes LiveStore materializer hash mismatches and kernel restart failures (see bug #34 - RESOLVED in commits 6e0fb4f and a1bf20d). All materializers must be pure functions with all needed data passed via event payload.

**Testing is Solid**: 107 passing tests with good integration coverage. Core features are verified and reliable through comprehensive testing.

**Current Reality**: This is a fully operational system deployed to production at https://anode.pages.dev with complete Jupyter functionality, rich outputs, real-time collaboration, and advanced AI integration. The LiveStore foundation is solid and the system handles complex workflows reliably.

**Main Opportunities**: 
1. Expanding AI capabilities beyond cell creation
2. Removing kernel startup friction through automation
3. Enabling user-attributed kernels for production scaling

**Current Reality**: This is a fully operational system deployed to production at https://anode.pages.dev with complete Jupyter functionality, rich outputs, real-time collaboration, and advanced AI integration. The LiveStore foundation is solid and the system handles complex workflows reliably.

**Main Opportunities**: 
1. Expanding AI capabilities beyond cell creation
2. Removing kernel startup friction through automation
3. Enabling user-attributed kernels for production scaling

**For detailed development priorities, see [ROADMAP.md](./ROADMAP.md)**
