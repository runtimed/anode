# Contributing to Anode

Thank you for your interest in contributing to Anode! This guide will help you
get set up and understand how to contribute effectively.

## Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/your-org/anode.git
cd anode
pnpm install  # Automatically creates .env with defaults
```

The `pnpm install` command automatically runs a setup script that creates
separate `.env` files with sensible defaults. No manual copying required!

### 2. Start Development

```bash
pnpm dev  # Starts web client + sync backend
```

### 3. Enable Python Execution

1. Open http://localhost:5173
2. Create a notebook (URL will show: `?notebook=notebook-123-abc`)
3. Click the **Kernel** button in the notebook header
4. Copy the exact runtime command shown (e.g.,
   `NOTEBOOK_ID=notebook-123-abc pnpm dev:runtime`)
5. Run that command in a new terminal

### 4. Optional: Add AI Features

Python runtime and AI features are now handled by the separate @runt packages:

```bash
# See https://github.com/runtimed/runt for setup
```

## Development Workflow

### Environment Setup

- **Single .env**: One `.env` file at repository root contains all configuration
- **Security**: Server-side variables (AUTH*TOKEN) kept separate from client
  variables (VITE*\*)
- **Python runtime**: Handled by separate @runt packages

### Running Services

- **Web client**: `pnpm dev` - React application
- **Sync worker**: `pnpm dev:sync` - Cloudflare Worker for LiveStore sync
- **Python runtime**: Separate @runt packages (see
  https://github.com/runtimed/runt)

### Key Commands

```bash
# Setup and development
pnpm setup              # Create/validate .env files
pnpm dev                # Start core services
pnpm build              # Build all packages
pnpm test               # Run test suite
pnpm lint               # Check code style
pnpm type-check         # TypeScript validation

# Utilities
pnpm reset-storage      # Clear all local storage
pnpm cache:warm-up      # Pre-load Python packages for faster startup
```

## Project Structure

```
anode/
├── src/                # Application source code
│   ├── components/     # React components
│   ├── sync/          # Cloudflare Worker sync backend
│   └── types/         # TypeScript definitions
├── docs/              # Documentation
├── schema.ts          # LiveStore schema definitions
└── CONTRIBUTING.md    # This file
```

### Environment Configuration

Copy `.env.example` to `.env` and configure as needed:

**Web Client** (`.env`) - Browser-exposed variables (VITE\_ prefix):

```bash
VITE_LIVESTORE_SYNC_URL=ws://localhost:8787/api
VITE_AUTH_TOKEN=insecure-token-change-me
```

**Sync Worker** (`.dev.vars`) - Server-only secrets:

```bash
# Authentication token for sync backend
AUTH_TOKEN=insecure-token-change-me
```

**Python Runtime** - Now handled by @runt packages:

```bash
# See https://github.com/runtimed/runt for configuration
```

### Port Configuration

- **Web Client**: http://localhost:5173
- **Sync Backend**: ws://localhost:8787
- **Python Runtime**: Handled by @runt packages

## Architecture Overview

- **LiveStore Foundation**: Event-sourcing with real-time collaboration
- **JSR Schema Package**: `jsr:@runt/schema` imported directly by application
- **Reactive Architecture**: Subscriptions instead of polling for instant
  execution
- **Local-First Design**: Works offline, syncs when connected
- **Event-Sourced State**: All changes flow through LiveStore events

## Contributing Guidelines

### Before You Start

1. Check existing issues and discussions
2. For new features, open an issue to discuss the approach
3. Make sure your development environment is working properly

### Development Process

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes with proper tests
3. Run the validation suite: `pnpm check` (lint + type-check)
4. Test your changes with the full development environment
5. Submit a pull request with clear description

### Code Style

- **TypeScript strict mode** enabled across the project
- **Functional programming patterns** preferred (Effect library)
- **Event sourcing** over direct state mutations
- **Reactive queries** over imperative data fetching

### Testing

```bash
pnpm test                    # Run all tests
pnpm test:integration        # Integration tests
pnpm test:kernel             # Python kernel tests
pnpm test:schema             # Schema validation tests
```

## Common Issues

| Problem                     | Solution                                                     |
| --------------------------- | ------------------------------------------------------------ |
| Missing .env files          | Run `pnpm setup` to auto-create with defaults                |
| Environment variable errors | Validate with `pnpm setup`                                   |
| Kernel not connecting       | Use exact command from notebook UI, check kernel server .env |
| Build failures              | Run `pnpm clean && pnpm build`                               |
| Type errors                 | Run `pnpm type-check` for detailed errors                    |

## Current Development Priorities

### Immediate Focus

- **Integration Testing** - Verify Python execution and rich outputs
- **Kernel Management** - Automated startup and health monitoring
- **Error Handling** - Better user feedback and recovery

### Upcoming Features

- **AI Tool Calling** - Enable AI to create/modify cells using OpenAI function
  calling
- **Context Controls** - Let users control what cells AI can see
- **MCP Integration** - Model Context Protocol support for extensible AI tools

## Getting Help

- **Documentation**: Check the [docs/](./docs/) directory
- **Issues**: Browse existing GitHub issues
- **Discussions**: Start a GitHub discussion for questions
- **Architecture**: See [AGENTS.md](./AGENTS.md) for AI development context

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for
details.

---

**Happy contributing!** 🚀

The automated setup with separate `.env` files should make it easy to get
started securely. If you encounter any friction in the development process,
please open an issue - we want contributing to be as smooth as possible.
