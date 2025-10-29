# AI Agent Development Context

This document provides essential context for AI assistants working on the [In the Loop](https://github.com/runtimed/intheloop) project.

Current work state and development priorities. What works, what's experimental, what needs improvement. Last updated: October 2025.

**Development Workflow**: The user typically runs the integrated development server (`pnpm dev`) which handles both frontend and backend. For checking work, run type checks first, followed by lints, tests, and UI builds. The iframe outputs server runs separately (`pnpm dev:iframe`).

## Project Overview

In the Loop is a real-time collaborative notebook system built on event-sourced architecture using LiveStore. It supports multiple runtime paradigms: external runtime agents via `@runt` JSR packages, and in-browser runtime agents for HTML and Python (Pyodide) that execute directly in the web client.

**Current Status**: A working system deployed at https://app.runt.run. Features real-time collaboration, persistent execution outputs, and integrated AI capabilities. The system is stable for experimentation and real usage while actively developed.

## Architecture

### Monorepo Structure

In the Loop is organized as a monorepo with four core packages and a unified web application:

- **Packages** (`packages/`): Core libraries published to npm/JSR for runtime agent development
- **Web Client** (`src/`): React-based notebook interface with integrated backend
- **Backend** (`backend/`): Cloudflare Worker serving API and sync functionality
- **Runtime Agents**: External (via @runt JSR packages) and in-browser (HTML/Python) execution

### Core Packages

- **`@runtimed/schema`**: LiveStore schema definitions with full type inference across packages
- **`@runtimed/agent-core`**: Runtime agent framework with artifact storage and observability
- **`@runtimed/ai-core`**: Multi-provider AI integration (OpenAI, Ollama, Groq) with tool calling
- **`@runtimed/pyodide-runtime`**: In-browser Python runtime with scientific computing stack

### Key Dependencies

- **LiveStore**: Event-sourcing library for local-first collaborative applications
- **Effect**: Functional programming library for TypeScript with precise error handling
- **React**: UI framework with CodeMirror editors and Radix UI components
- **Cloudflare Workers**: Runtime for production deployment with D1/R2 storage

## Current Working State

### What's Working ✅

- ✅ **Event-sourced architecture** - All changes preserved through LiveStore events
- ✅ **Three runtime paradigms** - External agents, in-browser HTML, in-browser Python
- ✅ **Real-time collaboration** - Multiple users editing simultaneously without conflicts
- ✅ **Rich output system** - matplotlib plots, pandas DataFrames, terminal colors, images
- ✅ **AI integration** - Context-aware AI sees both code and execution results
- ✅ **Tool calling system** - AI can create, modify, and execute cells with approval
- ✅ **Persistent computation** - Outputs survive browser crashes and network drops
- ✅ **Mobile responsiveness** - Notebook editing works on mobile devices
- ✅ **Offline-first operation** - Local-first with sync when connected
- ✅ **Production deployment** - Unified Cloudflare Worker at https://app.runt.run
- ✅ **Authentication system** - OIDC OAuth with fallback token authentication
- ✅ **Package caching** - Pyodide pre-loads scientific stack for faster startup
- ✅ **Artifact service** - Large outputs stored in R2 with proper media types
- ✅ **Integrated development** - Single `pnpm dev` command runs frontend+backend

### Core Architecture Constraints

- `NOTEBOOK_ID = STORE_ID`: Each notebook has its own LiveStore database instance
- **Event-sourced state**: All mutations flow through LiveStore events, never direct state changes
- **Reactive execution**: `executionRequested` → `executionAssigned` → `executionStarted` → `executionCompleted`
- **Package workspace linking**: All packages use `workspace:*` for local development
- **Session-based runtimes**: Each restart gets unique `sessionId` for conflict resolution
- **Soft shutdown model**: Runtime agents can stop without affecting notebook state
- **Artifact-first outputs**: Large data stored as artifacts with proper Content-Type headers

### Runtime-Notebook Relationship

**Multiple Runtime Support**: Notebooks can have external agents, in-browser agents, or both, but typically one active runtime at a time for execution coherence.

**Runtime Lifecycle**:

- Notebook created → No runtime (user chooses which to start)
- External agent → Connects via WebSocket with API key authentication
- In-browser agent → Launches directly in browser tab sharing LiveStore
- Runtime restart → Brief overlap during handoff, then cleanup

**Current Implementation**: Manual runtime selection with UI-driven startup. Automatic orchestration and health monitoring planned but not implemented.

## Development Commands

```bash
# Setup
pnpm install         # Install dependencies
cp .env.example .env # Copy environment files
cp .dev.vars.example .dev.vars

# Development (integrated server)
pnpm dev            # Frontend + backend at http://localhost:5173
pnpm dev:iframe     # Iframe outputs at http://localhost:8000

# Runtime options:
# 1. External agent (copy command from notebook UI)
NOTEBOOK_ID=notebook-xyz pnpm dev:runtime

# 2. In-browser agents (launch via Runtime Panel in UI)
# Click Runtime button → Launch HTML/Python Runtime

# Quality checks
pnpm check          # Type check + lint + format check
pnpm test           # Run test suite
pnpm test:integration # Integration tests only
pnpm build          # Build web UI

# Package development
pnpm --filter schema type-check    # Check specific package
pnpm --filter agent-core lint      # Lint specific package
```

## Package Development

### Local Development Setup

All packages use `workspace:*` dependencies for local development:

```json
"@runtimed/schema": "workspace:*"
```

### Package Publishing

Packages are published to both npm and JSR:

```bash
# Test publishing process
pnpm --filter schema run test-publish

# Publish schema changes
pnpm bump-schema        # Updates version across package.json and jsr.json
git tag v0.2.1          # Tag the release
git push origin v0.2.1  # Triggers CI/CD publishing
```

### Schema Versioning

The schema package is the cornerstone - all other packages depend on it:

- **Development**: Use `workspace:*` for all local work
- **Production**: Published versions ensure compatibility
- **Version sync**: `bump-schema` script maintains consistency

## Current Priorities

**Current Focus**: Runtime management improvements and developer experience.

### Key Development Areas

1. **One-click runtime startup**: Reduce friction from copy-paste commands to single button clicks
2. **Runtime orchestration**: Automatic health monitoring and restart handling
3. **Improved error handling**: Better guidance when runtimes fail or disconnect
4. **Performance optimization**: Large notebook handling and output streaming

## Important Considerations

### Schema Design Philosophy

The schema package provides zero-build-step imports with complete type inference:

```typescript
// ✅ Direct import with full types
import { events, tables, queryDb } from "@runtimed/schema";

// Event creation with type safety
store.commit(
  events.cellCreated({
    id: "cell-123",
    cellType: "code",
    fractionalIndex: "a0",
    createdBy: userId,
  })
);
```

### Use Top-Level `useQuery` Rather Than `store.useQuery`

```typescript
// ❌ WRONG - Causes React compiler errors
import { useStore } from "@livestore/react";
const { store } = useStore();
const cells = store.useQuery(queryDb(tables.cells.select()));
```

```typescript
// ✅ CORRECT - Direct import pattern
import { useQuery } from "@livestore/react";
const cells = useQuery(queryDb(tables.cells.select()));
```

### Event-First Architecture

- Prefer granular events over complex state mutations
- Events should be self-contained and not require additional context
- Use materializers to build reactive derived state
- Never bypass events for direct state changes

### Local-First Principles

- All operations work offline first
- Network sync is enhancement, not requirement
- SQLite provides fast local queries per notebook
- Events sync across clients via WebSocket when connected

### Code Style Guidelines

- **Functional programming**: Effect-based error handling, immutable patterns
- **Type safety**: Strict TypeScript with inference over assertions
- **Event sourcing**: Explicit events over implicit state changes
- **Reactive queries**: LiveStore queries over imperative data fetching
- **Component composition**: Small, focused components over large monoliths

## File Structure

```
.
├── packages/
│   ├── schema/          # Event definitions and types
│   ├── agent-core/      # Runtime agent framework
│   ├── ai-core/         # AI provider integrations
│   └── pyodide-runtime/ # In-browser Python runtime
├── src/                 # Web client application
│   ├── components/      # React UI components
│   ├── runtime/         # In-browser runtime agents
│   ├── hooks/           # React hooks for state management
│   └── util/            # Utility functions
├── backend/             # Cloudflare Worker backend
│   ├── providers/       # Authentication providers
│   ├── trpc/           # Type-safe API endpoints
│   └── notebook-permissions/ # Access control
├── iframe-outputs/      # Sandboxed output rendering
├── test/               # Test suites
├── scripts/            # Development and deployment scripts
└── docs/               # Documentation
```

## Development Workflow Notes

**User Environment**: The user typically has:

- Integrated dev server running (`pnpm dev`) on port 5173
- Iframe outputs server running (`pnpm dev:iframe`) on port 8000
- Runtime agents: either external (via terminal command) or in-browser (via UI panel)

**Development Stability**: The integrated Vite server handles both frontend and backend, reloading automatically for most changes. The iframe server runs separately to provide sandboxed output rendering.

**Checking Work**: To verify changes:

```bash
pnpm check           # All quality checks at once
pnpm type-check      # TypeScript validation
pnpm lint           # Code style checks
pnpm test           # Test suite
pnpm build          # Production build test
```

**Package Changes**: When modifying packages, restart the dev server to ensure workspace linking updates are applied.

## Runtime Agent Development

### External Runtime Agents

Built using `@runtimed/agent-core` and deployed as separate processes:

```typescript
import { RuntimeAgent } from "@runtimed/agent-core";

const agent = new RuntimeAgent(config, capabilities);
await agent.start();
```

### In-Browser Runtime Agents

Extend `LocalRuntimeAgent` for browser-based execution:

```typescript
import { LocalRuntimeAgent } from "@/runtime/LocalRuntimeAgent";

class MyRuntimeAgent extends LocalRuntimeAgent {
  protected getRuntimeType(): string {
    return "my-runtime";
  }

  protected getCapabilities(): RuntimeCapabilities {
    return {
      canExecuteCode: true,
      canExecuteAi: false,
      availableAiModels: [],
    };
  }
}
```

## Testing Strategy

- **Unit tests**: Components and utility functions with Vitest
- **Integration tests**: Full workflow testing with real LiveStore
- **E2E tests**: Critical paths like notebook creation and execution
- **Package tests**: Each package has its own test suite
- **CI/CD**: GitHub Actions run tests on all PRs

## Communication Guidelines for AI Assistants

### Senior Engineering Collaboration

- **Write for experienced developers**: Assume deep technical knowledge
- **Be precise and direct**: Remove redundant explanations
- **Lead with facts**: State current system behavior, not aspirational goals
- **Show working code**: Demonstrate solutions with actual implementations
- **Identify root causes**: Address architectural issues, not just symptoms
- **Use exact terminology**: Precision matters in technical discussions

### Code Review Standards

- **Reference specific locations**: Use exact file paths and line numbers
- **Explain the "why"**: Technical rationale behind architectural decisions
- **Highlight trade-offs**: Acknowledge design decisions and their implications
- **Suggest concrete improvements**: Actionable recommendations with examples
- **Maintain consistency**: Follow established patterns and conventions

### Problem-Solving Approach

- **Start with system diagnosis**: Understand current state before proposing changes
- **Use systematic debugging**: Add logging, isolate components, test hypotheses
- **Verify assumptions**: Check actual behavior against expected behavior
- **Consider edge cases**: Think through failure modes and boundary conditions
- **Document findings**: Leave clear context for future development

### Technical Communication

- **Use established vocabulary**: Stick to known technical terms
- **Be specific with versions**: Reference exact package versions, commit hashes
- **Include reproduction steps**: Clear instructions for recreating issues
- **Separate concerns**: Distinguish between bugs, features, and technical debt
- **Quantify when possible**: Use metrics and concrete measurements

### Development Context Awareness

- **Package interdependencies**: Understand how schema changes affect all packages
- **Runtime implications**: Consider how changes affect external vs in-browser agents
- **Event-sourcing constraints**: Ensure proposals fit event-driven architecture
- **Collaboration impact**: Think about real-time collaborative implications
- **Performance considerations**: Understand implications for large notebooks

This system is built for experimentation and real-world usage. Help developers build and extend it effectively.
