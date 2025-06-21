# AI Agent Development Context

This document provides essential context for AI assistants working on the Anode project.

For current work state and immediate next steps, see `HANDOFF.md` - it should provide an honest assessment of what's working versus what needs development.

**Development Workflow**: The user will typically be running the wrangler server and web client in separate tabs. If you need to check work, run a build and/or lints, tests, typechecks. If the user isn't running the dev environment, tell them how to start it at the base of the repo with pnpm.

## Project Overview

Anode is a real-time collaborative notebook system built on LiveStore, an event-sourcing based local-first data synchronization library. The project uses a monorepo structure with TypeScript and pnpm workspaces.

**Current Status**: Working prototype with collaborative editing, Python execution, and basic AI integration functional.

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
- ✅ **LiveStore integration** - Event-sourcing with real-time collaboration working reliably
- ✅ **Basic Python execution** - Code cells run Python via Pyodide (manual runtime startup)
- ✅ **Real-time collaboration** - Multiple users can edit notebooks simultaneously
- ✅ **Cell management** - Create, edit, move, delete cells with proper state sync
- ✅ **Text output handling** - Basic print statements and error display
- ✅ **Rich output rendering** - HTML, SVG, Markdown renders
- ✅ **AI integration** - OpenAI API responses when OPENAI_API_KEY is set, fallback to mock
- ✅ **Offline-first operation** - Works without network, syncs when connected
- ✅ **AI tool calling** - AI can create cells
- ✅ **Context inclusion controls** - Users can exclude cells from AI context


### What Needs Enhancement 🚧
- 🚧 **AI tool calling** - AI can not modify content, or execute code
- 🚧 **Automated runtime management** - Manual startup creates friction

### Core Architecture Features
- `NOTEBOOK_ID = STORE_ID`: Each notebook gets its own LiveStore database
- **Event-sourced state**: All changes flow through LiveStore events
- **Reactive execution**: `executionRequested` → `executionAssigned` → `executionStarted` → `executionCompleted`
- **Direct TypeScript schema**: No build step, imports work across packages
- **Session-based runtimes**: Each runtime restart gets unique `sessionId`
- **One kernel per notebook**: Each notebook has exactly one active kernel at a time

### Kernel-Notebook Relationship

**One Kernel Per Notebook**: Each notebook should have exactly one active kernel at any time. Multiple kernels on the same notebook only occur during brief transition periods (kernel restart/handoff).

**Kernel Lifecycle**:
- Notebook created → No kernel (user must start one)
- User starts kernel → Becomes the sole kernel for that notebook
- Kernel crashes/stops → Notebook has no kernel until user starts new one
- Kernel restart → Brief overlap during handoff, then old kernel terminates

**Not Yet Implemented**: Automatic kernel orchestration, graceful handoffs, kernel health monitoring. Currently manual kernel startup creates potential for multiple kernels during transitions.

## Development Commands

```bash
# Setup
pnpm install             # Automatically creates package .env files with defaults

# Start core services (web + sync)
pnpm dev

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

**Priority Focus**: Verify core functionality works, then remove friction

### Phase 1: Prove It Works (Next 2 weeks)
- **Integration Testing** - Real Pyodide tests to verify Python execution claims
- **Rich Output Verification** - Test matplotlib, pandas, IPython.display actually work
- **Automated Runtime Management** - Remove manual `NOTEBOOK_ID=xyz pnpm dev:runtime` friction and enforce one-kernel-per-notebook
- **Error Handling** - Better user feedback when things fail

### Phase 2: AI Tool Calling & Context Controls (Next 1-2 months)
- **AI Function Calling** - AI can create cells, modify content, and execute code using OpenAI function calling
- **Context Inclusion Controls** - Users can mark cells as included/excluded from AI context
- **Tool Execution Framework** - Reactive system handles AI tool calls with user confirmation
- **Enhanced AI-Notebook Interaction** - AI becomes active development partner
- **Package Cache Optimization** - Smart pre-loading and shared team caches

### Phase 3: Advanced Features (Next 2-3 months)
- **MCP Integration** - Model Context Protocol support for extensible AI tooling via Python runtime
- **SQL Cell Implementation** - Database connections and query results
- **Interactive Widgets** - IPython widgets support for collaborative elements
- **Authentication System** - Google OAuth with proper session management

### Phase 4: Production (Next quarter)
- **Performance Optimization** - Handle large notebooks efficiently
- **Code Completions** - LSP + kernel-based suggestions
- **Advanced Visualizations** - 3D plots, interactive charts
- **Production Deployment** - Self-hosted and cloud options

## Important Considerations

### Schema Design
- **Direct TypeScript imports**: `shared/schema.ts` provides zero-build-step imports with full type inference across all packages
- **Single source of truth**: No compiled artifacts needed - TypeScript handles type checking from source
- **No timestamp fields** - LiveStore handles timing automatically

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

### Recent Critical Fixes (June 2025)

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
│   └── schema.ts         # LiveStore schema - TypeScript source directly imported by all packages
├── packages/
│   ├── web-client/       # React web application
│   ├── docworker/        # Cloudflare Worker sync backend
│   └── pyodide-runtime-agent/  # Python runtime server
├── docs/                 # Documentation directory
│   ├── README.md         # Documentation index
│   ├── ai-features.md        # AI setup and usage guide
│   ├── display-system.md # Display system architecture
│   ├── TESTING.md        # Testing strategy and gaps
│   ├── ui-design.md      # Interface design guidelines
│   └── display-examples.md # Practical usage examples
├── HANDOFF.md           # Current work state and priorities
├── ROADMAP.md           # Long-term vision and milestones
├── package.json         # Root workspace configuration
└── pnpm-workspace.yaml  # Dependency catalog
```

## Notes for AI Assistants

**Current Status - Working Prototype
- **LiveStore foundation** solid with real-time collaborative editing
- **Basic Python execution** working via Pyodide (needs integration testing)
- **Rich output system** architecture in place but verification needed
- **AI integration** - OpenAI API working but lacks notebook context and tools
- **Direct TypeScript schema** - No build complexity across packages
- **Event-sourced architecture** - Excellent debugging and audit capabilities
- **Package caching system** - Node.js package cache for faster Python execution

### Key Development Insights
- **LiveStore integration** provides solid collaborative foundation
- **Reactive architecture** eliminates polling delays for execution
- **Event sourcing** enables powerful undo/redo and conflict resolution
- **Direct function calls** approach eliminates quote escaping complexity
- **Unified execution system** makes all cell types work through same queue
**Manual runtime startup** creates significant user friction and potential for multiple kernels

### Immediate Technical Goals
- **AI tool calling infrastructure** - Enable AI to create/modify cells using OpenAI function calling
- **Context inclusion controls** - Let users control what cells AI can see for context
- **Integration testing** to verify Python execution and rich outputs actually work
- **MCP integration foundation** - Architecture for Model Context Protocol providers via Python runtime
- **Automated runtime management** to remove manual startup friction
- **Better error handling** for improved user experience

### Communication Style
- Use authentic developer voice - uncertainty is fine, just be explicit
- Be honest about current prototype status while preserving the collaborative vision
- Focus on proving core functionality works before claiming production readiness
- Emphasize the solid LiveStore foundation and collaborative advantages

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

# Start core services
pnpm dev             # Web client + sync backend

# Warm up package cache for faster Python execution (recommended)
pnpm cache:warm-up   # Pre-loads numpy, pandas, matplotlib, requests, etc.

# In separate terminal, get runtime command from notebook UI
# Then run: NOTEBOOK_ID=notebook-id-from-ui pnpm dev:runtime
```

## Important Development Notes

**Do NOT use manual timestamps in code or events.** LiveStore automatically handles all timing through its event sourcing system. Focus development on features and architecture rather than timestamp management.

**⚠️ CRITICAL: Do NOT use `ctx.query()` in materializers.** This causes LiveStore materializer hash mismatches and kernel restart failures (see bug #34 - RESOLVED in commits 6e0fb4f and a1bf20d). All materializers must be pure functions with all needed data passed via event payload.

**Testing is Critical**: Many claims about functionality need verification through proper integration tests. Core features exist but integration testing is minimal.

**AI Tool Calling**: The next major enhancement is enabling AI to actively participate in notebook development through function calling - creating cells, modifying content, and executing code.

**Context Control**: Users need granular control over what context AI sees, especially in large notebooks where token limits matter.

**MCP Integration**: Long-term vision includes Model Context Protocol integration via Python kernel for unlimited AI tool extensibility.

**Kernel Management**: Manual kernel startup (copying command from UI) creates user friction and should be a high priority to fix.

**Be Honest About Status**: This is a prototype with great potential, not a production-ready system. The LiveStore foundation is solid, but execution and rich output claims need verification.
