# Anode Documentation

This directory contains documentation for the Anode project - a real-time
collaborative notebook system with AI integration.

## Quick Navigation

### 📖 Core Documentation

- **[UI Design](./ui-design.md)** - Design principles and interface guidelines
- **[Testing](./TESTING.md)** - Testing strategy and current gaps
- **[Technologies](./technologies/README.md)** - Introduction to the various technologies used

### 📋 Proposals

- **[AI Context Controls](./proposals/ai-context-controls.md)** - User controls
  for AI context inclusion/exclusion ✅ **Implemented**
- **[Artifact Service Design](./proposals/artifact-service-design.md)** -
  External storage for large outputs 🚧 **First Version (has limitations)**
- **[Unified Output System](./proposals/unified-output-system.md)** -
  Granular, type-safe events for all output types ✅ **Implemented**

### 🏗️ Architecture Overview

Anode is a simplified single-application notebook system that provides:

- **Web Client**: React-based notebook interface with real-time collaboration
- **Unified Worker**: Cloudflare Worker serving both frontend and backend with artifact storage
- **Python Runtime**: Handled by separate `@runt` packages for execution and AI
  features

**Key Technologies:**

- **LiveStore**: Event-sourcing based local-first data synchronization
- **React**: Modern web interface with real-time collaborative editing
- **Vite**: Build system and development server
- **Cloudflare**: Workers (unified backend + frontend) + D1 (database) + R2 (artifact storage)

### 🚀 Current Status

For the most up-to-date information on current status and features, please refer to:

- [AGENTS.md](../AGENTS.md) - AI agent development context and current status
- [ROADMAP.md](../ROADMAP.md) - Long-term vision and milestones

### 📚 Documentation Structure

```
docs/
├── README.md                      # This file - documentation index
├── ui-design.md                   # Interface design guidelines
├── ai-context-visibility.md       # Context visibility feature
├── TESTING.md                     # Testing strategy
├── local-auth-testing.md          # Local authentication testing guide
├── DEPLOYMENT.md                  # Deployment instructions
├── proposals/
│   ├── ai-context-controls.md     # User controls for AI context
│   ├── artifact-service-design.md # External storage for large outputs
│   └── unified-output-system.md   # Unified output system proposal
└── technologies/
    ├── README.md                  # Introduction to technologies
    ├── deno.md                    # Deno technology overview
    ├── livestore.md               # LiveStore technology overview
    └── pyodide.md                 # Pyodide technology overview
```

### 🔧 For Developers

**Getting Started:**

1. Read [ui-design.md](./ui-design.md) for interface design patterns
2. Check [ai-context-visibility.md](./ai-context-visibility.md) for context
   control features
3. See [TESTING.md](./TESTING.md) for testing approach
4. Review [proposals/](./proposals/) for planned features

**Key Files:**

- `src/components/notebook/` - Notebook interface components
- `src/sync/sync.ts` - Cloudflare Worker for LiveStore sync
- `src/components/ui/` - Reusable UI components
- `schema.ts` - Local LiveStore schema definitions (for web client)
- `@runt/schema` - Primary LiveStore schema (JSR package, used by runtimes)

**Development Commands:**

```bash
# Start development (single server with integrated backend)
pnpm dev          # Web client + backend at http://localhost:5173

# Testing & Validation
pnpm test         # Run test suite (36 tests)
pnpm build        # Build web client
pnpm type-check   # TypeScript validation

# Python Runtime (separate setup)
# See https://github.com/runtimed/runt
```

### 🧠 Design Philosophy

Anode's design is guided by these principles:

- **Local-First**: Works offline, syncs when connected.
- **Event-Sourced**: All changes flow through LiveStore events.
- **Collaborative**: Real-time multi-user editing without conflicts.
- **Simple**: Single application, standard project structure.
- **Type-Safe**: End-to-end TypeScript.
- **Modular**: Clean separation between UI and runtime concerns.

### 🤝 Contributing

When contributing to the UI:

1.  **Follow design system**: Use established patterns from `ui-design.md`.
2.  **Test thoroughly**: Add tests for new features (see `TESTING.md`).
3.  **Consider collaboration**: How will features work with multiple users?
4.  **Think mobile-first**: Ensure responsive design.
5.  **Maintain accessibility**: Follow ARIA guidelines.

### 📈 Architecture Overview

For a detailed architecture overview and future plans, please refer to the main [ROADMAP.md](../ROADMAP.md) file.

---

For project-wide context and current work status, see:

- [AGENTS.md](../AGENTS.md) - AI agent development context and current status
- [ROADMAP.md](../ROADMAP.md) - Long-term vision and milestones
- [README.md](../README.md) - Project overview and quick start
