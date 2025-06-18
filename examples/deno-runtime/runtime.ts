#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write
/// <reference lib="deno.ns" />

// Example Deno runtime using local schema for testing
// In production, use: import { schema, tables, events } from "jsr:@anode/schema";
import { schema, tables, events } from "../../packages/schema-jsr/schema.ts";
import { createStorePromise, queryDb } from "npm:@livestore/livestore@^0.3.1";
import { makeAdapter } from "npm:@livestore/adapter-node@^0.3.1";

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
  storage: { type: "in-memory" },
});

const store = await createStorePromise({
  storeId: notebookId,
  schema,
  adapter,
});

console.log("✅ Store connected successfully");

// Example: Check for pending executions
const pendingExecutionsQuery = queryDb(
  tables.executionQueue.select().where({ status: "pending" }),
);

function checkPendingExecutions() {
  const pendingExecutions = store.query(pendingExecutionsQuery);

  if (pendingExecutions.length > 0) {
    console.log(`🔄 Found ${pendingExecutions.length} pending executions`);

    for (const execution of pendingExecutions) {
      // Get the cell to show its code
      const cellQuery = queryDb(
        tables.cells.select().where({ id: execution.cellId }),
      );
      const cells = store.query(cellQuery);
      const cell = cells[0];
      const codePreview = cell ? cell.source.slice(0, 50) : "unknown";

      console.log(`  - Cell ${execution.cellId}: ${codePreview}...`);

      // Example execution simulation
      setTimeout(() => {
        store.commit(
          events.executionStarted({
            queueId: execution.id,
            cellId: execution.cellId,
            kernelSessionId: "deno-session-123",
            startedAt: new Date(),
          }),
        );

        // Simulate adding output first
        setTimeout(() => {
          store.commit(
            events.cellOutputAdded({
              id: `output-${Date.now()}`,
              cellId: execution.cellId,
              outputType: "stream",
              data: {
                name: "stdout",
                text: "Hello from Deno runtime! 🦕\n",
              },
              metadata: {},
              position: 0,
            }),
          );

          // Then mark execution as completed
          store.commit(
            events.executionCompleted({
              queueId: execution.id,
              cellId: execution.cellId,
              status: "success",
              completedAt: new Date(),
              executionDurationMs: 1000,
            }),
          );
        }, 1000);
      }, 500);
    }
  }
}

// Example: Get notebook metadata
const notebookQuery = queryDb(tables.notebook.select());
const notebooks = store.query(notebookQuery);
if (notebooks.length > 0) {
  const notebook = notebooks[0];
  console.log(`📖 Notebook: "${notebook.title}" (${notebook.kernelType})`);
}

// Example: List all cells
const cellsQuery = queryDb(tables.cells.select().orderBy("position", "asc"));
const cells = store.query(cellsQuery);
console.log(`📝 Found ${cells.length} cells in notebook`);
cells.forEach((cell, index) => {
  const preview = cell.source.slice(0, 30).replace(/\n/g, " ");
  console.log(
    `  ${index + 1}. [${cell.cellType}] ${preview}${cell.source.length > 30 ? "..." : ""}`,
  );
});

// Graceful shutdown
const shutdown = () => {
  console.log("\n🔄 Shutting down runtime...");
  console.log("✅ Runtime shut down cleanly");
  Deno.exit(0);
};

// Handle shutdown signals
Deno.addSignalListener("SIGINT", shutdown);
Deno.addSignalListener("SIGTERM", shutdown);

console.log("🚀 Deno runtime is running...");
console.log("   Press Ctrl+C to stop");

// Check for work periodically
checkPendingExecutions();
setInterval(checkPendingExecutions, 2000);

// Keep the runtime alive with heartbeat
setInterval(() => {
  console.log("💓 Runtime heartbeat");
}, 30000);
