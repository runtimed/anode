# Contributing to Anode

Thank you for your interest in contributing to Anode! This guide will help you get set up and understand how to contribute effectively.

## Quick Start

### 1. Clone and Setup
```bash
git clone https://github.com/your-org/anode.git
cd anode
pnpm install  # Automatically creates .env with defaults
```

The `pnpm install` command automatically runs a setup script that creates separate `.env` files with sensible defaults. No manual copying required!

### 2. Start Development
```bash
pnpm dev  # Starts web client + sync backend
```

### 3. Enable Python Execution
1. Open http://localhost:5173
2. Create a notebook (URL will show: `?notebook=notebook-123-abc`)
3. Click the **Kernel** button in the notebook header
4. Copy the exact kernel command shown (e.g., `NOTEBOOK_ID=notebook-123-abc pnpm dev:kernel`)
5. Run that command in a new terminal

### 4. Optional: Add AI Features
Edit `packages/pyodide-runtime-agent/.env` and uncomment the OpenAI API key line:
```bash
# Uncomment and add your key:
OPENAI_API_KEY=sk-your-key-here
```

## Development Workflow

### Environment Setup
- **Automatic**: Run `pnpm install` and separate `.env` files are created automatically
- **Manual**: Run `pnpm setup` if you need to recreate the environment files
- **Security**: API keys are kept in server-side `.env` files, not exposed to browser
- **Validation**: The setup script checks for required environment variables

### Running Services
- **Web + Sync**: `pnpm dev` (runs both web client and sync backend)
- **Kernel**: Use the command from the notebook UI (ensures correct notebook ID)
- **Individual services**: 
  - `pnpm dev:web-only` - Just the web client
  - `pnpm dev:sync-only` - Just the sync backend

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
├── shared/
│   └── schema.ts       # LiveStore schema - directly imported by all packages
├── packages/
│   ├── web-client/     # React web application
│   ├── docworker/      # Cloudflare Worker sync backend
│   └── pyodide-runtime-agent/  # Python kernel server
├── docs/               # Documentation
├── scripts/            # Development scripts
└── CONTRIBUTING.md     # This file
```

## Environment Configuration

The setup script automatically creates separate `.env` files for security:

**Web Client** (`packages/web-client/.env`) - Browser-exposed variables:
```bash
# LiveStore Sync Backend URL
VITE_LIVESTORE_SYNC_URL=ws://localhost:8787
```

**Kernel Server** (`packages/pyodide-runtime-agent/.env`) - Server-only variables:
```bash
# LiveStore Sync Backend URL (for kernel server connection)
LIVESTORE_SYNC_URL=ws://localhost:8787

# OpenAI API Key for AI cells (uncomment and add your key)
# OPENAI_API_KEY=your-openai-api-key-here

# Authentication token for sync backend
AUTH_TOKEN=insecure-token-change-me
```

### Port Configuration
- **Web Client**: http://localhost:5173
- **Sync Backend**: ws://localhost:8787
- **Kernel Server**: Dynamic port assignment

## Architecture Overview

- **LiveStore Foundation**: Event-sourcing with real-time collaboration
- **Direct TypeScript Schema**: `shared/schema.ts` imported directly across packages
- **Reactive Architecture**: Subscriptions instead of polling for instant execution
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

| Problem | Solution |
|---------|----------|
| Missing .env files | Run `pnpm setup` to auto-create with defaults |
| Environment variable errors | Validate with `pnpm setup` |
| Kernel not connecting | Use exact command from notebook UI, check kernel server .env |
| Build failures | Run `pnpm clean && pnpm build` |
| Type errors | Run `pnpm type-check` for detailed errors |

## Current Development Priorities

### Immediate Focus
- **Integration Testing** - Verify Python execution and rich outputs
- **Kernel Management** - Automated startup and health monitoring
- **Error Handling** - Better user feedback and recovery

### Upcoming Features
- **AI Tool Calling** - Enable AI to create/modify cells using OpenAI function calling
- **Context Controls** - Let users control what cells AI can see
- **MCP Integration** - Model Context Protocol support for extensible AI tools

## Getting Help

- **Documentation**: Check the [docs/](./docs/) directory
- **Issues**: Browse existing GitHub issues
- **Discussions**: Start a GitHub discussion for questions
- **Architecture**: See [AGENTS.md](./AGENTS.md) for AI development context

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

---

**Happy contributing!** 🚀

The automated setup with separate `.env` files should make it easy to get started securely. If you encounter any friction in the development process, please open an issue - we want contributing to be as smooth as possible.