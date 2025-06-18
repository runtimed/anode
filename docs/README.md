# Anode Documentation

This directory contains comprehensive documentation for the Anode project - a real-time collaborative notebook system built on LiveStore.

## Quick Navigation

### 📖 Core Documentation
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

Anode combines three key technologies:
- **LiveStore**: Event-sourcing based local-first data synchronization
- **IPython**: Full Jupyter-compatible display system with custom hooks
- **React**: Modern web interface with real-time collaborative editing

### 🚀 Current Status: Working Prototype

Core collaborative editing, Python execution, and basic AI integration functional:

✅ **Working Features:**
- Real-time collaborative notebook editing via LiveStore
- Basic Python execution via Pyodide (manual kernel startup)
- AI integration - OpenAI API responses when OPENAI_API_KEY is set, graceful fallback to mock
- Cell management (create, edit, move, delete)
- Text output and error handling
- Event-sourced architecture with offline capability

🚧 **Needs Enhancement:**
- Rich output rendering (matplotlib, pandas HTML tables) - needs verification
- Enhanced AI features - notebook context awareness, tools for modifying cells
- Automated kernel management
- Comprehensive testing of display system

### 🎯 Next Priorities

**Immediate Focus:**
- Integration testing to verify Python execution and rich outputs
- Enhanced AI integration (notebook context awareness, tools for modifying cells)
- Automated kernel management to remove manual startup friction
- Rich output verification (matplotlib SVG, pandas HTML)

**AI Integration Status:**
- ✅ Basic OpenAI API integration working
- ⚠️ Current limitations: No notebook context, no tools for modifying notebook
- 📋 Planned: Context awareness, streaming responses, notebook modification tools

**Other Planned Features:**
- SQL cell execution
- Interactive widgets
- Production deployment

### 📚 Documentation Structure

```
docs/
├── README.md                 # This file - documentation index
├── ai-features.md           # AI integration setup and capabilities
├── display-system.md        # Display system architecture (aspirational)
├── testing.md              # Testing strategy and current gaps
├── display-examples.md      # Practical usage examples
├── ui-design.md            # Interface design guidelines
└── proposals/
    ├── completion-system.md    # Interactive code completion architecture
    ├── ai-tool-calling.md      # OpenAI function calling for AI-notebook interaction
    ├── mcp-integration.md      # Model Context Protocol integration analysis
    ├── updateable-outputs.md   # Jupyter-compatible output updates
    ├── kernel-management.md    # Automated kernel provisioning and lifecycle
    └── ai-context-controls.md  # User controls for AI context
```

### 🔧 For Developers

**Getting Started:**
1. Read [ai-features.md](./ai-features.md) for AI setup and current capabilities
2. Check [testing.md](./testing.md) for current test strategy and gaps
3. Review [display-system.md](./display-system.md) for architecture goals
4. See [ui-design.md](./ui-design.md) for interface patterns

**Key Files:**
- `packages/pyodide-runtime-agent/src/pyodide-kernel.ts` - Python execution kernel
- `packages/pyodide-runtime-agent/src/openai-client.ts` - OpenAI API integration
- `packages/web-client/src/components/notebook/RichOutput.tsx` - Output rendering
- `packages/web-client/src/components/notebook/AiCell.tsx` - AI cell interface
- `shared/schema.ts` - LiveStore event definitions

**Development Commands:**
```bash
# Start development environment
pnpm dev                 # Web client + sync backend
NOTEBOOK_ID=test pnpm dev:kernel  # Python kernel (manual per notebook)

# Testing
pnpm test               # Current test suite (mostly smoke tests)
pnpm test:kernel        # Kernel tests (mocked Pyodide)
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

**Phase 1: Core Prototype** ✅ **CURRENT**
- LiveStore collaborative editing
- Basic Python execution
- Cell management and navigation

**Phase 2: Rich Outputs & Enhanced AI** 🎯 **NEXT**
- Integration testing for Python execution
- Matplotlib and pandas display verification
- Enhanced AI integration (context awareness, notebook tools)
- Automated kernel management

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
- [AGENTS.md](../AGENTS.md) - AI agent development context
- [HANDOFF.md](../HANDOFF.md) - Current work state and priorities
- [ROADMAP.md](../ROADMAP.md) - Long-term vision and milestones