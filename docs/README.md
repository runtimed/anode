# Anode Documentation

This directory contains comprehensive documentation for the Anode project - a real-time collaborative notebook system built on LiveStore.

## Quick Navigation

### 📖 Core Documentation
- **[Runtime Agent Architecture](./runtime-agent-architecture.md)** - Core system design and product vision
- **[Display System](./display-system.md)** - Complete guide to Anode's enhanced IPython display system
- **[Display Examples](./display-examples.md)** - Practical examples and usage patterns for rich outputs
- **[UI Design](./ui-design.md)** - Design principles and interface guidelines
- **[AI Features](./ai-features.md)** - AI integration setup and capabilities
- **[Testing](./testing.md)** - Testing strategy and current gaps

### 📋 Proposals
- **[Completion System](./proposals/completion-system.md)** - Architecture proposal for interactive code completions
- **[AI Tool Calling](./proposals/ai-tool-calling.md)** - OpenAI function calling for notebook manipulation
- **[MCP Integration](./proposals/mcp-integration.md)** - Model Context Protocol vs Python functions analysis
- **[Updateable Outputs](./proposals/updateable-outputs.md)** - Jupyter-compatible display updates and stream merging
- **[Kernel Management](./proposals/kernel-management.md)** - Automated kernel provisioning and lifecycle
- **[AI Context Controls](./proposals/ai-context-controls.md)** - User controls for AI context inclusion/exclusion

### 🏗️ Architecture Overview

Anode is built around the **Runtime Agent** - a dual-purpose system that serves as both a computational backend and an AI assistant. The Runtime Agent provides:

- **System Agent**: Manages Python execution, database connections, and document state
- **AI Agent**: Provides context-aware assistance with notebook development
- **Security**: Keeps credentials server-side with automatic masking
- **Isolation**: Each notebook gets its own runtime agent instance

See **[Runtime Agent Architecture](./runtime-agent-architecture.md)** for the complete design vision.

**Key Technologies:**
- **LiveStore**: Event-sourcing based local-first data synchronization
- **IPython**: Full Jupyter-compatible display system with custom hooks
- **React**: Modern web interface with real-time collaborative editing

### 🚀 Current Status: Production System Working

Core collaborative editing, full Python execution with rich outputs, and AI integration deployed:

✅ **Working Features:**
- Real-time collaborative notebook editing via LiveStore
- Full Python execution with rich outputs (matplotlib SVG, pandas HTML, IPython.display)
- Complete AI integration with notebook context awareness and cell creation tools
- Cell management (create, edit, move, delete) with keyboard navigation
- Rich output rendering with colored terminal output and SVG plots
- Production deployment on Cloudflare Pages + Workers with authentication
- Mobile responsive design with optimized keyboard handling
- Context visibility controls - users can hide cells from AI context
- Event-sourced architecture with offline capability

🚧 **Next Enhancements:**
- AI tool calling expansion (modify cells, execute code)
- User-attributed kernels with API tokens for "Bring Your Own Compute"
- Automated runtime management to remove manual startup

### 🎯 Next Priorities

**Immediate Focus:**
- AI tool calling expansion (enable AI to modify existing cells and execute code)
- User-attributed kernels with API tokens for "Bring Your Own Compute"
- Automated runtime management to remove manual startup friction

**AI Integration Status:**
- ✅ Full OpenAI API integration with notebook context awareness
- ✅ AI can see previous cells and their execution outputs
- ✅ AI can create new cells using OpenAI function calling
- ✅ Context visibility controls - users control what AI sees
- 🚧 Planned: AI can modify existing cells and execute code

**Other Planned Features:**
- SQL cell execution
- Interactive widgets
- User-attributed kernels with API tokens

### 📚 Documentation Structure

```
docs/
├── README.md                    # This file - documentation index
├── runtime-agent-architecture.md # Core system design and product vision
├── ai-features.md              # AI integration setup and capabilities
├── display-system.md           # Display system architecture (aspirational)
├── testing.md                  # Testing strategy and current gaps
├── display-examples.md         # Practical usage examples
├── ui-design.md               # Interface design guidelines
└── proposals/
    ├── completion-system.md       # Interactive code completion architecture
    ├── ai-tool-calling.md         # OpenAI function calling for AI-notebook interaction
    ├── mcp-integration.md         # Model Context Protocol integration analysis
    ├── updateable-outputs.md      # Jupyter-compatible output updates
    ├── runtime-management.md      # Automated runtime provisioning and lifecycle
    └── ai-context-controls.md     # User controls for AI context
```

### 🔧 For Developers

**Getting Started:**
1. Read [runtime-agent-architecture.md](./runtime-agent-architecture.md) for the core system design
2. Check [ai-features.md](./ai-features.md) for AI setup and current capabilities
3. See [display-system.md](./display-system.md) for display system architecture
4. Review [ui-design.md](./ui-design.md) for interface patterns
5. Check [proposals/](./proposals/) for upcoming features and architecture

**Key Files:**
- `packages/pyodide-runtime-agent/src/pyodide-kernel.ts` - Python execution runtime
- `packages/pyodide-runtime-agent/src/openai-client.ts` - OpenAI API integration
- `packages/web-client/src/components/notebook/RichOutput.tsx` - Output rendering
- `packages/web-client/src/components/notebook/AiCell.tsx` - AI cell interface
- `shared/schema.ts` - LiveStore event definitions

**Development Commands:**
```bash
# Start development environment
pnpm dev                 # Web client + sync backend
NOTEBOOK_ID=test pnpm dev:runtime  # Python runtime (manual per notebook)

# Testing
pnpm test               # Current test suite (mostly smoke tests)
pnpm test:runtime        # Runtime tests (mocked Pyodide)
```

### 🧠 Design Philosophy

**Local-First**: Work offline, sync when connected
**Event-Sourced**: All changes flow through LiveStore events
**Collaborative**: Real-time multi-user editing without conflicts
**Type-Safe**: End-to-end TypeScript with Effect
**Extensible**: Modular cell types and execution engines

### 🤝 Contributing

When working on the display system:
1. **Maintain IPython compatibility** - Follow Jupyter standards, not custom Anode APIs
2. **Test thoroughly** - Add tests for new features
3. **Document examples** - Update display-examples.md with real, working examples
4. **Consider collaboration** - How will features work with multiple users?
5. **Think streaming** - Design for real-time updates

### 📈 Roadmap

**Phase 1: Core System** ✅ **COMPLETED**
- LiveStore collaborative editing with real-time collaboration
- Full Python execution with rich outputs (matplotlib, pandas, IPython.display)
- Complete AI integration with context awareness and cell creation tools
- Production deployment on Cloudflare with authentication

**Phase 2: Enhanced AI & Runtime Management** 🎯 **CURRENT**
- AI tool calling expansion (modify cells, execute code)
- User-attributed kernels with API tokens for "Bring Your Own Compute"
- Automated runtime management

**Phase 3: Advanced Features**
- Interactive widgets and collaborative components
- SQL cell execution
- Streaming AI responses

**Phase 4: Production Features**
- SQL cell execution
- Authentication and deployment
- Performance optimization

---

For project-wide context and current work status, see:
- [AGENTS.md](../AGENTS.md) - AI agent development context and current status
- [ROADMAP.md](../ROADMAP.md) - Long-term vision and milestones