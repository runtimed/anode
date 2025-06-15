# Anode

A real-time collaborative notebook system built on LiveStore, focusing on seamless AI ↔ Python ↔ User interactions.

**Current Status: ✅ FULLY OPERATIONAL** - Zero-latency Python execution with reactive architecture and rich outputs working end-to-end.

## What Makes Anode Different

- **Real-time collaboration** built on event sourcing (LiveStore)
- **Zero-latency execution** using reactive subscriptions (no polling)
- **Rich output rendering** with HTML tables, SVG plots, and markdown
- **AI-first design** for intelligent code assistance and context-aware suggestions
- **Local-first architecture** with offline capability

## Quick Start

### 1. Install and Start Core Services
```bash
pnpm install
pnpm dev  # Starts web client + sync backend
```

### 2. Create Your First Notebook
1. Open http://localhost:5173
2. URL automatically gets notebook ID: `?notebook=notebook-123-abc`
3. Start creating cells and editing

### 3. Enable Python Execution
```bash
# In new terminal - use your actual notebook ID from the URL
NOTEBOOK_ID=notebook-123-abc pnpm dev:kernel
```

**Pro tip**: Click the **Kernel** button in the notebook header to copy the exact command for your notebook!

### 4. Execute Code
- Add a code cell in the web interface
- Write Python: `import numpy as np; np.random.random(5)`
- Press **Ctrl+Enter** or click **Run**
- See results appear instantly

## Architecture

Anode uses a breakthrough reactive architecture for instant execution:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web Client    │◄──►│  Document Worker │◄──►│ Python Kernel   │
│   (React UI)    │    │  (CF Workers)    │    │   (Pyodide)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
   LiveStore DB         Event Sync Hub        Execution Queue
```

### Key Design Principles
- **One notebook = One LiveStore store** (`NOTEBOOK_ID = STORE_ID`)
- **Reactive work queue**: `executionRequested` → `executionAssigned` → `executionStarted` → `executionCompleted`
- **Event sourcing**: All changes are events, enabling perfect collaboration and audit trails
- **Session-based kernels**: Each kernel gets a unique session for isolation

## What's Working Right Now

- ✅ **Instant Python execution** with zero polling delays
- ✅ **Rich output rendering** - HTML tables, SVG plots, markdown, JSON
- ✅ **Real-time collaborative editing** across multiple users
- ✅ **Reactive architecture** using LiveStore's `queryDb` subscriptions  
- ✅ **Multiple isolated notebooks** with separate kernels
- ✅ **AI cell integration** with mock responses and markdown rendering
- ✅ **Pandas DataFrames** with styled HTML table output
- ✅ **Matplotlib plots** as crisp SVG vector graphics
- ✅ **Offline-first operation** with sync when connected
- ✅ **Event sourcing** for complete history and debugging

## Project Structure

```
anode/
├── packages/
│   ├── schema/                           # LiveStore events & state definitions
│   ├── web-client/                       # React notebook interface
│   ├── docworker/                        # Cloudflare Workers sync backend
│   └── dev-server-kernel-ls-client/      # Python execution server
├── ROADMAP.md                            # Development priorities
└── AGENTS.md                             # AI agent context
```

## Development Commands

```bash
# Core development workflow
pnpm dev                                  # Start web + sync
NOTEBOOK_ID=your-notebook-id pnpm dev:kernel  # Start kernel for specific notebook

# Utilities
pnpm reset-storage                        # Clear all local data
pnpm build:schema                         # Rebuild schema after changes

# Individual services (for debugging)
pnpm dev:web-only                         # Web client only
pnpm dev:sync-only                        # Sync backend only
```

## Next Phase: AI-First Notebooks

Anode is designed around **AI ↔ Python ↔ User interactions**. With rich outputs now complete, the next major milestone focuses on real AI integration:

### Immediate Priorities
- **Real AI API integration** - Replace mock responses with OpenAI, Anthropic, local models
- **Automatic kernel management** - One-click notebook startup with auto-kernel lifecycle
- **Authentication system** - Google OAuth with proper session management
- **Code completions** with LSP + kernel integration
- **SQL cell functionality** - Real database connections and query execution

### Rich Output Capabilities ✅ COMPLETED
- **Multiple media types** - text/plain, text/markdown, text/html, image/svg+xml
- **Pandas DataFrames** - Styled HTML tables with proper formatting
- **Matplotlib plots** - Vector SVG graphics with interactive rendering
- **AI responses** - Rich markdown with syntax highlighting
- **Fallback support** - Always includes plain text as backup

See [ROADMAP.md](./ROADMAP.md) for detailed development priorities.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Build failures | Run `pnpm build:schema` first |
| Execution not working | Start kernel with correct `NOTEBOOK_ID` (use copy button in UI) |
| Stale state | Run `pnpm reset-storage` |
| Slow execution | Should be instant - check kernel logs |
| Tables not styled | Rich output CSS should auto-apply to pandas DataFrames |
| Plots not showing | Check matplotlib is using SVG backend in kernel |

## Architecture Highlights

**Simplified Event Schema**: Removed timestamp complexity for reliability. Simple schemas work better for rapid prototyping.

**Rich Output System**: Supports multiple media types including HTML tables for pandas DataFrames, SVG plots for matplotlib, and markdown for AI responses. Media type prioritization ensures best format is always displayed.

**Reactive Over Polling**: Kernels use LiveStore's reactive subscriptions for instant work detection. This breakthrough eliminates polling delays entirely.

**Local-First Design**: Everything works offline first, syncs when connected. Your work is never lost.

## Contributing

Anode is an open source project focused on developer experience. The system provides a solid foundation for collaborative notebook execution and can be extended incrementally.

Key areas for contribution:
- Real AI API integrations (OpenAI, Anthropic, local models)
- Code completion systems with LSP integration
- SQL cell functionality with database connections
- Advanced rich outputs (interactive widgets, 3D plots)
- Performance optimizations for large notebooks

## License

[License TBD - Open Source]