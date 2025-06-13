// LiveStore <-> Pyodide kernel adapter with simplified architecture
// Key changes:
// 1. NOTEBOOK_ID = STORE_ID for simplicity
// 2. Kernel lifecycle management with session tracking
// 3. Execution queue with proper kernel assignment
// 4. Prevents stale kernels from processing work

import { makeAdapter } from "@livestore/adapter-node";
import { createStorePromise, queryDb } from "@livestore/livestore";
import { makeCfSync } from "@livestore/sync-cf";

// Import the same schema used by the web client so we share events/tables.
import { events, schema, tables } from "@anode/schema";
import { PyodideKernel } from "./pyodide-kernel.js";

const NOTEBOOK_ID = process.env.NOTEBOOK_ID ?? "demo-notebook";
const AUTH_TOKEN = process.env.AUTH_TOKEN ?? "insecure-token-change-me";
const SYNC_URL = process.env.LIVESTORE_SYNC_URL ?? "ws://localhost:8787";
const KERNEL_ID = process.env.KERNEL_ID ?? `kernel-${process.pid}`;

// Generate unique session ID for this kernel instance
const SESSION_ID = `${KERNEL_ID}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

console.log(`🔗 Starting kernel adapter for notebook '${NOTEBOOK_ID}'`);
console.log(`📝 Store ID: ${NOTEBOOK_ID} (same as notebook ID)`);
console.log(`🎯 Kernel ID: ${KERNEL_ID}`);
console.log(`🎫 Session ID: ${SESSION_ID}`);
console.log(`🔄 Sync URL: ${SYNC_URL}`);

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
  storeId: NOTEBOOK_ID, // This is the notebook ID - simplified!
  syncPayload: {
    authToken: AUTH_TOKEN,
    kernel: true,
    kernelId: KERNEL_ID,
    sessionId: SESSION_ID,
  },
});
console.log(`✅ Store created successfully`);

const kernel = new PyodideKernel(NOTEBOOK_ID);
await kernel.initialize();

console.log("✅ Kernel ready. Registering session...");

// Register this kernel session
store.commit(events.kernelSessionStarted({
  sessionId: SESSION_ID,
  kernelId: KERNEL_ID,
  kernelType: "python3",
  startedAt: new Date(),
  capabilities: {
    canExecuteCode: true,
    canExecuteSql: false,
    canExecuteAi: false,
  },
}));

console.log("📝 Kernel session registered. Setting up execution queue monitoring...");

// Heartbeat mechanism to keep session alive
let isShuttingDown = false;
const heartbeatInterval = setInterval(() => {
  if (isShuttingDown) return;

  try {
    store.commit(events.kernelSessionHeartbeat({
      sessionId: SESSION_ID,
      heartbeatAt: new Date(),
      status: "ready", // TODO: track actual busy state
    }));
  } catch (error) {
    console.warn("⚠️ Heartbeat failed:", error);
  }
}, 30000); // Every 30 seconds

// Track which executions we've processed to prevent duplicates
const processedExecutions = new Set<string>();

// Monitor execution queue for work assigned to this kernel session
const assignedWork$ = queryDb(
  tables.executionQueue.query
    .where({
      status: 'assigned',
      assignedKernelSession: SESSION_ID
    })
    .orderBy('requestedAt', 'asc'),
  { label: 'assignedWork' }
);

console.log(`🎯 Monitoring execution queue for session ${SESSION_ID}...`);

store.subscribe(assignedWork$, {
  onUpdate: async (queueEntries: any) => {
    const entries = queueEntries as any[];
    console.log(`📋 Queue update: ${entries.length} items assigned to us`);

    for (const queueEntry of entries) {
      // Skip if already processed
      if (processedExecutions.has(queueEntry.id)) {
        console.log(`⏭️ Skipping ${queueEntry.id} - already processed`);
        continue;
      }

      // Mark as processed immediately to prevent duplicates
      processedExecutions.add(queueEntry.id);

      try {
        await processExecution(queueEntry);
      } catch (error) {
        console.error(`❌ Error processing execution ${queueEntry.id}:`, error);

        // Mark as failed
        try {
          store.commit(events.executionCompleted({
            queueId: queueEntry.id,
            status: "error",
            completedAt: new Date(),
            error: error instanceof Error ? error.message : String(error),
          }));
        } catch (commitError) {
          console.error(`💥 Failed to mark execution as failed:`, commitError);
        }
      }
    }
  }
});

// Also monitor for new pending executions that need assignment
// This kernel will try to claim unassigned work
const pendingWork$ = queryDb(
  tables.executionQueue.query
    .where({ status: 'pending' })
    .orderBy('priority', 'desc')
    .orderBy('requestedAt', 'asc')
    .limit(5), // Only look at top 5 to avoid overwhelming
  { label: 'pendingWork' }
);

store.subscribe(pendingWork$, {
  onUpdate: async (pendingEntries: any) => {
    const entries = pendingEntries as any[];
    if (entries.length === 0) return;

    console.log(`🔍 Found ${entries.length} pending executions`);

    // Check if this kernel is ready to take work
    const activeKernels = store.query(
      tables.kernelSessions.query
        .where({ isActive: true, status: 'ready' })
        .orderBy('lastHeartbeat', 'desc')
    ) as any[];

    const ourKernel = activeKernels.find((k: any) => k.sessionId === SESSION_ID);
    if (!ourKernel) {
      console.log(`⚠️ Our kernel session not found or not ready`);
      return;
    }

    // Try to claim the first available execution
    const firstPending = entries[0];
    if (firstPending && firstPending.status === 'pending') {
      console.log(`🎯 Attempting to claim execution ${firstPending.id}`);

      try {
        store.commit(events.executionAssigned({
          queueId: firstPending.id,
          kernelSessionId: SESSION_ID,
          assignedAt: new Date(),
        }));
        console.log(`✅ Successfully claimed execution ${firstPending.id}`);
      } catch (error) {
        console.warn(`⚠️ Failed to claim execution ${firstPending.id}:`, error);
      }
    }
  }
});

async function processExecution(queueEntry: any) {
  console.log(`⚡ Processing execution ${queueEntry.id} for cell ${queueEntry.cellId}`);

  // Get the cell details
  const cells = store.query(
    tables.cells.query.where({ id: queueEntry.cellId })
  ) as any[];
  const cell = cells[0];

  if (!cell) {
    throw new Error(`Cell ${queueEntry.cellId} not found`);
  }

  // Mark execution as started
  store.commit(events.executionStarted({
    queueId: queueEntry.id,
    kernelSessionId: SESSION_ID,
    startedAt: new Date(),
  }));

  // Clear previous outputs
  store.commit(events.cellOutputsCleared({
    cellId: cell.id,
    clearedBy: `kernel-${KERNEL_ID}`,
  }));

  console.log(`🐍 Executing Python code for cell ${cell.id}:`);
  console.log(`    ${(cell.source || '').slice(0, 100)}${cell.source?.length > 100 ? '...' : ''}`);

  // Execute the code
  const outputs = await kernel.execute(cell.source ?? "");
  console.log(`📤 Generated ${outputs.length} outputs`);

  // Emit outputs
  outputs.forEach((output, idx) => {
    store.commit(events.cellOutputAdded({
      id: crypto.randomUUID(),
      cellId: cell.id,
      outputType: output.type as any,
      data: output.data,
      position: idx,
      createdAt: new Date(),
    }));
  });

  // Mark execution as completed
  const hasErrors = outputs.some(o => o.type === "error");
  store.commit(events.executionCompleted({
    queueId: queueEntry.id,
    status: hasErrors ? "error" : "success",
    completedAt: new Date(),
    error: hasErrors ? "Execution completed with errors" : undefined,
  }));

  console.log(`✅ Execution ${queueEntry.id} completed (${hasErrors ? 'with errors' : 'success'})`);
}

// Graceful shutdown
const shutdown = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("🛑 Shutting down kernel adapter...");

  // Clear heartbeat
  clearInterval(heartbeatInterval);

  // Mark session as terminated
  try {
    store.commit(events.kernelSessionTerminated({
      sessionId: SESSION_ID,
      reason: "shutdown",
      terminatedAt: new Date(),
    }));
    console.log("📝 Kernel session marked as terminated");
  } catch (error) {
    console.warn("⚠️ Failed to mark session as terminated:", error);
  }

  // Give a moment for the event to sync
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Shutdown store and kernel
  await store.shutdown?.();
  await kernel.terminate();

  console.log("✅ Kernel adapter shutdown complete");
  process.exit(0);
};

// Handle shutdown signals
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught exception:", error);
  shutdown();
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled rejection at:", promise, "reason:", reason);
  shutdown();
});

console.log("🎉 Kernel adapter operational!");
console.log(`📡 Session ${SESSION_ID} waiting for execution assignments...`);
console.log("🔌 Press Ctrl+C to stop");

// Keep process alive
let running = true;
while (running && !isShuttingDown) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
