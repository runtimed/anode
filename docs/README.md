# Anode Documentation

This directory contains comprehensive documentation for the Anode project - a real-time collaborative notebook system built on LiveStore.

## Quick Navigation

### 📖 Core Documentation
- **[Display System](./DISPLAY_SYSTEM.md)** - Complete guide to Anode's enhanced IPython display system
- **[Display Examples](./display-examples.md)** - Practical examples and usage patterns for rich outputs
- **[UI Design](./UI_DESIGN.md)** - Design principles and interface guidelines

### 🏗️ Architecture Overview

Anode combines three key technologies:
- **LiveStore**: Event-sourcing based local-first data synchronization
- **IPython**: Full Jupyter-compatible display system with custom hooks
- **React**: Modern web interface with real-time collaborative editing

### 🚀 Current Status: Early Prototype

Core collaborative editing and Python execution working, with rich outputs in development:

✅ **Working Features:**
- Real-time collaborative notebook editing via LiveStore
- Basic Python execution via Pyodide (manual kernel startup)
- Cell management (create, edit, move, delete)
- Text output and error handling
- Event-sourced architecture with offline capability

🚧 **In Development:**
- Rich output rendering (matplotlib, pandas HTML tables)
- IPython.display function integration
- Automated kernel management
- Comprehensive testing of display system

### 🎯 Next Priorities

**Immediate Focus:**
- Integration testing to verify Python execution and rich outputs
- Automated kernel management to remove manual startup friction
- Rich output verification (matplotlib SVG, pandas HTML)
- Better error handling and user feedback

**Planned Features:**
- Real AI integration (currently mock responses)
- SQL cell execution
- Interactive widgets
- Production deployment

### 📚 Documentation Structure

```
docs/
├── README.md                 # This file - documentation index
├── DISPLAY_SYSTEM.md         # Display system architecture (aspirational)
├── TESTING.md               # Testing strategy and current gaps
├── display-examples.md       # Practical usage examples
└── UI_DESIGN.md             # Interface design guidelines
```

### 🔧 For Developers

**Getting Started:**
1. Read [TESTING.md](./TESTING.md) for current test strategy and gaps
2. Check [DISPLAY_SYSTEM.md](./DISPLAY_SYSTEM.md) for architecture goals
3. Review [UI_DESIGN.md](./UI_DESIGN.md) for interface patterns

**Key Files:**
- `packages/dev-server-kernel-ls-client/src/pyodide-kernel.ts` - Python execution kernel
- `packages/web-client/src/components/notebook/RichOutput.tsx` - Output rendering
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

**Phase 2: Rich Outputs** 🎯 **NEXT**
- Integration testing for Python execution
- Matplotlib and pandas display verification
- Automated kernel management

**Phase 3: AI Integration** 🚧 **IN PROGRESS**
- Real AI API integration (separate branch)
- Context-aware code assistance
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