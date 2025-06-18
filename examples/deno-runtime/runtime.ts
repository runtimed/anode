#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write

// Example Deno runtime using JSR-published schema
import { schema, tables, events } from "jsr:@anode/schema";
import { createStorePromise } from "npm:@livestore/livestore@^0.25.0";
import { makeAdapter } from "npm:@livestore/adapter-node@^0.25.0";

console.log("🦕 Deno Runtime Agent - Using JSR Schema");
console.log("=====================================");

// Get notebook ID from environment or command line
const notebookId = Deno.env.get("NOTEBOOK_ID") || Deno.args[0];
if (!notebookId) {
  console.error("❌ NOTEBOOK_ID environment variable or argument required");
  console.error("   Example: NOTEBOOK_ID=my-notebook deno run runtime.ts");
  Deno.exit(1);
}

console.log(`📔 Connecting to notebook: ${notebookId}`);

// Create the store using JSR schema
const adapter = makeAdapter({
  databaseUrl: `sqlite:./data/${notebookId}.db`,
});

const store = await createStorePromise({
  storeId: notebookId,
  schema,
  adapter,
});

console.log("✅ Store connected successfully");

// Example: Listen for execution requests
const executionSubscription = store.query(
  tables.executionQueue
    .select()
    .where({ status: "pending" })
).subscribe({
  next: (pendingExecutions) => {
    if (pendingExecutions.length > 0) {
      console.log(`🔄 Found ${pendingExecutions.length} pending executions`);

      for (const execution of pendingExecutions) {
        console.log(`  - Cell ${execution.cellId}: ${execution.code.slice(0, 50)}...`);

        // Example execution simulation
        setTimeout(() => {
          store.commit(events.ExecutionStarted({
            queueId: execution.id,
            cellId: execution.cellId,
            sessionId: "deno-session-123",
            startedAt: new Date().toISOString(),
          }));

          // Simulate execution completion
          setTimeout(() => {
            store.commit(events.ExecutionCompleted({
              queueId: execution.id,
              cellId: execution.cellId,
              status: "success",
              outputs: [{
                type: "stream",
                data: {
                  name: "stdout",
                  text: "Hello from Deno runtime! 🦕\n"
                }
              }],
              completedAt: new Date().toISOString(),
            }));
          }, 1000);
        }, 500);
      }
    }
  },
  error: (error) => {
    console.error("❌ Execution subscription error:", error);
  }
});

// Example: Monitor notebook metadata
const notebookSubscription = store.query(
  tables.notebook.select()
).subscribe({
  next: (notebooks) => {
    if (notebooks.length > 0) {
      const notebook = notebooks[0];
      console.log(`📖 Notebook: "${notebook.title}" (${notebook.kernelType})`);
    }
  }
});

// Example: List all cells
const cellsSubscription = store.query(
  tables.cells
    .select()
    .orderBy({ position: "asc" })
).subscribe({
  next: (cells) => {
    console.log(`📝 Found ${cells.length} cells in notebook`);
    cells.forEach((cell, index) => {
      const preview = cell.source.slice(0, 30).replace(/\n/g, " ");
      console.log(`  ${index + 1}. [${cell.cellType}] ${preview}${cell.source.length > 30 ? "..." : ""}`);
    });
  }
});

// Graceful shutdown
const shutdown = () => {
  console.log("\n🔄 Shutting down runtime...");
  executionSubscription.unsubscribe();
  notebookSubscription.unsubscribe();
  cellsSubscription.unsubscribe();
  store.close();
  console.log("✅ Runtime shut down cleanly");
  Deno.exit(0);
};

// Handle shutdown signals
Deno.addSignalListener("SIGINT", shutdown);
Deno.addSignalListener("SIGTERM", shutdown);

console.log("🚀 Deno runtime is running...");
console.log("   Press Ctrl+C to stop");

// Keep the runtime alive
setInterval(() => {
  // Heartbeat - could be used for health checks
}, 5000);
