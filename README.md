# Anode

A real-time collaborative notebook system built on LiveStore, focusing on seamless AI ↔ Python ↔ User interactions.

**Current Status: ✅ FULLY OPERATIONAL** - Enhanced IPython display system with zero-latency Python execution and rich collaborative outputs working end-to-end.

## What Makes Anode Different

- **Real-time collaboration** built on event sourcing (LiveStore)
- **Enhanced IPython display system** with full Jupyter compatibility
- **Zero-latency execution** using reactive subscriptions (no polling)
- **Rich output rendering** with HTML tables, SVG plots, markdown, and stream consolidation
- **Quote-safe code execution** via direct Python function calls
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

- ✅ **Enhanced IPython Display System** - Full Jupyter-compatible display hooks and publishers
- ✅ **Instant Python execution** with zero polling delays and stream consolidation
- ✅ **Rich output rendering** - HTML tables, SVG plots, markdown, JSON with proper MIME type handling
- ✅ **IPython.display functions** - display(), clear_output(), HTML(), Markdown() all work correctly
- ✅ **Rich object representations** - _repr_html_(), _repr_markdown_(), etc. fully supported
- ✅ **Real-time collaborative editing** across multiple users
- ✅ **AI cell integration** with mock responses and markdown rendering
- ✅ **Pandas DataFrames** with styled HTML table output
- ✅ **Matplotlib plots** as crisp SVG vector graphics with zero-latency display
- ✅ **Stream output consolidation** - Clean text blocks with proper newline handling
- ✅ **Quote-safe execution** - Handles complex code with quotes, escapes, and special characters
- ✅ **Offline-first operation** with sync when connected
- ✅ **Comprehensive testing** - 80+ passing tests including display system validation

## Development Commands

```bash
# Core development workflow
pnpm dev                                  # Start web + sync
NOTEBOOK_ID=your-notebook-id pnpm dev:kernel  # Start kernel for specific notebook

# Utilities
pnpm reset-storage                        # Clear all local data
```

## Next Phase: Advanced Display Features & AI Integration

Anode is designed around **AI ↔ Python ↔ User interactions**. With the enhanced display system complete, the next major milestone focuses on updateable outputs and real AI integration:

### Phase 2: Updateable Outputs by ID
- **Real-time streaming updates** - Enable progress bars, status indicators, and streaming AI responses
- **Interactive widgets** - IPython widgets support for dynamic UI elements
- **Collaborative widgets** - Real-time shared interactive components

### Phase 3: AI Integration
- **Real AI API integration** - Replace mock responses with OpenAI, Anthropic, local models with rich display
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

**Enhanced IPython Integration**: Full Jupyter-compatible display system with custom hooks and publishers, enabling all standard IPython.display functions.

**Zero-Build Schema Architecture**: Direct TypeScript imports from `shared/schema.ts` eliminate build complexity while maintaining full type safety.

**Rich Output System**: Supports multiple media types including HTML tables for pandas DataFrames, SVG plots for matplotlib, markdown for AI responses, and consolidated stream outputs.

**Quote-Safe Execution**: Direct Python function calls eliminate string escaping issues entirely, handling complex code with quotes and special characters.

**Reactive Over Polling**: Kernels use LiveStore's reactive subscriptions for instant work detection. This breakthrough eliminates polling delays entirely.

**Local-First Design**: Everything works offline first, syncs when connected. Your work is never lost.

## Documentation

For comprehensive documentation, see the [docs](./docs/) directory:
- **[Display System Guide](./docs/DISPLAY_SYSTEM.md)** - Complete technical documentation
- **[Display Examples](./docs/display-examples.md)** - Practical usage examples
- **[UI Design Guidelines](./docs/UI_DESIGN.md)** - Interface design principles

## Contributing

Anode is an open source project focused on developer experience. Key areas for contribution:
- **Updateable outputs by ID** - Enable real-time streaming updates and interactive widgets
- **Real AI API integrations** - OpenAI, Anthropic, local models with rich display support
- **Interactive widgets** - IPython widgets protocol implementation
- **Advanced visualizations** - 3D plots, collaborative widgets, custom display components
- **Performance optimizations** - Large notebook handling and memory efficiency

## License

BSD 3-Clause