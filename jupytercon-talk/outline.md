# Runtime Agents: Unleashing Event Sourced Collaboration for Jupyter

**JupyterCon 2025 Talk Outline**
25 minutes | Pacific Room | Wednesday November 5, 11:35am-12:00pm PST

---

## 1. Hook (2 minutes)

**Who I am** (15 seconds)
- Jupyter developer, founder of nteract
- Built notebook systems at Netflix, Noteable, now Anaconda

**The Netflix Parking Lot Story** (1:45)
- Colleagues holding laptops open walking to their cars
- Hoping Spark jobs or model training finishes before losing browser session
- Little league deadline pressure
- The absurdity: analysis runs on powerful clusters, but results are locked to the browser tab where you started them

**The Question**: Why are we still doing this?

---

## 2. The Core Problem (3 minutes)

**The Jupyter Architecture We All Know**
- Notebook file on disk
- Kernel runs your code
- Browser holds the live state
- This was a smart choice in 2011

**What This Prevents**
- Can't open same notebook in multiple tabs
- Can't collaborate without conflicts
- Work trapped in single browser session
- Close the tab, lose the connection to running work

**📺 DEMO 1: The Problem (30 seconds)**
- Open two tabs on same notebook
- Try to work in both
- Show the conflict/confusion

**Transition**: We've learned enough to try something better.


NOTE: Jupyter collaboration actually works today and solves this. It doesn't go after the problem I want though -- systems being able to update notebooks a la papermill or AI and then allow human collaborators to edit and refine those while the kernel is still alive.

---

## 3. The Solution: Event Sourcing (5 minutes)

**Core Concept** (1 minute)
- Every change is an event in a persistent log
- Not files, not JSON patches - immutable events
- Rebuild any state from replaying events

**Why This Matters for Notebooks** (2 minutes)
- Events: `cellCreated`, `executionRequested`, `executionStarted`, `executionCompleted`
- Each user's edits append to the log
- Merge conflicts become impossible - it's just event ordering
- Query the current state with SQL (LiveStore + SQLite)

**Prior Art** (1 minute)
- Redux in nteract
- JSON operational transforms at Noteable
- CoCalc's collaborative approach

**LiveStore Makes It Real** (1 minute)
- SQLite for frontend querying
- Type-safe event definitions
- Local-first with network sync
- Events are the source of truth

**Transition**: But event sourcing alone doesn't solve the parking lot problem. We need to rethink where execution lives.

---

## 4. Runtime Agents (5 minutes)


Talk note: I'll open up by saying that agents has dual meaning here. "The most important piece I've long wanted is an agent (in the old sense of the term, though we'll also bring agentic in later). The runtime should connect to the document and be able to update that document and execute cells by ID because it knows the state of the whole document"

**Decoupling Compute** (1 minute)
- Runtime connects to the *document*, not the *browser*
- Runtime agent: independent process that reads events, executes code, writes result events
- Your kernel runs separately from any user's session

**Execution Modes** (2 minutes)
1. External runtime agent - connects via WebSocket, runs anywhere
3. In-browser Python (Pyodide) - scientific stack, no server needed

**📺 DEMO 2: Persistence (1 minute)**
- Start execution in browser
- Close the browser entirely
- Reopen - outputs are still there
- Runtime kept working

**Execution Queue Coordination** (1 minute)
- Events form a natural queue: `executionRequested` → `executionAssigned` → `executionStarted` → `executionCompleted`
- Multiple runtimes can coordinate through events
- Each gets unique session ID for clean handoffs

**Transition**: Now that computation is independent of the browser, collaboration becomes trivial.

---

## 5. Real-Time Collaboration (3 minutes)

**What Event Sourcing Unlocks** (1 minute)
- Multiple users just append events
- Everyone's client syncs from same event log
- Operational transforms? Don't need them.
- Conflicts? Can't happen.

**📺 DEMO 3: Collaboration (1 minute)**
- Two browser windows, two "users"
- Both editing simultaneously
- Cell edits, execution results
- All sync in real-time

**Transition**: The big feature to me though is not about realtime collaboration between humans. It's going to be collaboration between systems, agents, and humans.

---

## 6. AI in the Loop (5 minutes)

**The Key Difference** (1 minute)
- Most AI coding tools see source code
- AI being In the Loop see *execution results*
- Context includes outputs, errors, actual data
- AI can see what your code *does*, not just what it says

**Tool Calling** (2 minutes)
- AI can create cells
- AI can modify code
- AI can trigger execution
- But: approval system for safety
- All changes are events - fully auditable

SIDE NOTE: Should we, since this is a jupytercon audience, mention briefly that all these outputs are using the media type outputs for the function call requests and responses?

**📺 DEMO 4: AI Agent (2 minutes)**
- Ask AI to analyze data in notebook
- AI sees dataframe output
- AI creates new cell to make visualization
- Show approval prompt
- Execute, see result
- Point out: AI saw the actual data, not just code

**Transition**: This unlocks new workflows.

---

## 7. What This Unlocks (3 minutes)

**Persistent Computation**
- Runtime crashes? Outputs survive
- Network drops? Sync when reconnected
- Switch devices? Pick up where you left off

**True Collaboration**
- Multiple people, one notebook, no conflicts
- Mobile-responsive - edit from phone
- Share by URL - it just works

**Autonomous AI Agents**
- AI can work while you're away
- Full audit trail of what changed
- Approve or reject changes later

**All Auditable**
- Every change in event log
- Replay history to any point
- Debug what happened, when, and why

**The Paradigm Shift**
- Document lives on server
- Runtimes are agents that connect to it
- Browsers are just views into the event stream

---

## 8. Close (2 minutes)

**This Is Working Today**
- https://app.runt.run - deployed and stable
- Built on Cloudflare Workers (D1 + R2)
- Real-time collaboration working
- AI integration working
- Open source, BSD 3-Clause

**It's Time to Evolve**
- Jupyter's architecture was right for 2011
- We've learned enough to build what's right for 2025
- Event sourcing + runtime agents = persistent, collaborative, AI-enabled notebooks
- The parking lot problem? Solved.

**Try It**
- app.runt.run
- github.com/runtimed/intheloop
- Built for real work, not just demos

---

## Parking Lot (Q&A Material)

### Technical Deep Dives
- LiveStore internals (SQLite, event replication protocol)
- Pyodide sandbox isolation details
- IFramed outputs for security
- Artifacts service for large outputs (R2 storage)
- Package development workflow

### Architecture Decisions
- Why separate artifacts from events
- Why iframe outputs (necessary for collaboration safety)
- Runtime orchestration and health monitoring
- Session handoff during runtime restarts

### Future Roadmap
- One-click runtime startup
- Automatic runtime health monitoring
- SQL cell support
- Additional language runtimes
- Compute backend integrations (BYOC)

### Common Questions
- **Q**: What about Jupyter kernels?
  **A**: Runtime agents can wrap kernels or implement execution directly

- **Q**: Backwards compatibility?
  **A**: Full .ipynb import/export

- **Q**: Performance with large notebooks?
  **A**: Materialized views from events, artifact offloading

- **Q**: How does this compare to JupyterHub/Lab?
  **A**: Complementary - this is document architecture, not deployment infrastructure

---

## Demo Backup Plans

**If Demo 1 Fails**: Show screenshot of conflict scenario
**If Demo 2 Fails**: Show video recording of persistence
**If Demo 3 Fails**: Show screenshot with multiple cursors
**If Demo 4 Fails**: Show pre-recorded AI interaction

**Nuclear Option**: Have local recording of all 4 demos ready to play
