// LiveStore <-> Pyodide kernel adapter.
// Runs as a standalone process and listens for CellExecutionRequested
// events inside a particular notebook (storeId). It then executes the code
// with Pyodide and commits output events back to LiveStore.

import { makeAdapter } from "@livestore/adapter-node";
import { createStorePromise, queryDb } from "@livestore/livestore";
import { makeCfSync } from "@livestore/sync-cf";

// Import the same schema used by the web client so we share events/tables.
import { events, schema, tables } from "@anode/schema";
import { PyodideKernel } from "./pyodide-kernel.js";

const NOTEBOOK_ID = process.env.NOTEBOOK_ID ?? "demo-notebook";
const AUTH_TOKEN = process.env.AUTH_TOKEN ?? "insecure-token-change-me";
const SYNC_URL = process.env.LIVESTORE_SYNC_URL ?? "ws://localhost:8787";

console.log(
  `🔗 Starting kernel adapter for notebook '${NOTEBOOK_ID}' (sync: ${SYNC_URL})`,
);
console.log(`📝 Store ID will be: ${NOTEBOOK_ID}`);
console.log(`🔑 Auth token: ${AUTH_TOKEN}`);

const adapter = makeAdapter({
  storage: { type: "fs", baseDirectory: "./tmp" },
  sync: {
    backend: makeCfSync({ url: SYNC_URL }),
    onSyncError: "shutdown",
  },
});

console.log(`🏪 Creating store with storeId: ${NOTEBOOK_ID}...`);
const store = await createStorePromise({
  adapter,
  schema,
  storeId: NOTEBOOK_ID,
  syncPayload: { authToken: AUTH_TOKEN, kernel: true },
});
console.log(`✅ Store created successfully`);

const kernel = new PyodideKernel(NOTEBOOK_ID);
await kernel.initialize();

console.log("✅ Kernel ready. Setting up debugging and subscriptions...");

// Track processed execution counts to prevent re-execution
const processedExecutions = new Map<string, number>();

// Debug: Check what's in the store initially
const allNotebooks = store.query(tables.notebooks);
const allCells = store.query(tables.cells);
console.log(`📊 Initial store state:`);
console.log(`   - Notebooks: ${allNotebooks.length}`);
console.log(`   - Cells: ${allCells.length}`);
if (allNotebooks.length > 0) {
  console.log(`   - Notebook IDs: ${allNotebooks.map(n => n.id).join(', ')}`);
}
if (allCells.length > 0) {
  console.log(`   - Cell IDs: ${allCells.map(c => c.id).join(', ')}`);
  console.log(`   - Cell notebook IDs: ${allCells.map(c => c.notebookId).join(', ')}`);
}

console.log("🔍 Subscribing to CellExecutionRequested events...");

// Debug: Subscribe to ALL cells first to see what's happening
const allCells$ = queryDb(
  tables.cells,
  { label: 'allCells' }
);

store.subscribe(allCells$, {
  onUpdate: (cells: any) => {
    console.log(`🔍 ALL CELLS UPDATE (${cells.length} total):`);
    cells.forEach((cell: any) => {
      console.log(`   - Cell ${cell.id}: notebook=${cell.notebookId}, state=${cell.executionState}, count=${cell.executionCount}`);
    });
  }
});

// Subscribe to execution request events using a query
// Quick fix: process ALL pending cells since we're using notebook-specific stores
const executionRequests$ = queryDb(
  tables.cells.where({
    executionState: 'pending'
  }).orderBy('executionCount', 'desc'),
  { label: 'executionRequests' }
);

console.log(`🎯 Looking for ALL pending cells (store-specific approach)`);

store.subscribe(executionRequests$, {
  onUpdate: async (cells: any) => {
    console.log(`🔔 EXECUTION REQUESTS UPDATE: ${cells.length} pending cells`);

    // Process each pending cell
    for (const cell of cells) {
      if (!cell.executionCount) {
        console.log(`⏭️ Skipping cell ${cell.id} - no execution count`);
        continue; // Skip if no execution requested
      }

      // Check if we've already processed this execution
      const lastProcessed = processedExecutions.get(cell.id);
      if (lastProcessed && lastProcessed >= cell.executionCount) {
        console.log(`⏭️ Skipping cell ${cell.id} - already processed execution ${cell.executionCount} (last: ${lastProcessed})`);
        continue;
      }

      console.log(`⚡ Processing execution request for cell ${cell.id} (notebook: ${cell.notebookId})`);
      console.log(`   - Target notebook: ${NOTEBOOK_ID} (store ID)`);
      console.log(`   - Actual notebook: ${cell.notebookId}`);
      console.log(`   - Execution count: ${cell.executionCount}`);
      console.log(`   - Source length: ${(cell.source || '').length} chars`);
      console.log(`   - Last processed: ${lastProcessed || 'none'}`);

      // Mark this execution as being processed
      processedExecutions.set(cell.id, cell.executionCount);

      try {
        // Mark start
        store.commit(events.cellExecutionStarted({
          cellId: cell.id,
          executionCount: cell.executionCount,
          startedAt: new Date(),
        }));

        // Clear previous outputs
        store.commit(events.cellOutputsCleared({
          cellId: cell.id,
          clearedBy: "kernel-adapter",
        }));

        // Execute code
        const outputs = await kernel.execute(cell.source ?? "");

        // Emit outputs
        outputs.forEach((out, idx) => {
          store.commit(events.cellOutputAdded({
            id: crypto.randomUUID(),
            cellId: cell.id,
            outputType: out.type as any,
            data: out.data,
            position: idx,
            createdAt: new Date(),
          }));
        });

        // Completion status
        const status = outputs.some((o) => o.type === "error") ? "error" : "success";
        store.commit(events.cellExecutionCompleted({
          cellId: cell.id,
          executionCount: cell.executionCount,
          completedAt: new Date(),
          status,
        }));

        console.log(`✅ Cell ${cell.id} executed (${status}) - ${outputs.length} outputs`);
      } catch (error) {
        console.error(`❌ Error executing cell ${cell.id}:`, error);

        // Mark as error
        store.commit(events.cellExecutionCompleted({
          cellId: cell.id,
          executionCount: cell.executionCount,
          completedAt: new Date(),
          status: "error",
        }));
      }
    }
  }
});

// Graceful shutdown
let running = true;
const shutdown = async () => {
  if (!running) return;
  running = false;
  console.log("🛑 Shutting down kernel adapter…");
  await store.shutdown?.();
  await kernel.terminate();
  process.exit(0);
};

// Add signal listeners for graceful shutdown
// Back in node.js though
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("🎉 Kernel adapter operational. Press Ctrl+C to stop.");

// Keep process alive
while (running) {
  await new Promise((res) => setTimeout(res, 1000));
}
