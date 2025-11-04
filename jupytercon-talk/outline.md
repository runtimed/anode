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

**The Traditional Model** (45 seconds)
- Notebook file on disk
- Kernel runs your code
- Browser session holds the live state
- This was smart in 2011, and Jupyter RTC has made human collaboration work well


**Alt slide**

Pull from ChatGPT

Document engine that lives on the server side


**The Deeper Problem** (1 minute)
- Jupyter RTC solved human-to-human collaboration
- But what about human-AI-system collaboration?
- Think papermill: system generates notebook, runs it
- Now you want to edit it while kernel is still alive
- Or: AI agent modifies cells and executes them
- Who made which changes? What ran when? How do we audit this?

**📺 DEMO 1: The Multi-Actor Problem (30 seconds)**
- Show notebook being edited by multiple actors
- Code executes, outputs appear
- Who did what? When? Why?
- Traditional architecture: no attribution, no audit trail

**The Real Question**: How do we build a notebook system where humans, AI, and automated systems can all work together - with accountability?

**Transition**: Event sourcing gives us a way forward.

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

**Transition**: Now that computation is independent of the browser, collaboration becomes trivial.

---

## 5. Real-Time Collaboration (3 minutes)

**What Event Sourcing Unlocks** (1 minute)
- Multiple users just append events
- Everyone's client syncs from same event log
- Conflicts get resolved through event ordering (last-write-wins by default)

**Jupyter RTC vs In the Loop**
- Jupyter RTC solves collaboration between humans - and it works well
- In the Loop solves collaboration between **humans, AI, and automated systems**
- All working on the same live document with a running kernel

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

## 7. The Architectural Shift (3 minutes)

**From Session-Bound to Document-Centric** (1 minute)
- Traditional: computation tied to your browser session
- In the Loop: computation lives in the document
- Multiple actors (humans, AI, runtimes) all work on same document
- Each with proper attribution and accountability

**Event Sourcing as Foundation** (1 minute)
- Every change is an attributed event: who did what, when
- Immutable audit trail of all actions
- Not just code changes - execution results, AI edits, everything
- Replay the history: understand how the document evolved

**The Notebook as Eval Layer** (1 minute)
- The notebook becomes a traceable, executable record
- Unlike chat logs: you can re-run and verify
- Unlike traditional automation: you see exactly what the agent did
- Attribution shows which actor (human/AI/system) made which changes

**Agents "On Behalf Of" Users**
- Agents operate with real identity in the document
- Approval system: humans retain control
- Full accountability: audit who changed what and see the results
- This creates transparency that doesn't exist in typical AI tooling

**The Game Loop**
- Human writes code
- AI suggests improvements
- Runtime executes
- All actors see results
- Iterate, with full history preserved

---

## 8. Close (2 minutes)

**What We've Built** (45 seconds)
- A document engine where computation lives in the document, not the session
- Multiple actors (humans, AI, runtimes) collaborate with full attribution
- The notebook becomes an executable, auditable record of multi-actor work
- Event sourcing provides the foundation for accountability

**Why This Matters** (45 seconds)
- We're not just solving the parking lot problem
- We're building infrastructure for human-AI-system collaboration
- With real auth, real attribution, real audit trails
- The notebook becomes an implicit eval layer for what agents actually did

**This Is Working Today** (30 seconds)
- https://app.runt.run - deployed and stable
- Built on Cloudflare Workers (D1 + R2)
- Open source, BSD 3-Clause
- github.com/runtimed/intheloop

**The Shift**
- From session-bound, single-actor computation
- To document-centric, multi-actor computing
- Event sourcing + runtime agents = the foundation
- The parking lot problem? Just the beginning.

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
