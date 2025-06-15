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
echo "VITE_LIVESTORE_SYNC_URL=ws://localhost:8787" > packages/web-client/.env
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

## What's Working Right Now

- ✅ **Instant Python execution** with zero polling delays
- ✅ **Rich output rendering** - HTML tables, SVG plots, markdown, JSON
- ✅ **Real-time collaborative editing** across multiple users
- ✅ **AI cell integration** with mock responses and markdown rendering
- ✅ **Pandas DataFrames** with styled HTML table output
- ✅ **Matplotlib plots** as crisp SVG vector graphics
- ✅ **Offline-first operation** with sync when connected

## Development Commands

```bash
# Core development workflow
pnpm dev                                  # Start web + sync
NOTEBOOK_ID=your-notebook-id pnpm dev:kernel  # Start kernel for specific notebook

# Utilities
pnpm reset-storage                        # Clear all local data
```

## Next Phase: AI-First Notebooks

Anode is designed around **AI ↔ Python ↔ User interactions**. With rich outputs now complete, the next major milestone focuses on real AI integration:

### Immediate Priorities
- **Real AI API integration** - Replace mock responses with OpenAI, Anthropic, local models
- **Automatic kernel management** - One-click notebook startup with auto-kernel lifecycle
- **Authentication system** - Google OAuth with proper session management
- **Code completions** with LSP + kernel integration

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Schema version mismatches | Ensure all services (web, kernel, sync) are restarted after schema changes |
| Type errors | TypeScript catches invalid queries at compile time - check column names |
| Execution not working | Start kernel with correct `NOTEBOOK_ID` (use copy button in UI) |
| Stale state | Run `pnpm reset-storage` |
| Slow execution | Should be instant - check kernel logs |

## Architecture Highlights

**Zero-Build Schema Architecture**: Direct TypeScript imports from `shared/schema.ts` eliminate build complexity while maintaining full type safety.

**Rich Output System**: Supports multiple media types including HTML tables for pandas DataFrames, SVG plots for matplotlib, and markdown for AI responses.

**Reactive Over Polling**: Kernels use LiveStore's reactive subscriptions for instant work detection. This breakthrough eliminates polling delays entirely.

**Local-First Design**: Everything works offline first, syncs when connected. Your work is never lost.

## Contributing

Anode is an open source project focused on developer experience. Key areas for contribution:
- Real AI API integrations (OpenAI, Anthropic, local models)
- Code completion systems with LSP integration
- Advanced rich outputs (interactive widgets, 3D plots)
- Performance optimizations for large notebooks

## License

BSD 3-Clause