# Anode

**The notebook that thinks with you.**

Anode is an **agentic notebook** where AI, code, and prose work together in real-time. Never lose your outputs when tabs close. Collaborate with AI that sees your data, not just your code. Pair with compute and intelligence.

**Note**: Public access coming soon - building BYOC and permissions first

## The Jupyter Problem We're Solving

As a long-time Jupyter contributor, I've always wanted to solve a core architectural limitation: computation and documentation are artificially coupled.

At Netflix, I watched people hold their laptops open walking to the parking lot, hoping their Spark jobs would finish before they lost their browser session. Your analysis is running on powerful clusters, but the results only "exist" in your specific browser tab.

**The core problem**: You can't open the same notebook in multiple tabs. Multiple people can't collaborate on the same server without conflicts. Your work is trapped in a single browser session.

**Why this happens**: Jupyter's architecture wasn't designed for concurrent access. The notebook exists as a file on disk, but the live state (outputs, execution results) only lives in your browser. Close that tab, and you lose the connection to work happening elsewhere.

**The bigger picture**: Your Spark job runs on a cluster. Your model trains on GPUs. But somehow, the results are locked to the browser tab where you started them. Modern computational work deserves better.

Jupyter's developers built something incredible that changed how we compute. Collaboration has been challenging to implement well, and we think our event-sourced approach offers a path forward that could benefit the broader ecosystem.

**Anode's approach**: Persistent outputs that survive browser crashes, tab closures, and device switches. Real-time collaboration without conflicts. AI that sees your actual results. Full Jupyter compatibility through .ipynb import/export. Your computation lives independently of any browser session.

## Agentic Notebook Vision

- **AI as development partner** - AI sees your outputs, creates cells, suggests next steps
- **Persistent computation** - Your work survives kernel crashes, tab closes, browser restarts, vpn disconnects, cafe WiFi
- **Seamless collaboration** - Your friends, local models, and foundational models working on the same notebook
- **Context-aware intelligence** - AI understands your data, not just your code
- **Zero-friction execution** - Code runs instantly, results appear everywhere

## Quick Start

### 1. Install and Configure
```bash
pnpm install  # Install dependencies

# Copy environment configuration
cp .env.example .env
# Edit .env if needed (defaults work for local development)

# Start web client
pnpm dev

# Start sync worker (in separate terminal)
pnpm dev:sync
```

Environment configuration:
- `.env.example` - Template with all required variables
- `.env` - Your local configuration (copy from .env.example)

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

### 5. Try Python Execution (Optional)
```bash
# Get the notebook ID from the UI, then start runtime:
NOTEBOOK_ID=your-notebook-id pnpm dev:runtime
```
- Uses @runt packages for Python execution and AI features
- See https://github.com/rgbkrk/runt for more configuration options

## Using Deployed Cloudflare Workers (Optional)

Instead of running everything locally, you can use a deployed Cloudflare Worker for sync while keeping the web client and runtime local. This enables testing real-time collaboration across devices.

### Quick Setup for Deployed Worker

1. **Deploy the sync backend** - Only the docworker needs deployment for collaboration

**Get deployment details** from your team (worker URL and auth token)

2. **Update application config** in `.env`:
   ```env
   VITE_LIVESTORE_SYNC_URL=https://your-worker.workers.dev
   VITE_AUTH_TOKEN=your-secure-token
   AUTH_TOKEN=your-secure-token
   ```

3. **Start services**:
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

### 🌎 Modeling your world
- No more copy pasting. Models can see code and outputs
- Ask questions about your plots, tables, and results
- AI creates new cells based on your notebook context
- Control what context AI sees with visibility toggles

### 🔄 Persistent Computation
- Outputs survive kernel restarts and browser crashes
- Work offline, sync when connected
- Rich outputs: plots, tables, colorized terminal output
- Package caching for fast startup (numpy, pandas, matplotlib)

### 👥 Real-Time Collaboration
- Multiple people editing simultaneously
- Mobile-responsive design for editing on any device
- Google OAuth for secure access (when deployed)
- Share notebooks by copying the URL

## Coming Soon

See [ROADMAP.md](./ROADMAP.md) for detailed implementation plan.

**Enhanced AI Partnership** - AI will modify existing cells and execute code, not just create new ones.

**Frictionless Setup** - One-click kernel startup instead of copy/paste commands.

**Production Scale** - "Bring Your Own Compute" with API tokens for enterprise use.

**Multi-language Support** - The runtime architecture already supports other languages, just need UI updates!

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
Python runtime and AI features are now handled by the separate @runt packages. See https://github.com/rgbkrk/runt for setup.



## Troubleshooting

| Problem | Solution |
|---------|----------|
| Schema version mismatches | Ensure all services (web, runtime, sync) are restarted after schema changes |
| Type errors | TypeScript catches invalid queries at compile time - check column names |
| Execution not working | Check @runt runtime setup - see https://github.com/rgbkrk/runt |
| Stale state | Run `pnpm reset-storage` |
| Build errors | Run `pnpm build` to check for TypeScript issues |

## Why Anode Works

**Never lose your work**: Event-sourced architecture means every change is preserved. Your outputs survive crashes, restarts, and network issues.

**AI sees your data**: Unlike other tools, AI has access to your actual outputs—plots, tables, error messages—not just source code. We have a full interactive runtime, so let it enjoy interactive computing too!

**Real-time everywhere**: Changes appear instantly across all connected devices. Collaboration without having to email Untitled234.ipynb again.

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

Ready to contribute? We'd love to have you.

---

## License

BSD 3-Clause
