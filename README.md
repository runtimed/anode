# Anode

**The notebook that thinks with you.**

Anode is an **agentic notebook** where AI, code, and prose work together in
real-time. Never lose your outputs when tabs close. Collaborate with AI that
sees your data, not just your code. Pair with compute and intelligence.

**Note**: Public access coming soon - building BYOC and permissions first

## The Jupyter Problem We're Solving

As a long-time Jupyter contributor, I've always wanted to solve a core
architectural limitation: computation and documentation are artificially
coupled.

At Netflix, I watched people hold their laptops open walking to the parking lot,
hoping their Spark jobs would finish before they lost their browser session.
Your analysis is running on powerful clusters, but the results only "exist" in
your specific browser tab.

**The core problem**: You can't open the same notebook in multiple tabs.
Multiple people can't collaborate on the same server without conflicts. Your
work is trapped in a single browser session.

**Why this happens**: Jupyter's architecture wasn't designed for concurrent
access. The notebook exists as a file on disk, but the live state (outputs,
execution results) only lives in your browser. Close that tab, and you lose the
connection to work happening elsewhere.

**The bigger picture**: Your Spark job runs on a cluster. Your model trains on
GPUs. But somehow, the results are locked to the browser tab where you started
them. Modern computational work deserves better.

Jupyter's developers built something incredible that changed how we compute.
Collaboration has been challenging to implement well, and we think our
event-sourced approach offers a path forward that could benefit the broader
ecosystem.

**Anode's approach**: Persistent outputs that survive browser crashes, tab
closures, and device switches. Real-time collaboration without conflicts. AI
that sees your actual results. Full Jupyter compatibility through .ipynb
import/export. Your computation lives independently of any browser session.

## Agentic Notebook Vision

- **AI as development partner** - AI sees your outputs, creates cells, suggests
  next steps
- **Persistent computation** - Your work survives runtime crashes, tab closes,
  browser restarts, vpn disconnects, cafe WiFi
- **Seamless collaboration** - Your friends, local models, and foundational
  models working on the same notebook
- **Context-aware intelligence** - AI understands your data, not just your code
- **Zero-friction execution** - Code runs instantly, results appear everywhere

## Quick Start

**Requirements**: Node.js >=23.0.0 (use `nvm use` to automatically switch to the
correct version)

### 1. Install and Configure

```bash
pnpm install  # Install dependencies

# Copy environment configuration files
cp .env.example .env
cp .dev.vars.example .dev.vars

# Start development servers in separate terminals
pnpm dev           # Frontend at http://localhost:5173
pnpm dev:sync      # Backend at http://localhost:8787
pnpm dev:iframe    # Iframe outputs at http://localhost:8000
```

The example files contain sensible defaults that work for local development out of the box:

- `.env.example` → `.env` - Frontend environment variables (Vite)
- `.dev.vars.example` → `.dev.vars` - Backend environment variables (Worker)

### 2. Create Your First Notebook

1. Open http://localhost:5173
2. Click "New Notebook"
3. Start creating cells and editing

### 3. Start a Runtime (Two Options)

**Option A: External Runtime Agent**
- Create a `RUNT_API_KEY` via your user profile
- Click the **Runtime** button in the notebook header
- Copy the exact `NOTEBOOK_ID=xxx pnpm dev:runtime` command shown
- Run that command in your terminal

**Option B: In-Browser Runtime Agent**
- Click the **Runtime** button in the notebook header
- Click **Launch HTML Runtime** or **Launch Python Runtime** 
- Runtime starts immediately in your browser (no terminal needed)

### 4. Execute Code

- Add a code cell in the web interface
- Write Python: `import numpy as np; np.random.random(5)`
- Press **Ctrl+Enter** or click **Run**
- See results appear instantly

External runtime agents use [@runt packages](https://github.com/runtimed/runt) for Python execution and AI features, while in-browser agents provide immediate HTML/Python execution directly in the web client with shared LiveStore integration.

## Production Deployment

Anode is deployed and accessible at **https://app.runt.run** using a unified Cloudflare Worker architecture that serves both the web client and backend API from a single worker.

### Architecture

- **All-in-one Worker**: Single worker serving both frontend assets and backend API
- **D1 Database**: Persistent storage for LiveStore events
- **R2 Bucket**: Artifact storage for large outputs (images, files, data)
- **Durable Objects**: WebSocket server for real-time sync

This unified architecture simplifies deployment while providing robust real-time collaboration and artifact storage capabilities.

## What You Can Do Today

### 🌎 Modeling your world

- No more copy pasting. Models can see code and outputs
- Ask questions about your plots, tables, and results
- AI creates new cells based on your notebook context
- Control what context AI sees with visibility toggles

### 🔄 Persistent Computation

- Outputs survive runtime restarts and browser crashes
- Work offline, sync when connected
- Rich outputs: plots, tables, colorized terminal output
- Package caching for fast startup (numpy, pandas, matplotlib)

### 👥 Real-Time Collaboration

- Multiple people editing simultaneously
- Mobile-responsive design for editing on any device
- OIDC OAuth for secure access (when deployed)
- Share notebooks by copying the URL

## 🌐 In-Browser Runtime Agents

Anode now supports runtime agents that execute directly in your browser, eliminating the need for external processes or terminal commands.

### Available In-Browser Runtimes

**HTML Runtime** - Immediate HTML rendering
- Execute HTML/CSS/JavaScript code cells instantly
- Direct DOM manipulation and styling
- No setup required, works offline
- Perfect for prototyping web components

**Python Runtime (Pyodide)** - Full Python in the browser
- Complete Python environment via Pyodide
- Scientific computing stack (numpy, pandas, matplotlib)
- AI integration with full notebook context
- Persistent execution state within browser session

### Quick Start with In-Browser Runtimes

1. **Open any notebook** and click the **Runtime** button in the header
2. **Choose your runtime**:
   - **Launch HTML Runtime** - Instant HTML/CSS/JS execution
   - **Launch Python Runtime** - Full Python with scientific stack
3. **Start coding** - Create cells and run them immediately
4. **Share results** - Other users see outputs in real-time

### Technical Architecture

- **Shared LiveStore**: In-browser agents use the same event-sourced store as the UI
- **Real-time sync**: Execution results appear instantly across all connected clients  
- **AI capabilities**: Both runtimes support AI cells with full notebook context
- **Soft shutdown**: Agents can be stopped without affecting the notebook state
- **Session management**: Multiple runtime types can coexist (with manual switching)

### Console Development Access

For advanced users and debugging, runtimes can be launched via Chrome DevTools:

```javascript
// Connect to existing store
window.__RUNT_LAUNCHER__.useExistingStore(__debugLiveStore._);

// Launch HTML runtime
await window.__RUNT_LAUNCHER__.launchHtmlAgent();

// Check status
window.__RUNT_LAUNCHER__.getStatus();

// Shutdown when done
await window.__RUNT_LAUNCHER__.shutdown();
```

This provides direct access to runtime agents for experimentation and debugging without UI abstractions.

## Coming Soon

See [ROADMAP.md](./ROADMAP.md) for detailed implementation plan.

**Frictionless Setup** - One-click runtime startup instead of copy/paste
commands.

**Multi-language Support** - The runtime architecture already supports other
languages with custom runtime agents. We just need UI updates!

## 🚀 Groq AI Integration

Anode supports **Groq** as a first-class AI provider alongside OpenAI and Ollama, offering high-speed inference with advanced models.

### Available Groq Models

- **moonshotai/kimi-k2-instruct** (Primary) - Advanced reasoning and tool calling
- **llama3-8b-8192** - Fast general-purpose model
- **llama3-70b-8192** - High-performance large model
- **mixtral-8x7b-32768** - Mixture of experts model
- **gemma2-9b-it** - Efficient instruction-following model

### Quick Setup

1. **Get Groq API Key**: Sign up at [console.groq.com](https://console.groq.com) and create an API key

2. **Configure Environment**: Add to `/runt/.env`:

   ```bash
   GROQ_API_KEY=your_groq_api_key_here
   LIVESTORE_SYNC_URL=ws://localhost:8787
   ```

3. **Start Services**:
4. **Start Development**:

   ```bash
   # Start integrated development server
   pnpm dev
   ```

5. **Start Iframe server**:

   ```bash
   pnpm dev:iframe
   ```

6. **Start Runtime**: Get the runtime command from the notebook UI, then:

   ```bash
   NOTEBOOK_ID=notebook-groq-$(date +%s) pnpm dev:runtime
   ```

7. **Access**: Visit `http://localhost:5173` and create/open a notebook

### Features

- ✅ **All 5 Groq models** available in AI cell dropdown
- ✅ **High-speed inference** - Typical response times 1-3 seconds
- ✅ **Tool calling support** - AI can create and modify code cells
- ✅ **Model persistence** - Notebooks remember your last selected model
- ✅ **Orange provider badges** - Clear visual distinction in UI

### Critical Notes

⚠️ **Process Management**: Always run `pkill -f "pyodide-runtime-agent"` before starting new runtimes to prevent session conflicts.

⚠️ **Use nohup**: For persistent runtime processes that survive across terminal commands, use `nohup` instead of screen sessions.

### Configuration

External Python runtime and AI features are handled by the separate [@runt packages](https://github.com/runtimed/runt), while in-browser runtime agents execute directly in the web client. The integrated development server runs both frontend and backend in a single process for convenience.

## Troubleshooting

| Problem                   | Solution                                                                    |
| ------------------------- | --------------------------------------------------------------------------- |
| Schema version mismatches | Ensure all services (web, runtime, sync) are restarted after schema changes |
| Type errors               | TypeScript catches invalid queries at compile time - check column names     |
| Execution not working     | For external runtimes: check @runt setup. For in-browser: try Runtime Panel |
| Dev server crashes        | Restart with `pnpm dev` - .env file changes are ignored to prevent crashes  |
| Build errors              | Run `pnpm type-check` to check for TypeScript issues                        |
| Wrangler issues in logs   | Run `rm -rf .wrangler`. 🚨 IMPORTANT: you will also lose your notebooks     |

## Why Anode Works

**Never lose your work**: Event-sourced architecture means every change is
preserved. Your outputs survive crashes, restarts, and network issues.

**AI sees your data**: Unlike other tools, AI has access to your actual
outputs—plots, tables, error messages—not just source code. We have a full
interactive runtime, so let it enjoy interactive computing too!

**Real-time everywhere**: Changes appear instantly across all connected devices.
Collaboration without having to email Untitled234.ipynb again.

**Local-first**: Works offline, syncs when connected. Your notebook is always
responsive, never waiting for the cloud.

## Documentation

For comprehensive documentation, see the [docs](./docs/) directory:

- **[Development Roadmap](./ROADMAP.md)** - Detailed implementation plan and
  priorities
- **[OpenAI Integration](./docs/ai-features.md)** - AI setup and usage guide
- **[Display System Guide](./docs/display-system.md)** - Complete technical
  documentation
- **[Display Examples](./docs/display-examples.md)** - Practical usage examples
- **[UI Design Guidelines](./docs/ui-design.md)** - Interface design principles
- **[Testing Strategy](./docs/TESTING.md)** - Current testing approach and
  coverage

## Deployment

<!-- Deployment documentation available for contributors and development -->

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions, environment
configuration, and CI/CD setup.

## Join the Agentic Future

We're building the notebook where humans and AI truly collaborate. Help us get
there:

**🤖 Make AI Smarter**

- Teach AI to modify cells and execute code
- Build confirmation flows for safe AI actions
- Create streaming conversations with notebook context

**⚡ Remove Friction**

- Enable one-click runtime startup
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
