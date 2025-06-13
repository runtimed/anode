// Utility script to clean up stuck execution states in the new architecture
// Run this when cells are stuck in "queued" or "running" state, or when
// execution queue entries are stuck

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

// Check current cell states
const allCells$ = queryDb(tables.cells.query, { label: 'allCells' });
const stuckCells$ = queryDb(
  tables.cells.query.where({
    executionState: ['queued', 'running']
  }),
  { label: 'stuckCells' }
);

// Check execution queue
const allQueue$ = queryDb(tables.executionQueue.query, { label: 'allQueue' });
const stuckQueue$ = queryDb(
  tables.executionQueue.query.where({
    status: ['pending', 'assigned', 'executing']
  }),
  { label: 'stuckQueue' }
);

// Check kernel sessions
const kernelSessions$ = queryDb(tables.kernelSessions.query, { label: 'kernelSessions' });

const allCells = store.query(allCells$) as any[];
const stuckCells = store.query(stuckCells$) as any[];
const allQueue = store.query(allQueue$) as any[];
const stuckQueue = store.query(stuckQueue$) as any[];
const kernelSessions = store.query(kernelSessions$) as any[];

console.log(`📊 Current state:`);
console.log(`   • Cells: ${allCells.length} total, ${stuckCells.length} stuck`);
console.log(`   • Queue: ${allQueue.length} total, ${stuckQueue.length} stuck`);
console.log(`   • Kernels: ${kernelSessions.length} sessions`);

if (stuckCells.length === 0 && stuckQueue.length === 0) {
  console.log("🎉 No stuck items found! State is clean.");
} else {
  console.log("\n🔧 Cleaning up stuck items:");

  // Clean up stuck execution queue entries
  for (const queueEntry of stuckQueue) {
    console.log(`   • Queue ${queueEntry.id}: ${queueEntry.status} -> cancelled`);

    try {
      store.commit(events.executionCancelled({
        queueId: queueEntry.id,
        cancelledBy: 'cleanup-script',
        cancelledAt: new Date(),
        reason: 'Cleanup script - execution was stuck'
      }));

      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`   ❌ Failed to cancel queue entry ${queueEntry.id}:`, error);
    }
  }

  // Reset stuck cells to idle state
  for (const cell of stuckCells) {
    console.log(`   • Cell ${cell.id}: ${cell.executionState} -> idle`);

    try {
      // Use a dummy source change to trigger state update to idle
      store.commit(events.cellSourceChanged({
        id: cell.id,
        source: cell.source || '',
        modifiedBy: 'cleanup-script'
      }));

      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`   ❌ Failed to reset cell ${cell.id}:`, error);
    }
  }

  console.log(`✅ Processed ${stuckQueue.length} queue entries and ${stuckCells.length} cells`);
}

// Show kernel session status
if (kernelSessions.length > 0) {
  console.log("\n🔍 Kernel sessions:");
  for (const session of kernelSessions) {
    const age = Math.round((Date.now() - new Date(session.lastHeartbeat).getTime()) / 1000);
    console.log(`   • ${session.sessionId}: ${session.status} (${age}s ago)`);

    // Mark old sessions as terminated
    if (session.isActive && age > 300) { // 5 minutes
      console.log(`   ⚠️ Marking stale session as terminated: ${session.sessionId}`);

      try {
        store.commit(events.kernelSessionTerminated({
          sessionId: session.sessionId,
          reason: 'timeout',
          terminatedAt: new Date()
        }));
      } catch (error) {
        console.error(`   ❌ Failed to terminate session ${session.sessionId}:`, error);
      }
    }
  }
}

// Give time for sync and verify cleanup worked
console.log("\n⏳ Waiting for sync...");
await new Promise(resolve => setTimeout(resolve, 3000));

const finalStuckCells = store.query(stuckCells$) as any[];
const finalStuckQueue = store.query(stuckQueue$) as any[];

if (finalStuckCells.length > 0 || finalStuckQueue.length > 0) {
  console.log(`⚠️ Warning: Still ${finalStuckCells.length} stuck cells and ${finalStuckQueue.length} stuck queue entries.`);
  console.log("💡 You may need to run this script again or check for sync issues.");
} else {
  console.log("✅ Verification passed: All items are in clean state!");
}

console.log("\n🧹 Cleanup complete!");
await store.shutdown();
process.exit(0);
