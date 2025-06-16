# AI Agent Development Context

This document provides essential context for AI assistants working on the Anode project.

For current work state and immediate next steps, see `HANDOFF.md` - it provides an honest assessment of what's working versus what needs development.

**Development Workflow**: The user will typically be running the wrangler server and web client in separate tabs. If you need to check work, run a build and/or lints, tests, typechecks. If the user isn't running the dev environment, tell them how to start it at the base of the repo with pnpm.

## Project Overview

Anode is a real-time collaborative notebook system built on LiveStore, an event-sourcing based local-first data synchronization library. The project uses a monorepo structure with TypeScript and pnpm workspaces.

**Current Status**: Working prototype with collaborative editing, Python execution, and basic AI integration functional. Rich outputs need verification.

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

### What's Actually Working ✅
- ✅ **LiveStore integration** - Event-sourcing with real-time collaboration working reliably
- ✅ **Basic Python execution** - Code cells run Python via Pyodide (manual kernel startup)
- ✅ **Real-time collaboration** - Multiple users can edit notebooks simultaneously
- ✅ **Cell management** - Create, edit, move, delete cells with proper state sync
- ✅ **Reactive architecture** - Kernel work detection without polling delays
- ✅ **Text output handling** - Basic print statements and error display
- ✅ **AI integration** - OpenAI API responses when OPENAI_API_KEY is set, graceful fallback to mock
- ✅ **Offline-first operation** - Works without network, syncs when connected

### What Needs Enhancement 🚧
- 🚧 **Rich output rendering** - IPython integration code exists but needs verification
- 🚧 **AI context awareness** - AI doesn't see previous cells or notebook context
- 🚧 **AI notebook tools** - AI can't modify cells, create new cells, or run code
- 🚧 **Display system** - Matplotlib, pandas support partially implemented
- 🚧 **Automated kernel management** - Manual startup creates friction

### Core Architecture Features
- `NOTEBOOK_ID = STORE_ID`: Each notebook gets its own LiveStore database
- **Event-sourced state**: All changes flow through LiveStore events
- **Reactive execution**: `executionRequested` → `executionAssigned` → `executionStarted` → `executionCompleted`
- **Direct TypeScript schema**: No build step, imports work across packages
- **Session-based kernels**: Each kernel restart gets unique `sessionId`

## Development Commands

```bash
# Setup
cp .env.example .env     # Configure environment (optional: uncomment OPENAI_API_KEY)

# Start core services (web + sync)
pnpm dev

# Start kernel (get command from notebook UI)
# Get kernel command from notebook UI, then:
NOTEBOOK_ID=notebook-id-from-ui pnpm dev:kernel

# Utilities
pnpm reset-storage  # Clear all local storage
```

## Immediate Priorities

**Priority Focus**: Verify core functionality works, then remove friction

### Phase 1: Prove It Works (Next 2 weeks)
- **Integration Testing** - Real Pyodide tests to verify Python execution claims
- **Rich Output Verification** - Test matplotlib, pandas, IPython.display actually work
- **Automated Kernel Management** - Remove manual `NOTEBOOK_ID=xyz pnpm dev:kernel` friction
- **Error Handling** - Better user feedback when things fail

### Phase 2: Advanced Features (Next 1-2 months)
- **Enhanced AI Integration** - Context awareness and notebook modification tools
- **SQL Cell Implementation** - Database connections and query results
- **Interactive Widgets** - IPython widgets support for collaborative elements
- **Authentication System** - Google OAuth with proper session management

### Phase 3: Production (Next quarter)
- **Performance Optimization** - Handle large notebooks efficiently
- **Code Completions** - LSP + kernel-based suggestions
- **Advanced Visualizations** - 3D plots, interactive charts
- **Production Deployment** - Self-hosted and cloud options

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
anode2/
├── shared/
│   └── schema.ts         # LiveStore schema - TypeScript source directly imported by all packages
├── packages/
│   ├── web-client/       # React web application
│   ├── docworker/        # Cloudflare Worker sync backend
│   └── dev-server-kernel-ls-client/  # Python kernel server
├── docs/                 # Documentation directory
│   ├── README.md         # Documentation index
│   ├── OPENAI_INTEGRATION.md # AI setup and usage guide
│   ├── DISPLAY_SYSTEM.md # Display system architecture
│   ├── TESTING.md        # Testing strategy and gaps
│   ├── UI_DESIGN.md      # Interface design guidelines
│   └── display-examples.md # Practical usage examples
├── HANDOFF.md           # Current work state and priorities
├── ROADMAP.md           # Long-term vision and milestones
├── package.json         # Root workspace configuration
└── pnpm-workspace.yaml  # Dependency catalog
```

## Notes for AI Assistants

### Current State - Working Prototype 
- **LiveStore foundation** solid with real-time collaborative editing
- **Basic Python execution** working via Pyodide (needs integration testing)
- **Rich output system** architecture in place but verification needed
- **AI integration** - OpenAI API working but lacks notebook context and tools
- **Direct TypeScript schema** - No build complexity across packages
- **Event-sourced architecture** - Excellent debugging and audit capabilities

### Key Development Insights
- **LiveStore integration** provides solid collaborative foundation
- **Reactive architecture** eliminates polling delays for execution
- **Event sourcing** enables powerful undo/redo and conflict resolution
- **Direct function calls** approach eliminates quote escaping complexity
- **Unified execution system** makes all cell types work through same queue
- **Manual kernel startup** creates significant user friction

### Immediate Technical Goals
- **Integration testing** to verify Python execution and rich outputs actually work
- **Enhanced AI integration** - Add notebook context awareness and tools for modifying cells
- **Automated kernel management** to remove manual startup friction
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
- Manual kernel startup as needed (`NOTEBOOK_ID=xyz pnpm dev:kernel`)

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
cp .env.example .env # Configure environment

# Start core services
pnpm dev             # Web client + sync backend

# In separate terminal, get kernel command from notebook UI
# Then run: NOTEBOOK_ID=notebook-id-from-ui pnpm dev:kernel
```

## Important Development Notes

**Do NOT use manual timestamps in code or events.** LiveStore automatically handles all timing through its event sourcing system. Focus development on features and architecture rather than timestamp management.

**Testing is Critical**: Many claims about functionality need verification through proper integration tests. Core features exist but integration testing is minimal.

**Kernel Management**: Manual kernel startup (copying command from UI) creates user friction and should be a high priority to fix.

**Be Honest About Status**: This is a prototype with great potential, not a production-ready system. The LiveStore foundation is solid, but execution and rich output claims need verification.