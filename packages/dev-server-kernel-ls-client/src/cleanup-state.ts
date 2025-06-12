// Utility script to clean up stuck execution states in the LiveStore
// Run this when cells are stuck in "running" or "pending" state

import { makeAdapter } from "@livestore/adapter-node";
import { createStorePromise, queryDb } from "@livestore/livestore";
import { makeCfSync } from "@livestore/sync-cf";

// Import the same schema used by the web client
import { events, schema, tables } from "@anode/schema";

const NOTEBOOK_ID = process.env.NOTEBOOK_ID ?? "my-notebook";
const AUTH_TOKEN = process.env.AUTH_TOKEN ?? "insecure-token-change-me";
const SYNC_URL = process.env.LIVESTORE_SYNC_URL ?? "ws://localhost:8787";

console.log(`🧹 Cleaning up execution states for notebook store '${NOTEBOOK_ID}'`);

const adapter = makeAdapter({
  storage: { type: "fs", baseDirectory: "./tmp" },
  sync: {
    backend: makeCfSync({ url: SYNC_URL }),
    onSyncError: "shutdown",
  },
});

const store = await createStorePromise({
  adapter,
  schema,
  storeId: NOTEBOOK_ID,
  syncPayload: { authToken: AUTH_TOKEN, cleanup: true },
});

console.log("✅ Store connected. Analyzing current state...");

// Check current state
const allCells = store.query(tables.cells);
const stuckCells = allCells.filter(cell =>
  cell.executionState === 'running' ||
  cell.executionState === 'pending'
);

console.log(`📊 Found ${allCells.length} total cells`);
console.log(`🔒 Found ${stuckCells.length} stuck cells`);

if (stuckCells.length === 0) {
  console.log("🎉 No stuck cells found! State is clean.");
} else {
  console.log("\n🔧 Fixing stuck cells:");

  for (const cell of stuckCells) {
    console.log(`   - Cell ${cell.id}: ${cell.executionState} -> idle`);

    // Reset to idle state and clear execution count if needed
    store.commit(events.cellExecutionCompleted({
      cellId: cell.id,
      executionCount: cell.executionCount || 0,
      completedAt: new Date(),
      status: "error", // Mark as error since execution was interrupted
    }));
  }

  console.log(`✅ Reset ${stuckCells.length} stuck cells to completed state`);
}

// Give a moment for sync
await new Promise(resolve => setTimeout(resolve, 1000));

console.log("🧹 Cleanup complete! All cells should now be in a clean state.");
await store.shutdown();
process.exit(0);
