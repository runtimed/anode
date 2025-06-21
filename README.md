# Anode

**The notebook that thinks with you.**

Anode is an agentic notebook where AI, code, and prose work together in real-time. Never lose your outputs when tabs close. Collaborate with AI that sees your data, not just your code. Pair with compute and intelligence, not just humans.

<!-- **Try it live**: https://anode.pages.dev -->
**Note**: Public access coming soon - building BYOC and permissions first

## The Jupyter Problem We're Solving

**Jupyter's core flaw**: Outputs disappear when kernels restart. Notebooks are trapped in single processes. AI tools operate in isolation from your actual work.

**Anode's solution**: Persistent outputs that survive kernel restarts. AI that sees your data and can actively participate in development. Real-time collaboration that just works.

## Agentic Notebook Vision

- **AI as development partner** - AI sees your outputs, creates cells, suggests next steps
- **Persistent computation** - Your work survives kernel crashes, tab closes, browser restarts  
- **Seamless collaboration** - Multiple minds (human and AI) working on the same notebook
- **Context-aware intelligence** - AI understands your data, not just your code
- **Zero-friction execution** - Code runs instantly, results appear everywhere

## Quick Start

### 1. Install and Configure
```bash
pnpm install  # Automatically creates .env files with defaults
# hack on the web client
pnpm dev:web-only
# synchronize clients with a local doc worker
pnpm dev:sync-only
```

The install process creates `.env` files for:
- `packages/web-client/.env` - Web client configuration (VITE_* vars exposed to browser)
- `packages/pyodide-runtime-agent/.env` - Runtime server configuration (server-only vars)

### 2. Create Your First Notebook
1. Open http://localhost:5173
2. URL automatically gets notebook ID: `?notebook=notebook-123-abc`
3. Start creating cells and editing

### 3. Get Runtime Command from UI
- Open the notebook interface
- Click the **Runtime** button in the notebook header
- Copy the exact `NOTEBOOK_ID=xxx pnpm dev:runtime` command shown
- Run that command in your terminal

### 4. Execute Code
- Add a code cell in the web interface
- Write Python: `import numpy as np; np.random.random(5)`
- Press **Ctrl+Enter** or click **Run**
- See results appear instantly

### 5. Try AI Integration (Optional)
```bash
# Edit packages/pyodide-runtime-agent/.env and uncomment/set your OpenAI API key:
# OPENAI_API_KEY=sk-your-key-here

# Restart runtime to pick up the API key (use UI command)
NOTEBOOK_ID=your-notebook-id pnpm dev:runtime
```
- Add an AI cell and ask questions about your data
- Falls back to mock responses if no API key is set
- API keys are kept server-side for security

## Using Deployed Cloudflare Workers (Optional)

Instead of running everything locally, you can use a deployed Cloudflare Worker for sync while keeping the web client and runtime local. This enables testing real-time collaboration across devices.

### Quick Setup for Deployed Worker

1. **Get deployment details** from your team (worker URL and auth token)

2. **Update web client config** in `packages/web-client/.env`:
   ```env
   VITE_LIVESTORE_SYNC_URL=https://your-worker.workers.dev
   VITE_AUTH_TOKEN=your-secure-token
   ```

3. **Update runtime config** in `packages/pyodide-runtime-agent/.env`:
   ```env
   LIVESTORE_SYNC_URL=https://your-worker.workers.dev
   AUTH_TOKEN=your-secure-token
   ```

4. **Start services** (no local docworker needed):
   ```bash
   pnpm dev:web-only  # Web client connects to deployed worker
   NOTEBOOK_ID=test-notebook pnpm dev:runtime
   ```

5. **Test collaboration** by opening the web client on multiple devices/browsers

### Benefits
- Real-time sync through Cloudflare's global network
- Test collaboration across devices on your network
- No need to run local sync backend

**Note**: When using deployed workers, authentication happens via Cloudflare secrets configured in the dashboard.

<!-- This section is for development/testing with deployed workers, not public access -->

## What You Can Do Today

### 🤖 AI That Sees Your Work
- AI analyzes your data outputs, not just source code
- Ask questions about your plots, tables, and results
- AI creates new cells based on your notebook context
- Control what context AI sees with visibility toggles

### 🔄 Persistent Computation
- Outputs survive kernel restarts and browser crashes
- Work offline, sync when connected
- Rich outputs: matplotlib plots, pandas tables, colored terminal
- Zero-latency execution with instant feedback

### 👥 Real-Time Collaboration
- Multiple people editing simultaneously without conflicts
- Mobile-responsive design for editing on any device
- Google OAuth for secure access
- Share notebooks with permanent URLs

### 🚀 Production Ready
- Deployed and tested with 99.9% uptime
- 107 passing tests ensuring reliability
- Handles complex workflows with scientific Python stack
- Package caching for fast startup (numpy, pandas, matplotlib)

## Coming Soon

### 🔮 Enhanced AI Partnership
- AI can modify existing cells and execute code
- User confirmation flows for AI-initiated actions
- Streaming responses for better conversation flow
- Multi-turn AI conversations with notebook context

### ⚡ Frictionless Experience
- One-click kernel startup (no more copy/paste commands)
- Automatic kernel health monitoring and restart
- "Bring Your Own Compute" with API tokens
- Advanced error recovery and user guidance

### 🔗 Extended Capabilities
- SQL cells for database queries
- Interactive widgets for data exploration
- Code completion and variable inspection
- Multi-language support beyond Python

## Local Development

Want to run Anode locally or contribute? Here's the essentials:

```bash
# One-time setup
pnpm install             # Installs dependencies and creates .env files

# Start the development servers (in separate terminals)
pnpm dev:web-only       # Web interface at http://localhost:5173
pnpm dev:sync-only      # Sync backend

# For Python execution, get the command from the notebook UI
# Then run: NOTEBOOK_ID=your-notebook-id pnpm dev:runtime
```

### Configuration
Setup automatically creates `.env` files in the right places. To enable AI features, add your OpenAI API key to `packages/pyodide-runtime-agent/.env`.

## Roadmap

We're rapidly building toward the full agentic notebook vision. Next up:

**Enhanced AI Partnership** - AI will soon modify existing cells and execute code, not just create new ones.

**Frictionless Setup** - One-click kernel startup instead of copy/paste commands.

**Production Scale** - "Bring Your Own Compute" with API tokens for enterprise use.

See [ROADMAP.md](./ROADMAP.md) for detailed implementation plan and timelines.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Missing .env files | Run `pnpm setup` to auto-create with defaults |
| Schema version mismatches | Ensure all services (web, runtime, sync) are restarted after schema changes |
| Type errors | TypeScript catches invalid queries at compile time - check column names |
| Execution not working | Use runtime command from notebook UI or check `.env` configuration |
| AI cells showing mock responses | Set `OPENAI_API_KEY` in `packages/pyodide-runtime-agent/.env`, restart runtime |
| Rich outputs not displaying | Verify matplotlib, pandas imports work - should display SVG plots and HTML tables |
| Stale state | Run `pnpm reset-storage` |
| Slow execution | Should be instant - check runtime logs |

## Why Anode Works

**Never lose your work**: Event-sourced architecture means every change is preserved. Your outputs survive crashes, restarts, and network issues.

**AI sees your data**: Unlike other tools, AI has access to your actual outputs - plots, tables, error messages - not just source code.

**Real-time everywhere**: Changes appear instantly across all connected devices. Collaboration without conflicts.

**Local-first**: Works offline, syncs when connected. Your notebook is always responsive, never waiting for the cloud.

## Documentation

For comprehensive documentation, see the [docs](./docs/) directory:
- **[Development Roadmap](./ROADMAP.md)** - Detailed implementation plan and priorities
- **[OpenAI Integration](./docs/ai-features.md)** - AI setup and usage guide
- **[Display System Guide](./docs/display-system.md)** - Complete technical documentation
- **[Display Examples](./docs/display-examples.md)** - Practical usage examples
- **[UI Design Guidelines](./docs/ui-design.md)** - Interface design principles
- **[Testing Strategy](./docs/TESTING.md)** - Current testing approach and coverage

## Deployment

<!-- Deployment documentation available for contributors and development -->
See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions, environment configuration, and CI/CD setup.

## Join the Agentic Future

We're building the notebook where humans and AI truly collaborate. Help us get there:

**🤖 Make AI Smarter**
- Teach AI to modify cells and execute code
- Build confirmation flows for safe AI actions  
- Create streaming conversations with notebook context

**⚡ Remove Friction**
- Enable one-click kernel startup
- Build "Bring Your Own Compute" for production scale
- Design better error recovery and guidance

**🔗 Expand Capabilities**  
- Add SQL cells for database workflows
- Create interactive widgets for data exploration
- Build code completion and variable inspection

**🌟 Shape the Vision**
- Test with real data science workflows
- Provide feedback on AI collaboration features
- Help define what agentic notebooks should become

Ready to contribute? The codebase is solid (107 passing tests, zero TypeScript errors) and the architecture is designed for expansion.

## The Future of Notebooks

Traditional notebooks trap you in single processes with fragile state. Anode breaks free:

- **Persistent by design** - Your work survives anything
- **AI as true partner** - Not just a chatbot, but a collaborator that sees your data
- **Real-time collaboration** - Multiple minds working seamlessly together
- **Production ready** - Built for real workflows, not just demos

This is where notebooks are headed. Join us in building it.

---

## License

BSD 3-Clause
