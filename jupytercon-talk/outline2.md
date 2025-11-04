In The Loop: Rethinking the Notebook for Collaborative, Persistent Computing

⸻

1. Setting the Stage
	•	The Jupyter community knows the notebook model better than anyone.
	•	But we’ve all hit the same wall:
State lives in your browser. Close the tab — it’s gone.
	•	This talk is about rethinking that model.

⸻

2. The Everyday Reality

“You’re running a cell while racing to pick up your kid. Laptop open, kernel connected… but one browser crash away from oblivion.”

	•	This is the “Netflix Parking Lot Problem.”
	•	Computational state shouldn’t depend on an open tab.
	•	We need notebooks that live beyond the browser.

⸻

3. Traditional Notebook Model
	•	A notebook file (.ipynb) is static.
	•	Execution happens in a live kernel session tied to one client.
	•	Results are ephemeral — they live and die with that session.
	•	Collaboration happens after the fact — via Git or shared exports.

⸻

4. The Shift: Document as the Source of Truth
	•	Instead of tying execution to a user session,
we move state to the server.
	•	The document becomes event-sourced:
every change is an immutable event in a shared log.
	•	Think:
	•	cellCreated, executionRequested, outputAppended.

⸻

5. The Event Log Model
	•	Each notebook replica materializes from a shared log.
	•	Every client — human or agent — gets a consistent, replayable state.
	•	The log is immutable, but materialized state is dynamic.
	•	This is the foundation of real-time collaboration.

⸻

6. Why Event Sourcing Alone Isn’t Enough
	•	Event sourcing solves persistence — not computation.
	•	You still need something to run the code.
	•	So we move execution out of the browser too.

⸻

7. The Runtime Agent
	•	A runtime agent is just another client —
a compute participant that subscribes to the same event log.
	•	It reads execution requests, runs code, and emits new events.
	•	Could live on:
	•	A server (for shared compute)
	•	A browser (via Pyodide)
	•	A local runtime (via sidecar or Deno)

⸻

8. Decoupled Execution
	•	Execution is now asynchronous and auditable.
	•	The event queue ensures reliability and replayability.
	•	If the browser disconnects, compute continues.
	•	You can pick up where you left off — or let an agent take over.

⸻

9. Agents as First-Class Participants
	•	Humans, AI assistants, and runtime agents all share one state.
	•	AI can see notebook history and act through the same protocol.
	•	This makes “AI in the loop” feel native, not bolted on.
	•	The notebook becomes a collaborative workspace for humans and machines.

⸻

10. Architecture Overview
	•	Document Engine: Event-sourced, immutable log.
	•	Clients: UI replicas, runtimes, AI agents.
	•	Materializers: Deterministic reducers for reproducible state.
	•	Storage: Durable Objects + D1 + R2.
	•	Runtime Layer: Deno-based, cross-language execution.

⸻

11. New Possibilities
	•	Persistent collaboration across humans, AI, and compute.
	•	Auditable, replayable notebook history.
	•	Flexible deployment — from PyScript to the cloud.
	•	No “session lost” — just “state restored.”

⸻

12. The Big Idea

The notebook is no longer a transient client of a kernel.
It’s a shared, event-sourced document
— where humans and agents collaborate continuously.

⸻

13. Closing Thought
	•	We’ve spent a decade living inside the tab.
	•	It’s time for notebooks that live with us —
across sessions, devices, and collaborators.
	•	Event-sourced. Collaborative. Agentic.
	•	Welcome to In The Loop.
