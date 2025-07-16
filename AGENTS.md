# AI Agent Development Context

This document provides essential context for AI assistants working on the Anode
project.

Current work state and next steps. What works, what doesn't. Last updated: July 2025.

**Development Workflow**: The user will typically be running the wrangler server
and web client in separate tabs. If you need to check work, run a build and/or
lints, tests, typechecks. If the user isn't running the dev environment, tell
them how to start it at the base of the repo with pnpm.

## Project Overview

Anode is a real-time collaborative notebook system built on LiveStore, an
event-sourcing based local-first data synchronization library.

**Current Status**: A robust, real-time collaborative notebook system. It features Python execution with rich outputs and integrated AI capabilities, all built on a unified, event-sourced output system. The system is stable and deployed, with ongoing enhancements focused on advanced AI interaction and runtime management.

## Architecture

- **Schema** (`jsr:@runt/schema`): LiveStore schema definitions (events, state,
  materializers) - Published JSR package imported by all packages with full type
  inference. Comes via https://github.com/runtimed/runt's deno monorepo
- **Web Client** (`@anode/web-client`): React-based web interface
- **Document Worker** (`@anode/docworker`): Cloudflare Worker for sync backend with artifact storage
- **Pyodide Runtime Agent** (`@anode/pyodide-runtime-agent`): Python execution
  client

## Key Dependencies

- **LiveStore**: Event-sourcing library for local-first apps
- **Effect**: Functional programming library for TypeScript
- **React**: UI framework
- **TypeScript**: Primary language

## Current Working State

### What's Actually Working ✅

- ✅ **LiveStore integration** - Event-sourcing with real-time collaboration
- ✅ **Python execution** - Code cells run Python via Pyodide with rich outputs
  (matplotlib SVG, pandas HTML, IPython.display)
- ✅ **Real-time collaboration** - Multiple users can edit notebooks
  simultaneously
- ✅ **Cell management** - Create, edit, move, delete cells with proper state
  sync
- ✅ **Rich output rendering** - Full IPython display support: matplotlib SVG,
  pandas HTML, colored terminal output
- ✅ **AI integration** - Full notebook context awareness, sees previous cells
  and their outputs
- ✅ **AI tool calling** - AI can create new cells and modify them using
  function calling
- ✅ **Context inclusion controls** - Users can exclude cells from AI context
  with visibility toggles
- ✅ **Production deployment** - Web client and sync backend deployed to
  Cloudflare (Pages + Workers)
- ✅ **Authentication** - Google OAuth and fallback token system working in
  production
- ✅ **Mobile support** - Responsive design with mobile keyboard optimizations
- ✅ **Offline-first operation** - Works without network, syncs when connected
- ✅ **Package caching** - Pre-loading scientific stack (numpy, pandas,
  matplotlib) for faster startup
- ✅ **AI context with outputs** - AI sees execution results, not just source
  code, for intelligent assistance with data analysis
- ✅ **Unified Output System** - Granular, type-safe events for all output types
- ✅ **Clear output functionality** - `clear_output(wait=True/False)` working properly
- ✅ **Terminal output grouping** - Consecutive terminal outputs merge naturally
- ✅ **Error output rendering** - Proper traceback display with JSON error parsing
- ✅ **All tests passing** - 58/58 tests covering output system
- 🚧 **Artifact service** - First version deployed with basic upload/download endpoints (has known security limitations)

### Core Architecture Constraints

- `NOTEBOOK_ID = STORE_ID`: Each notebook gets its own LiveStore database
- **Event-sourced state**: All changes flow through LiveStore events
- **Reactive execution**: `executionRequested` → `executionAssigned` →
  `executionStarted` → `executionCompleted` events, materialized table is an
  execution queue
- **Direct TypeScript schema**: No build step, imports work across packages
- **Session-based runtimes**: Each runtime restart gets unique `sessionId`
- **One runtime per notebook**: Each notebook has exactly one active runtime at a
  time
- **Artifact storage**: First version backend for external storage (uploads authenticated, downloads currently unauthenticated)

### Runtime-Notebook Relationship

**One Runtime Per Notebook**: Each notebook should have exactly one active runtime
at any time. Multiple runtimes on the same notebook should only occur during
transition periods (runtime restart/handoff).

**Runtime Lifecycle**:

- Notebook created → No runtime (user must start one)
- User starts runtime → Becomes the sole runtime for that notebook
- Runtime crashes/stops → Notebook has no runtime until user starts new one
- Runtime restart → Brief overlap during handoff, then old runtime terminates

**Not Yet Implemented**: Automatic runtime orchestration, graceful handoffs,
runtime health monitoring. Currently manual runtime startup creates potential for
multiple runtimes during transitions.

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

## Schema Linking for Development

The `@runt/schema` package provides the shared types and events between Anode and Runt. The linking method depends on your development phase:

### Production (JSR Package)

```json
"@runt/schema": "jsr:^0.6.4"
```

Use this for stable releases and production deployments.

### Testing PR Changes (GitHub Reference)

```json
"@runt/schema": "github:runtimed/runt#1d52f9e51b9f28e81e366a7053d1e5fa6164c390&path:/packages/schema"
```

Use this when testing changes from a merged PR in the Runt repository. Replace the commit hash with the specific commit you want to test.

### Local Development (File Link)

```json
"@runt/schema": "file:../runt/packages/schema"
```

Use this when developing locally with both Anode and Runt repositories side-by-side.

### Switching Between Modes

1. **Update `package.json`** with the appropriate schema reference
2. **Run `pnpm install`** to update dependencies
3. **Restart your development servers** (both `pnpm dev` and `pnpm dev:sync`)

**Important**: Always ensure both repositories are using compatible schema versions. Type errors usually indicate schema mismatches.

## Current Priorities

**Current Focus**: Enhancing AI capabilities and improving runtime management.

### Key Development Areas

1.  **Enhanced AI Tool Calling**: AI can now create, modify, and execute cells.
    - Function calling infrastructure is in place.
    - AI can create new cells (`create_cell`).
    - AI can modify existing cells (`modify_cell`).
    - AI can execute code cells (`execute_cell`).
    - _Next Step_: Add comprehensive JSDoc and parameter validation for tool calls.
2.  **User Confirmation Flows**: Implementing UI for confirming AI-initiated actions.
    - _Next Step_: Design and implement confirmation dialogs, categorize risks, integrate with LiveStore events, and allow safe operations to bypass confirmation.
3.  **User-Attributed Runtime Agents ("Bring Your Own Compute")**: Enabling users to run standalone runtime agents with API tokens.
    - _Next Step_: Develop API token system, token management UI, and documentation for user-owned runtimes.
4.  **Automated Runtime Management**: Reducing manual friction in starting and managing runtimes.
    - _Next Step_: Design runtime orchestration, implement one-click startup, and add health monitoring.

**Foundation Complete**: The core output system provides type safety, performance, and streaming capabilities, forming a solid base for these enhancements.

## Important Considerations

### Schema Design

- **JSR schema package**: `jsr:@runt/schema` provides zero-build-step imports
  with type inference across all packages

### ⚠️ CRITICAL: Materializer Determinism Requirements

LiveStore requires all materializers to be **pure functions without side
effects**. Avoid non-deterministic operations (like `Date()` calls) that could
produce different results across clients. Using `ctx.query()` for deterministic
data access is fine.

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

**Rule**: Materializers must be deterministic and reproducible. Avoid
non-deterministic operations, but using `ctx.query()` for deterministic data
lookups is acceptable.

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
- Granular, type-safe events with clear schemas
- Prefer specific event types over complex discriminated unions

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
│   ├── backend/
│   │   ├── artifact.ts
│   │   ├── auth.ts
│   │   ├── entry.ts
│   │   ├── sync.ts
│   │   └── types.ts
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

- All-in-one Worker: `https://app.runt.run` (unified worker serving both backend and frontend)
- D1: Production data persistence
- R2: Artifact storage for large outputs
- Secrets: Auth tokens, API keys
- Runtime: Python execution via `@runt` packages

## Notes for AI Assistants

**Current Status - Production Deployment Working**

- **LiveStore foundation** - Real-time collaborative editing deployed and stable
- **Full Python execution** - Rich outputs working (matplotlib, pandas,
  IPython.display)
- **Complete AI integration** - Full notebook context awareness, can create and
  modify cells
- **Production deployment** - Cloudflare Pages + Workers with authentication

### Key Development Insights

- **Deployment Ready**: The full stack is working on Cloudflare infrastructure.
- **Rich outputs working**: Complete IPython display compatibility with matplotlib and pandas.
- **AI context awareness**: AI sees the full notebook state, including outputs.

### Immediate Technical Goals

- **User-attributed runtimes**: Implement API token system for "Bring Your Own Compute".
- **Automated runtime orchestration**: Develop production runtime provisioning.

### Communication Style

- Be direct about what works and what doesn't
- Focus on helping developers solve actual problems
- Use code examples over lengthy explanations
- Keep commit messages short and factual
- State facts without marketing language
- Say "this is a prototype" or "this part needs work" when true
- Always bring a towel

## Development Workflow Notes

- **User Environment**: The user will typically have:
  - Web client running in one tab (`pnpm dev`)
  - Wrangler server running in another tab (`pnpm dev:sync`)
  - Python runtime available via `pnpm dev:runtime` (uses @runt JSR packages,
    command customizable via VITE_RUNTIME_COMMAND)

**Checking Work**: To verify changes, run:

```bash
pnpm build           # Build all packages
pnpm lint            # Check code style
pnpm test            # Run test suite (58/58 passing)
pnpm type-check      # TypeScript validation
```

**If Dev Environment Not Running**: To start the development environment:

```bash
# Setup environment
pnpm install         # Install dependencies (includes linked @runt/schema)
cp .env.example .env # Copy environment template

# In separate terminals, run:
## Terminal 1:
pnpm dev             # Web client
## Terminal 2:
pnpm dev:sync        # Sync worker

# For Python runtime (get NOTEBOOK_ID from UI, then run):
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
- **Use technical terminology correctly**: Precision matters in technical
  communication

### Code Review Standards

- **Reference specific lines/functions**: Use exact file paths and line numbers
- **Explain the "why"**: Technical rationale behind changes
- **Highlight trade-offs**: Acknowledge design decisions and their implications
- **Suggest concrete improvements**: Actionable recommendations with code
  examples
- **Maintain consistency**: Follow existing patterns and conventions

### Problem-Solving Approach

- **Start with diagnosis**: Understand the system state before proposing
  solutions
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
