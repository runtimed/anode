# In the Loop

**The notebook that thinks with you.**

In the Loop is an **agentic notebook** where AI, code, and prose work together in
real-time. Never lose your outputs when tabs close. Collaborate with AI that
sees your data, not just your code. Built on event-sourced architecture for
persistent, collaborative computation.

**Status**: Working system deployed at https://app.runt.run - stable for experimentation and real usage, actively developed.

## The Jupyter Problem We're Solving

As a long-time Jupyter contributor, I've always wanted to solve a core
architectural limitation: computation and documentation are artificially
coupled.

At Netflix, I watched people hold their laptops open walking to the parking lot,
hoping their Spark jobs would finish before they lost their browser session.
Your analysis is running on powerful clusters, but the results only "exist" in
your specific browser tab.

**The core problem**: You can't open the same notebook in multiple tabs.
Multiple people can't collaborate on the same server without conflicts. Your
work is trapped in a single browser session.

**Why this happens**: Jupyter's architecture wasn't designed for concurrent
access. The notebook exists as a file on disk, but the live state (outputs,
execution results) only lives in your browser. Close that tab, and you lose the
connection to work happening elsewhere.

**In the Loop's approach**: Persistent outputs that survive browser crashes, tab
closures, and device switches. Real-time collaboration without conflicts. AI
that sees your actual results. Full Jupyter compatibility through .ipynb
import/export. Your computation lives independently of any browser session.

## Architecture

In the Loop is built as a monorepo with four core packages and a unified web client:

### Core Packages (`packages/`)

- **`@runtimed/schema`** - Event-sourced schema definitions with full type safety across the ecosystem
- **`@runtimed/agent-core`** - Runtime agent framework with artifact storage and observability
- **`@runtimed/ai-core`** - Multi-provider AI integration (OpenAI, Ollama, Groq) with tool calling
- **`@runtimed/pyodide-runtime`** - In-browser Python runtime with scientific computing stack

### Runtime System

In the Loop supports **three execution paradigms**:

1. **External Runtime Agents** - Python execution via `@runt/pyodide-runtime-agent` (JSR package)
2. **In-Browser HTML Runtime** - Direct DOM execution for HTML/CSS/JavaScript
3. **In-Browser Python Runtime** - Pyodide-powered Python with numpy, pandas, matplotlib

All runtimes share the same LiveStore event-sourced backend for consistent state management.

### Key Technologies

- **LiveStore** - Event-sourcing library for local-first apps with real-time sync
- **Effect** - Functional programming library for TypeScript
- **React** - UI framework with CodeMirror editors
- **Cloudflare Workers** - Production deployment with D1 (SQLite) and R2 (object storage)

## Quick Start

**Requirements**: Node.js >=23.0.0 (use `nvm use` to automatically switch)

### 1. Install and Configure

```bash
pnpm install  # Install dependencies

# Copy environment configuration files
cp .env.example .env
cp .dev.vars.example .dev.vars

# Start integrated development server (frontend + backend)
pnpm dev           # http://localhost:5173

# Start iframe outputs server (separate terminal)
pnpm dev:iframe    # http://localhost:8000
```

The example files contain working defaults for local development:

- `.env.example` → `.env` - Frontend environment variables (Vite)
- `.dev.vars.example` → `.dev.vars` - Backend environment variables (Worker)

### 2. Create Your First Notebook

1. Open http://localhost:5173
2. Click "New Notebook"
3. Start creating cells and editing

### 3. Start a Runtime (Three Options)

**Option A: External Runtime Agent**

- Create a `RUNT_API_KEY` via your user profile
- Click the **Runtime** button in the notebook header
- Copy the exact `NOTEBOOK_ID=xxx pnpm dev:runtime` command shown
- Run that command in your terminal

**Option B: In-Browser HTML Runtime**

- Click the **Runtime** button in the notebook header
- Click **Launch HTML Runtime**
- Start writing HTML/CSS/JavaScript immediately

**Option C: In-Browser Python Runtime**

- Click the **Runtime** button in the notebook header
- Click **Launch Python Runtime**
- Full Python with scientific stack loads in ~10 seconds

### 4. Execute Code

- Add a code cell in the web interface
- Write Python: `import numpy as np; np.random.random(5)`
- Press **Ctrl+Enter** or click **Run**
- See results appear instantly across all connected clients

## What Works Today

### 🌎 AI Integration

- Models see both code and execution results (not just source)
- AI can create and modify cells with approval system
- Multi-provider support: OpenAI, Ollama, Groq
- Context-aware responses based on notebook state

### 🔄 Persistent Computation

- Outputs survive runtime crashes, browser restarts, network drops
- Event-sourced architecture preserves every change
- Work offline, sync when connected
- Rich multimedia outputs: plots, tables, terminal colors, images

### 👥 Real-Time Collaboration

- Multiple users editing simultaneously without conflicts
- Live presence indicators and collaborative cursors
- Mobile-responsive design for editing anywhere
- Share notebooks by copying the URL

### 🚀 Runtime Flexibility

- **External agents** for production compute integration
- **In-browser HTML** for immediate prototyping
- **In-browser Python** for self-contained data science
- Soft shutdown preserves state across runtime switches

### 🛠 Development Experience

- Integrated dev server (no separate backend process needed)
- Hot reload for UI changes
- Comprehensive testing with integration coverage
- Bundle analysis and performance monitoring

## Environment Variables

### Runtime Logging

- `VITE_RUNT_LOG_LEVEL`: Control runtime agent verbosity
  - `DEBUG`: All logs including debug info
  - `INFO`: Informational and above (default dev)
  - `WARN`: Warnings and errors only
  - `ERROR`: Errors only (default production)

Example:

```bash
# Enable verbose logging for troubleshooting
VITE_RUNT_LOG_LEVEL=DEBUG pnpm dev

# Quiet mode for clean output
VITE_RUNT_LOG_LEVEL=ERROR pnpm dev
```

See `.env.example` and `.dev.vars.example` for complete configuration options.

## Deployment

In the Loop runs on **Cloudflare Workers** with a unified architecture:

- **Single Worker** serves both frontend assets and backend API
- **D1 Database** stores LiveStore events for persistence
- **R2 Bucket** handles artifact storage for large outputs
- **Durable Objects** manage WebSocket connections for real-time sync

This architecture provides robust collaboration and artifact storage while simplifying deployment.

## Development Commands

```bash
# Development
pnpm dev              # Integrated server (frontend + backend)
pnpm dev:iframe       # Iframe outputs server
pnpm dev:runtime      # External runtime agent (get command from UI)

# Quality Checks
pnpm check            # Type check + lint + format check
pnpm test             # Run test suite
pnpm test:integration # Integration tests only

# Building
pnpm build            # Build for development
pnpm build:production # Optimized production build
```

## Troubleshooting

| Problem                | Solution                                                       |
| ---------------------- | -------------------------------------------------------------- |
| Schema errors          | Restart all services after package changes                     |
| Runtime not connecting | Check API key creation and copy exact command from UI          |
| Dev server crashes     | Run `pnpm dev` again - .env changes don't auto-restart         |
| Build failures         | Run `pnpm type-check` to identify TypeScript issues            |
| Lost notebooks         | Run `rm -rf .wrangler` ⚠️ **WARNING: This deletes local data** |

## Package Development

The monorepo structure allows local development of runtime packages:

```bash
# Work on schema changes
cd packages/schema
pnpm type-check

# Test agent-core modifications
cd packages/agent-core
pnpm lint

# All packages use workspace:* dependencies for local development
```

Schema changes automatically propagate to all consuming packages through workspace linking.

## What's Experimental vs Stable

### Stable Foundation

- ✅ LiveStore event-sourcing architecture
- ✅ Real-time collaboration without conflicts
- ✅ Multi-runtime execution support
- ✅ Rich output rendering system
- ✅ Offline-first operation with sync

### Active Development

- 🧪 AI model selection and prompt engineering
- 🧪 Runtime orchestration and health monitoring
- 🧪 Permissions and sharing workflows
- 🧪 Performance optimization for large notebooks
- 🧪 Additional language runtimes

### Known Limitations

- Manual runtime startup (working toward one-click)
- Single active runtime per notebook
- Limited error recovery guidance
- No runtime resource limits

## Contributing

We're building this in the open and welcome experimentation:

**🤖 Improve AI Integration**

- Test AI tool calling with your workflows
- Experiment with different model providers
- Build custom tool registries

**⚡ Runtime Development**

- Create runtime agents for new languages
- Improve Python package management
- Build compute backends (BYOC)

**🔗 Extend Capabilities**

- Add SQL cell support for database workflows
- Build interactive widgets
- Create visualization plugins

**🌟 Real-World Usage**

Use In the Loop for actual data science work

- Report issues and workflow friction
- Share feedback on collaboration features

Ready to contribute? The system is stable enough for real use while being open to changes.

## Documentation

- **[Development Context](./AGENTS.md)** - Complete technical documentation for contributors
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment instructions
- **[Roadmap](./ROADMAP.md)** - Development priorities and future plans

## License

BSD 3-Clause
