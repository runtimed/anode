# AI Agent Development Context

This document provides essential context for AI assistants working on the [Anode](https://github.com/runtimed/anode)
project.

Current work state and next steps. What works, what doesn't. Last updated: September 2025.

**Development Workflow**: The user will typically be running the services in separate terminal tabs from the conversation with you. If you need to check work it is advised to run type checks first followed by lints, tests, and a build of the UI. If the user isn't running the dev environment, recommend instructions from the [`README.md`](./README.md)

## Project Overview

Anode is a real-time collaborative notebook system built on LiveStore, an event-sourcing based local-first data synchronization library. In order to make this work, anode relies on runtime agents via the [`runt` packages released on jsr.io](https://github.com/runtimed/runt).

**Current Status**: A real-time collaborative notebook system deployed at https://app.runt.run. It features Python execution with rich outputs and integrated AI capabilities, all built on a unified, event-sourced output system. The system is stable and in production, with ongoing enhancements focused on runtime management.

## Architecture

- **Schema** (`jsr:@runt/schema`): LiveStore schema definitions (events, state,
  materializers) - Published JSR package imported by all packages with full type
  inference. Comes via https://github.com/runtimed/runt's deno monorepo
- **Web Client**: React-based web interface (locally served via vite, deployed as `ASSETS` from the cloudflare worker)
- **Document Worker**: Cloudflare Worker for sync backend and API (permissions, database, artifact storage)
- **Pyodide Runtime Agent**: Python execution client using @runt packages

## Key Dependencies

- **LiveStore**: Event-sourcing library for local-first apps
- **Effect**: Functional programming library for TypeScript
- **React**: UI framework
- **TypeScript**: Primary language

## Current Working State

### What's Actually Working ✅

- ✅ **LiveStore integration** - Event-sourcing with real-time collaboration
- ✅ **Execution** - Code cells run Python via Pyodide with rich outputs. Other languages can be implemented as new runtime agents.
- ✅ **Real-time collaboration** - Multiple users can edit notebooks
  simultaneously
- ✅ **Cell management** - Create, edit, delete cells with proper state
  sync
- ✅ **Rich output rendering** - Full IPython-style display support: matplotlib plots,
  pandas HTML, colored terminal output, images
- ✅ **AI integration** - Full notebook context awareness, sees previous cells
  and their outputs
- ✅ **AI tool calling** - Runtime agents can create, run, and modify cells in the same notebook. The framework for tools is more extensible as the primary pyodide runtime agent supports `@tool` decorators as well as the Model Context Protocol.
- ✅ **Context inclusion controls** - Users can exclude cells from AI context
  with visibility toggles
- ✅ **Production deployment** - All-in-one worker deployed to Cloudflare at
  https://app.runt.run
- ✅ **Authentication** - OIDC OAuth and fallback token system working in
  production
- ✅ **Mobile support** - Responsive design with mobile keyboard optimizations
- ✅ **Offline-first operation** - Works without network, syncs when connected
- ✅ **Package caching** - Pre-loading scientific stack (numpy, pandas,
  matplotlib) for faster startup
- ✅ **AI context with outputs** - AI sees execution results, not just source
  code, for intelligent assistance with data analysis
- ✅ **Artifact service** - Deployed with upload/download endpoints and R2 storage

### Core Architecture Constraints

- `NOTEBOOK_ID = STORE_ID`: Each notebook gets its own LiveStore database
- **Event-sourced state**: All changes flow through LiveStore events
- **Reactive execution**: `executionRequested` → `executionAssigned` →
  `executionStarted` → `executionCompleted` events, materialized table is an
  execution queue
- **Direct TypeScript schema**: No build step, imports work across packages
- **Session-based runtimes**: Each runtime restart gets unique `sessionId`
- **One runtime per notebook**: Each notebook is intended to have one active runtime at a time
- **Artifact storage**: Large outputs are placed in artifact storage for on demand retrieval as raw bytes. For example, instead of base64 encoded images for plots, the system returns the proper media type as `Content-Type` allowing to use regular `src=` attributes with an artifact URL.

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
pnpm install  # Install dependencies
cp .env.example .env  # Copy environment configuration
cp .dev.vars.example .dev.vars

# Start development servers in separate terminals
pnpm dev           # Frontend at http://localhost:5173
pnpm dev:sync      # Backend at http://localhost:8787
pnpm dev:iframe    # Iframe outputs at http://localhost:8000

# Start runtime (get command from notebook UI)
# Runtime command is now dynamic via VITE_RUNTIME_COMMAND environment variable
# Get runtime command from notebook UI, then:
NOTEBOOK_ID=notebook-id-from-ui pnpm dev:runtime

# Check work
pnpm check    # Type check, lint, and format check
pnpm test     # Run tests
pnpm build    # Build web UI
```

## Schema Linking for Development

The `@runt/schema` package provides the shared types and events between Anode and Runt. The linking method depends on your development phase:

### Production (JSR Package)

```json
"@runt/schema": "jsr:^0.11.1"
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
3. **Restart the vite web UI** (`pnpm dev`)

**Important**: Always ensure both repositories are using compatible schema versions. Type errors likely indicate schema mismatches.

## Current Priorities

**Current Focus**: Improving runtime management.

### Key Development Areas

1.  **Automated Runtime Management**: Reducing manual friction in starting and managing runtimes.
    - _Next Step_: Design runtime orchestration, implement one-click startup, and add health monitoring.

## Important Considerations

### Schema Design

- **JSR schema package**: `jsr:@runt/schema` provides zero-build-step imports
  with type inference across all packages

### Use top-level `useQuery` rather than `store.useQuery`

```typescript
// ❌ WRONG - This causes a react compiler ESLint error
import { useStore } from "@livestore/react";
// ...
const { store } = useStore();
const titleMetadata = store.useQuery(
  queryDb(tables.notebookMetadata.select().where({ key: "title" }).limit(1))
);
```

```typescript
// ✅ CORRECT - `useQuery` comes from an import
import { useQuery } from "@livestore/react";
// ...
const titleMetadata = useQuery(
  queryDb(tables.notebookMetadata.select().where({ key: "title" }).limit(1))
);
```

### Local-First Architecture

- All data operations happen locally first
- Events synced across clients via document worker
- SQLite provides local reactive state per notebook
- Network connectivity optional, but is essential for runtime access

### Code Style

- Prefer functional programming patterns
- Event sourcing over direct state mutations
- Reactive queries over imperative data fetching
- TypeScript strict mode enabled
- Granular, type-safe events with clear schemas
- Prefer specific event types over complex discriminated unions

## File Structure

```
.
├── AGENTS.md
├── assets
│   └── runt-magic.aseprite
├── backend
│   ├── api-key-provider.ts
│   ├── api-key-routes.ts
│   ├── auth.ts
│   ├── local_oidc.ts
│   ├── local-oidc-routes.ts
│   ├── middleware.ts
│   ├── notebook-permissions
│   │   ├── factory.ts
│   │   ├── local-permissions.ts
│   │   ├── no-permissions.ts
│   │   └── types.ts
│   ├── providers
│   │   ├── anaconda-api-key.ts
│   │   ├── anaconda.ts
│   │   ├── api-key-factory.ts
│   │   ├── index.ts
│   │   ├── local-api-key.ts
│   │   ├── local.ts
│   │   └── types.ts
│   ├── routes.ts
│   ├── selective-entry.ts
│   ├── sync.ts
│   ├── trpc
│   │   ├── db.ts
│   │   ├── index.ts
│   │   ├── trpc.ts
│   │   └── types.ts
│   ├── types.ts
│   ├── users
│   │   └── utils.ts
│   └── utils
│       └── notebook-id.ts
├── Caddyfile.example
├── components.json
├── CONTRIBUTING.md
├── DEPLOYMENT.md
├── docs
│   ├── api-keys.md
│   ├── proposals
│   │   ├── artifact-service-design.md
│   │   └── unified-output-system.md
│   ├── README.md
│   ├── technologies
│   │   ├── deno.md
│   │   ├── livestore.md
│   │   ├── pyodide.md
│   │   └── README.md
│   ├── tool-approval-system.md
│   └── ui-design.md
├── ecosystem.config.json
├── eslint.config.js
├── iframe-outputs
│   ├── README.md
│   ├── src
│   │   ├── components
│   │   │   └── IframeReactApp.tsx
│   │   ├── react-main.tsx
│   │   ├── react.html
│   │   ├── style.css
│   │   └── tsconfig.node.json
│   ├── test-iframe.html
│   ├── vite.config.ts
│   └── worker
│       ├── package.json
│       ├── pnpm-lock.yaml
│       ├── tsconfig.json
│       ├── worker.ts
│       └── wrangler.toml
├── index.html
├── LICENSE
├── migrations
│   ├── 0001_create_settings_table.sql
│   ├── 0002_create_users_table.sql
│   ├── 0004_create_notebooks_and_permissions.sql
│   ├── 0005_drop_runbook_tables.sql
│   └── 0006_create_tags_tables.sql
├── package.json
├── PM2-SETUP.md
├── pnpm-lock.yaml
├── public
│   ├── android-chrome-192x192.png
│   ├── bracket.png
│   ├── bunny-sit.png
│   ├── bunny.png
│   ├── favicon.ico
│   ├── hole.png
│   ├── runes.png
│   ├── shadow.png
│   └── site.webmanifest
├── README.md
├── ROADMAP.md
├── schema.ts
├── scripts
│   ├── deploy-iframe-outputs.sh
│   ├── dev-runtime.sh
│   ├── optimize-build.sh
│   ├── open-browser.sh
│   ├── start-runt-dev.sh
│   ├── test-api-key-flow.sh
│   ├── test-api-keys.sh
│   ├── use-runt.sh
│   └── watch-script.cjs
├── src
│   ├── auth
│   │   ├── AuthGuard.tsx
│   │   ├── AuthProvider.tsx
│   │   ├── index.ts
│   │   ├── LoginPrompt.tsx
│   │   ├── openid.ts
│   │   └── redirect-url-helper.ts
│   ├── components
│   │   ├── auth
│   │   │   └── ApiKeysDialog.tsx
│   │   ├── CollaboratorAvatars.tsx
│   │   ├── debug
│   │   │   ├── debug-mode.tsx
│   │   │   ├── DebugModeToggle.tsx
│   │   │   ├── DebugPanel.tsx
│   │   │   └── FPSMeter.tsx
│   │   ├── KeyboardShortcuts.tsx
│   │   ├── livestore
│   │   │   ├── CustomLiveStoreProvider.tsx
│   │   │   └── livestore.worker.ts
│   │   ├── loading
│   │   │   └── LoadingState.tsx
│   │   ├── logo
│   │   │   ├── index.ts
│   │   │   ├── PixelatedCircle.tsx
│   │   │   ├── RuntLogo.tsx
│   │   │   └── RuntLogoSmall.tsx
│   │   ├── notebook
│   │   │   ├── cell
│   │   │   │   ├── Cell.tsx
│   │   │   │   ├── CellAdder.tsx
│   │   │   │   ├── CellBetweener.tsx
│   │   │   │   ├── ExecutableCell.tsx
│   │   │   │   ├── MarkdownCell.tsx
│   │   │   │   ├── shared
│   │   │   │   │   ├── AiCellTypeSelector.tsx
│   │   │   │   │   ├── CellContainer.tsx
│   │   │   │   │   ├── CellControls.tsx
│   │   │   │   │   ├── CellTypeSelector.tsx
│   │   │   │   │   ├── Editor.tsx
│   │   │   │   │   ├── editorUtils.ts
│   │   │   │   │   ├── ExecutionStatus.tsx
│   │   │   │   │   ├── OutputsErrorBoundary.tsx
│   │   │   │   │   ├── PlayButton.tsx
│   │   │   │   │   ├── PresenceBookmarks.tsx
│   │   │   │   │   └── PresenceIndicators.css
│   │   │   │   └── toolbars
│   │   │   │       ├── AiToolbar.tsx
│   │   │   │       ├── CodeToolbar.tsx
│   │   │   │       └── SqlToolbar.tsx
│   │   │   ├── CellList.tsx
│   │   │   ├── codemirror
│   │   │   │   ├── baseExtensions.ts
│   │   │   │   └── CodeMirrorEditor.tsx
│   │   │   ├── ContextSelectionModeButton.tsx
│   │   │   ├── EmptyStateCellAdder.tsx
│   │   │   ├── GitCommitHash.tsx
│   │   │   ├── NotebookContent.tsx
│   │   │   ├── NotebookLoadingScreen.tsx
│   │   │   ├── NotebookTitle.tsx
│   │   │   ├── RuntimeHealthIndicator.tsx
│   │   │   ├── RuntimeHealthIndicatorButton.tsx
│   │   │   ├── RuntimeHelper.tsx
│   │   │   └── signals
│   │   │       ├── ai-context.ts
│   │   │       └── focus.ts
│   │   ├── notebooks
│   │   │   ├── DebugNotebooks.tsx
│   │   │   ├── notebook
│   │   │   │   └── TitleEditor.tsx
│   │   │   ├── NotebookActions.tsx
│   │   │   ├── NotebookCard.tsx
│   │   │   ├── NotebookDashboard.tsx
│   │   │   ├── NotebookPage.tsx
│   │   │   ├── NotebookViewer.tsx
│   │   │   ├── SharingModal.tsx
│   │   │   ├── SimpleUserProfile.tsx
│   │   │   ├── TagActions.tsx
│   │   │   ├── TagBadge.tsx
│   │   │   ├── TagColorPicker.tsx
│   │   │   ├── TagCreationDialog.tsx
│   │   │   ├── TagEditDialog.tsx
│   │   │   ├── TagSelectionDialog.tsx
│   │   │   └── types.ts
│   │   ├── outputs
│   │   │   ├── index.ts
│   │   │   ├── MaybeCellOutputs.tsx
│   │   │   └── shared-with-iframe
│   │   │       ├── AiToolApprovalOutput.tsx
│   │   │       ├── AiToolCallOutput.tsx
│   │   │       ├── AiToolResultOutput.tsx
│   │   │       ├── AnsiOutput.tsx
│   │   │       ├── comms.ts
│   │   │       ├── HtmlOutput.tsx
│   │   │       ├── ImageOutput.tsx
│   │   │       ├── JsonOutput.tsx
│   │   │       ├── MarkdownRenderer.tsx
│   │   │       ├── PlainTextOutput.tsx
│   │   │       ├── README.md
│   │   │       ├── RichOutputContent.tsx
│   │   │       ├── SingleOutput.tsx
│   │   │       ├── SuspenseSpinner.tsx
│   │   │       └── SvgOutput.tsx
│   │   ├── TrpcProvider.tsx
│   │   └── ui
│   │       ├── Avatar.tsx
│   │       ├── AvatarWithDetails.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── DateDisplay.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── separator.tsx
│   │       ├── sonner.tsx
│   │       ├── Spinner.tsx
│   │       ├── tabs.tsx
│   │       ├── TerminalPlay.tsx
│   │       ├── textarea.tsx
│   │       └── tooltip.tsx
│   ├── hooks
│   │   ├── useAddCell.ts
│   │   ├── useApiKeys.ts
│   │   ├── useCellContent.ts
│   │   ├── useCellKeyboardNavigation.ts
│   │   ├── useCellOutputs.tsx
│   │   ├── useCellPresence.ts
│   │   ├── useDeleteCell.ts
│   │   ├── useEditorRegistry.ts
│   │   ├── useInterruptExecution.ts
│   │   ├── useRuntimeHealth.ts
│   │   ├── useToolApprovals.ts
│   │   └── useUserRegistry.ts
│   ├── index.css
│   ├── lib
│   │   ├── tag-colors.ts
│   │   ├── trpc-client.tsx
│   │   └── utils.ts
│   ├── main.tsx
│   ├── pages
│   │   ├── AuthorizePage.tsx
│   │   ├── NotebookPage.tsx
│   │   ├── NotebooksDashboardPage.tsx
│   │   └── OidcCallbackPage.tsx
│   ├── queries
│   │   ├── index.ts
│   │   └── outputDeltas.ts
│   ├── routes.tsx
│   ├── schema.ts
│   ├── services
│   │   └── userTypes.ts
│   ├── types
│   │   ├── misc.d.ts
│   │   └── psl.d.ts
│   ├── util
│   │   ├── ai-models.ts
│   │   ├── ansi-cleaner.test.ts
│   │   ├── ansi-cleaner.ts
│   │   ├── avatar.ts
│   │   ├── domUpdates.ts
│   │   ├── iframe.ts
│   │   ├── output-grouping.ts
│   │   ├── prefetch.ts
│   │   ├── runtime-command.ts
│   │   ├── store-id.ts
│   │   └── url-utils.ts
│   └── vite-env.d.ts
├── test
│   ├── api-keys.test.ts
│   ├── artifact-service.test.ts
│   ├── backend-local-oidc.test.ts
│   ├── basic.test.ts
│   ├── components
│   │   └── outputs
│   │       └── AiToolResultOutput.test.tsx
│   ├── edge-cases.test.ts
│   ├── fixtures
│   │   └── index.ts
│   ├── focused-cell-signal.test.ts
│   ├── hono-routes.test.ts
│   ├── integration
│   │   ├── execution-flow.test.ts
│   │   └── reactivity-debugging.test.ts
│   ├── local-oidc-routes.test.ts
│   ├── output-grouping.test.ts
│   ├── README.md
│   ├── runtime-command.test.ts
│   └── setup.ts
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.test.json
├── vite-plugins
│   ├── env-validation.ts
│   └── inject-loading-screen.ts
├── vite.config.ts
├── vitest.config.ts
└── wrangler.toml
```

**Deployment (Cloudflare):**

- Primary all-in-one Worker: `https://app.runt.run` (unified worker serving both backend and frontend)
- D1: Production data persistence
- R2: Artifact storage for large outputs
- Runtime: Python execution via `@runt` packages
- Separate domain for IFrame `https://runtusercontent.com`

## Development Workflow Notes

- **User Environment**: The user will typically have:
  - Frontend server running (`pnpm dev`) on port 5173
  - Backend sync server running (`pnpm dev:sync`) on port 8787
  - Iframe outputs server running (`pnpm dev:iframe`) on port 8000
  - Runtime agent running on demand for notebooks they're working with (uses `@runt` JSR packages)

**Checking Work**: To verify changes, run:

```bash
pnpm build           # Build all packages
pnpm lint            # Check code style
pnpm test            # Run test suite
pnpm type-check      # TypeScript validation
pnpm check           # Run all checks at once
```

**Development Stability**: Both the vite web server and the wrangler-backed backend should reload properly for most changes. Feel free to check with the user to see if this is the case.

**For detailed development priorities, see [ROADMAP.md](./ROADMAP.md)**

## Communication Guidelines for AI Assistants

### Communication Style

- Be direct about what works and what doesn't
- Focus on helping developers solve actual problems
- Use code examples over lengthy explanations
- Keep commit messages short and factual
- State facts without marketing language
- Say "this is a prototype" or "this part needs work" when true
- Always bring a towel

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
