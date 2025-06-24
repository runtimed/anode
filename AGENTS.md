# AI Agent Development Context

This document provides essential context for AI assistants working on the Anode project.

Current work state and next steps. What works, what doesn't. Last updated: June 2025.

**Development Workflow**: The user will typically be running the wrangler server and web client in separate tabs. If you need to check work, run a build and/or lints, tests, typechecks. If the user isn't running the dev environment, tell them how to start it at the base of the repo with pnpm.

## Project Overview

Anode is a real-time collaborative notebook system built on LiveStore, an event-sourcing based local-first data synchronization library.

**Current Status**: Deployed to (pseduo) production for testing. Real-time collaboration works. Python execution works with rich outputs. AI integration works.

## Architecture

- **Schema** (`jsr:@runt/schema`): LiveStore schema definitions (events, state, materializers) - Published JSR package imported by all packages with full type inference. Comes via https://github.com/runtimed/runt's deno monorepo
- **Web Client** (`@anode/web-client`): React-based web interface
- **Document Worker** (`@anode/docworker`): Cloudflare Worker for sync backend
- **Pyodide Runtime Agent** (`@anode/pyodide-runtime-agent`): Python execution client

## Key Dependencies

- **LiveStore**: Event-sourcing library for local-first apps
- **Effect**: Functional programming library for TypeScript
- **React**: UI framework
- **TypeScript**: Primary language

## Current Working State

### What's Actually Working ✅
- ✅ **LiveStore integration** - Event-sourcing with real-time collaboration
- ✅ **Python execution** - Code cells run Python via Pyodide with rich outputs (matplotlib SVG, pandas HTML, IPython.display)
- ✅ **Real-time collaboration** - Multiple users can edit notebooks simultaneously
- ✅ **Cell management** - Create, edit, move, delete cells with proper state sync
- ✅ **Rich output rendering** - Full IPython display support: matplotlib SVG, pandas HTML, colored terminal output
- ✅ **AI integration** - Full notebook context awareness, sees previous cells and their outputs
- ✅ **AI tool calling** - AI can create new cells and modify them using function calling
- ✅ **Context inclusion controls** - Users can exclude cells from AI context with visibility toggles
- ✅ **Production deployment** - Web client and sync backend deployed to Cloudflare (Pages + Workers)
- ✅ **Authentication** - Google OAuth and fallback token system working in production
- ✅ **Mobile support** - Responsive design with mobile keyboard optimizations
- ✅ **Offline-first operation** - Works without network, syncs when connected
- ✅ **Package caching** - Pre-loading scientific stack (numpy, pandas, matplotlib) for faster startup
- ✅ **AI context with outputs** - AI sees execution results, not just source code, for intelligent assistance with data analysis

### What Needs Enhancement 🚧
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
pnpm dev
## Tab 2:
pnpm dev:sync

# Start runtime (get command from notebook UI)
# Runtime command is now dynamic via VITE_RUNTIME_COMMAND environment variable
# Get runtime command from notebook UI, then:
NOTEBOOK_ID=notebook-id-from-ui pnpm dev:runtime
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
- **JSR schema package**: `jsr:@runt/schema` provides zero-build-step imports with type inference across all packages

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
- Network connectivity optional, but is essential for runtime access

### Code Style
- Prefer functional programming patterns (Effect library)
- Event sourcing over direct state mutations
- Reactive queries over imperative data fetching
- TypeScript strict mode enabled

## File Structure

```
anode/
├── .git/
├── .github/
├── .zed/
├── dist/
├── docs/
│   ├── proposals/
│   ├── README.md
│   ├── TESTING.md
│   ├── ai-context-visibility.md
│   ├── ui-design.md
│   └── ui-enhancements-demo.md
├── examples/
│   └── ai-context-demo.md
├── node_modules/
├── public/
├── src/
│   ├── auth/
│   ├── components/
│   │   ├── auth/
│   │   ├── notebook/
│   │   │   ├── AiCell.tsx
│   │   │   ├── AnsiOutput.tsx
│   │   │   ├── Cell.tsx
│   │   │   ├── NotebookViewer.tsx
│   │   │   ├── RichOutput.css
│   │   │   ├── RichOutput.tsx
│   │   │   └── SqlCell.tsx
│   │   └── ui/
│   ├── lib/
│   │   └── utils.ts
│   ├── sync/
│   │   └── sync.ts
│   ├── types/
│   ├── util/
│   ├── Root.tsx
│   ├── index.css
│   ├── livestore.worker.ts
│   └── main.tsx
├── test/
├── .gitignore
├── AGENTS.md
├── CONTRIBUTING.md
├── Caddyfile.example
├── DEPLOYMENT.md
├── LICENSE
├── README.md
├── ROADMAP.md
├── components.json
├── index.html
├── package.json
├── pnpm-lock.yaml
├── schema.ts
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.test.json
├── vite.config.ts
├── vitest.config.ts
└── wrangler.toml
```

**Deployment (Cloudflare):**
- Pages: `https://anode.pages.dev` (from `/dist`)
- Workers: `https://anode-docworker.rgbkrk.workers.dev` (from `/src/sync/sync.ts`)
- D1: Production data persistence
- Secrets: Auth tokens, API keys
- Runtime: Python execution via `@runt` packages

## Notes for AI Assistants

**Current Status - Production Deployment Working**
- **LiveStore foundation** - Real-time collaborative editing deployed and stable
- **Full Python execution** - Rich outputs working (matplotlib, pandas, IPython.display)
- **Complete AI integration** - Full notebook context awareness, can create and modify cells
- **Production deployment** - Cloudflare Pages + Workers with authentication

### Key Development Insights
- **Deployment Ready** - Full stack working on Cloudflare infrastructure
- **Rich outputs working** - Complete IPython display compatibility with matplotlib, pandas
- **AI context awareness** - AI sees full notebook state including outputs

### Immediate Technical Goals
- **User-attributed kernels** - API token system for "Bring Your Own Compute"
- **Automated kernel orchestration** - Production runtime provisioning

### Communication Style
- Be direct about what works and what doesn't
- Focus on helping developers solve actual problems
- Use code examples over lengthy explanations
- Keep commit messages short and factual
- State facts without marketing language
- Say "this is a prototype" or "this part needs work" when true
- Always bring a towel

## Development Workflow Notes

**User Environment**: The user will typically have:
- Web client running in one tab (`pnpm dev`)
- Wrangler server running in another tab (`pnpm dev:sync`)
- Python runtime available via `pnpm dev:runtime` (uses @runt JSR packages, command customizable via VITE_RUNTIME_COMMAND)

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
pnpm install         # Install dependencies for single application
cp .env.example .env # Copy environment template

# In separate tabs run
## Tab 1:
pnpm dev             # Web client
## Tab 2:
pnpm dev:sync        # Sync worker (now properly on port 8787)

# Python runtime (get NOTEBOOK_ID from UI, then run):
# Runtime command is customizable via VITE_RUNTIME_COMMAND in .env
NOTEBOOK_ID=your-notebook-id pnpm dev:runtime
```

**For detailed development priorities, see [ROADMAP.md](./ROADMAP.md)**

## Communication Guidelines for AI Assistants

### Senior Engineering Collaboration
- **Write for staff/principal engineers**: Assume deep technical knowledge
- **Be concise and precise**: Remove redundant explanations
- **Lead with facts**: State what is, not what could be
- **Show working code**: Demonstrate solutions with actual implementations
- **Identify root causes**: Address underlying issues, not symptoms
- **Use technical terminology correctly**: Precision matters in technical communication

### Code Review Standards
- **Reference specific lines/functions**: Use exact file paths and line numbers
- **Explain the "why"**: Technical rationale behind changes
- **Highlight trade-offs**: Acknowledge design decisions and their implications
- **Suggest concrete improvements**: Actionable recommendations with code examples
- **Maintain consistency**: Follow existing patterns and conventions

### Problem-Solving Approach
- **Start with diagnosis**: Understand the system state before proposing solutions
- **Use systematic debugging**: Add logging, isolate components, test hypotheses
- **Verify assumptions**: Check actual behavior against expected behavior
- **Consider edge cases**: Think through failure modes and boundary conditions
- **Document findings**: Leave clear breadcrumbs for future developers

### Technical Communication
- **Use standard terminology**: Stick to established technical vocabulary
- **Be specific with versions**: Reference exact package versions, commit hashes
- **Include reproduction steps**: Clear instructions for recreating issues
- **Separate concerns**: Distinguish between bugs, features, and technical debt
- **Quantify impact**: Use metrics and benchmarks where relevant
