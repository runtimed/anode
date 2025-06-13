// LiveStore <-> Pyodide kernel adapter with polling architecture
// Key changes:
// 1. NOTEBOOK_ID = STORE_ID for simplicity
// 2. Kernel lifecycle management with session tracking
// 3. Execution queue with proper kernel assignment
// 4. NO reactive subscriptions - polling only to avoid circular dependencies

import { makeAdapter } from "@livestore/adapter-node";
import { createStorePromise } from "@livestore/livestore";
import { makeCfSync } from "@livestore/sync-cf";

// Import the same schema used by the web client so we share events/tables.
import { events, schema, tables } from "@anode/schema";
import { PyodideKernel } from "./pyodide-kernel.js";

const NOTEBOOK_ID = process.env.NOTEBOOK_ID ?? "demo-notebook";
const AUTH_TOKEN = process.env.AUTH_TOKEN ?? "insecure-token-change-me";
const SYNC_URL = process.env.LIVESTORE_SYNC_URL ?? "ws://localhost:8787";
const KERNEL_ID = process.env.KERNEL_ID ?? `kernel-${process.pid}`;
const INITIAL_SYNC_DELAY = parseInt(process.env.INITIAL_SYNC_DELAY ?? "2000");

// Generate unique session ID for this kernel instance
const SESSION_ID = `${KERNEL_ID}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

console.log(`🔗 Starting kernel adapter for notebook '${NOTEBOOK_ID}'`);
console.log(`📝 Store ID: ${NOTEBOOK_ID} (same as notebook ID)`);
console.log(`🎯 Kernel ID: ${KERNEL_ID}`);
console.log(`🎫 Session ID: ${SESSION_ID}`);
console.log(`🔄 Sync URL: ${SYNC_URL}`);

const adapter = makeAdapter({
  storage: { type: "in-memory" },
  sync: {
    backend: makeCfSync({ url: SYNC_URL }),
    onSyncError: "ignore",
  },
});

// Add error handlers to track what causes shutdowns
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught exception that might trigger shutdown:");
  console.error(error.stack);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled rejection that might trigger shutdown:");
  console.error("Promise:", promise);
  console.error("Reason:", reason);
  if (reason instanceof Error) {
    console.error("Stack:", reason.stack);
  }
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

console.log(`✅ Kernel ready. Waiting ${INITIAL_SYNC_DELAY}ms for initial sync...`);
console.log("   This prevents sequence number conflicts with existing events in the eventlog");

// Wait for initial sync to complete before committing first event
// This prevents sequence number conflicts when the kernel starts
await new Promise(resolve => setTimeout(resolve, INITIAL_SYNC_DELAY));

console.log("📝 Initial sync delay complete. Checking store state...");

// Debug: Check current store state before committing
try {
  const existingNotebooks = store.query(tables.notebook.select()) as any[];
  const existingKernelSessions = store.query(tables.kernelSessions.select()) as any[];
  console.log(`📊 Store state: ${existingNotebooks.length} notebooks, ${existingKernelSessions.length} kernel sessions`);
} catch (error) {
  console.log("⚠️ Could not query store state:", error);
}

console.log("📝 Registering kernel session...");

// Register this kernel session
console.log("🔄 Committing kernelSessionStarted event...");
try {
  store.commit(events.kernelSessionStarted({
    sessionId: SESSION_ID,
    kernelId: KERNEL_ID,
    kernelType: "python3",
    capabilities: {
      canExecuteCode: true,
      canExecuteSql: false,
      canExecuteAi: false,
    },
  }));
  console.log("✅ kernelSessionStarted event committed successfully");
} catch (error) {
  console.error("❌ Failed to commit kernelSessionStarted event:", error);
  if (error instanceof Error) {
    console.error("Stack trace:", error.stack);
  }
  throw error;
}

console.log("📝 Kernel session registered. Setting up polling loops...");

// Track which executions we've processed to prevent duplicates
const processedExecutions = new Set<string>();
let isShuttingDown = false;

// Heartbeat mechanism to keep session alive
const heartbeatInterval = setInterval(() => {
  if (isShuttingDown) return;

  try {
    console.log("🔄 Sending heartbeat...");
    store.commit(events.kernelSessionHeartbeat({
      sessionId: SESSION_ID,
      status: "ready",
    }));
    console.log("💓 Heartbeat sent successfully");
  } catch (error) {
    console.warn("⚠️ Heartbeat failed:", error);
    if (error instanceof Error) {
      console.warn("Heartbeat error stack:", error.stack);
    }
  }
}, 30000); // Every 30 seconds

// Poll for assigned work - this is the main execution loop
const pollAssignedWork = async () => {
  if (isShuttingDown) return;

  try {
    console.log("🔍 Polling assigned work...");
    const entries = store.query(
      tables.executionQueue.select()
        .where({
          status: 'assigned',
          assignedKernelSession: SESSION_ID
        })
        .orderBy('requestedAt', 'asc')
    ) as any[];
    console.log(`📋 Found ${entries.length} assigned entries`);

    if (entries.length > 0) {
      console.log(`📋 Found ${entries.length} items assigned to us`);
    }

    for (const queueEntry of entries) {
      // Skip if already processed
      if (processedExecutions.has(queueEntry.id)) {
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
            error: error instanceof Error ? error.message : String(error),
          }));
        } catch (commitError) {
          console.error(`💥 Failed to mark execution as failed:`, commitError);
          if (commitError instanceof Error) {
            console.error("Commit error stack:", commitError.stack);
          }
        }
      }
    }
  } catch (error) {
    console.error("💥 Error polling assigned work:", error);
    if (error instanceof Error) {
      console.error("Stack trace:", error.stack);
    }
  }
};

// Poll for pending work to claim
const pollPendingWork = async () => {
  if (isShuttingDown) return;

  try {
    console.log("🔍 Polling pending work...");
    const entries = store.query(
      tables.executionQueue.select()
        .where({ status: 'pending' })
        .orderBy('priority', 'desc')
        .orderBy('requestedAt', 'asc')
        .limit(1) // Only claim one at a time
    ) as any[];
    console.log(`📋 Found ${entries.length} pending entries`);

    if (entries.length === 0) return;

    console.log(`🔍 Found ${entries.length} pending executions`);

    // Check if this kernel is ready to take work
    console.log("🔍 Checking active kernels...");
    const activeKernels = store.query(
      tables.kernelSessions.select()
        .where({ isActive: true, status: 'ready' })
        .orderBy('lastHeartbeat', 'desc')
    ) as any[];
    console.log(`🤖 Found ${activeKernels.length} active kernels`);

    const ourKernel = activeKernels.find((k: any) => k.sessionId === SESSION_ID);
    if (!ourKernel) {
      console.log(`⚠️ Our kernel session not found or not ready`);
      return;
    }

    // Try to claim the first available execution
    const firstPending = entries[0];
    if (firstPending && firstPending.status === 'pending') {
      console.log(`🎯 Attempting to claim execution ${firstPending.id} for cell ${firstPending.cellId}`);

      try {
        store.commit(events.executionAssigned({
          queueId: firstPending.id,
          kernelSessionId: SESSION_ID,
        }));
        console.log(`✅ Successfully claimed execution ${firstPending.id}`);
      } catch (error) {
        console.warn(`⚠️ Failed to claim execution ${firstPending.id}:`, error);
      }
    }
  } catch (error) {
    console.error(`💥 Error polling pending work:`, error);
    if (error instanceof Error) {
      console.error("Stack trace:", error.stack);
    }
  }
};

async function processExecution(queueEntry: any) {
  console.log(`⚡ Processing execution ${queueEntry.id} for cell ${queueEntry.cellId}`);

  try {
    // Get the cell details
    const cells = store.query(
      tables.cells.select().where({ id: queueEntry.cellId })
    ) as any[];
    const cell = cells[0];

    if (!cell) {
      throw new Error(`Cell ${queueEntry.cellId} not found`);
    }

    // Mark execution as started
    store.commit(events.executionStarted({
      queueId: queueEntry.id,
      kernelSessionId: SESSION_ID,
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
      }));
    });

    // Mark execution as completed
    const hasErrors = outputs.some(o => o.type === "error");
    store.commit(events.executionCompleted({
      queueId: queueEntry.id,
      status: hasErrors ? "error" : "success",
      error: hasErrors ? "Execution completed with errors" : undefined,
    }));

    console.log(`✅ Execution ${queueEntry.id} completed (${hasErrors ? 'with errors' : 'success'})`);
  } catch (error) {
    console.error(`❌ Error in processExecution for ${queueEntry.id}:`, error);
    if (error instanceof Error) {
      console.error("Stack trace:", error.stack);
    }

    // Mark execution as failed
    try {
      store.commit(events.executionCompleted({
        queueId: queueEntry.id,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      }));
    } catch (commitError) {
      console.error(`💥 Failed to mark execution as failed:`, commitError);
      if (commitError instanceof Error) {
        console.error("Commit error stack:", commitError.stack);
      }
    }
  }
}

// Start polling loops
console.log(`🎯 Starting polling loops for session ${SESSION_ID}...`);
const assignedWorkPolling = setInterval(pollAssignedWork, 500); // Poll every 500ms for assigned work
const pendingWorkPolling = setInterval(pollPendingWork, 2000); // Poll every 2s for pending work

// Graceful shutdown
const shutdown = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("🛑 Shutting down kernel adapter...");

  // Clear all intervals
  clearInterval(heartbeatInterval);
  clearInterval(assignedWorkPolling);
  clearInterval(pendingWorkPolling);

  // Mark session as terminated
  try {
    store.commit(events.kernelSessionTerminated({
      sessionId: SESSION_ID,
      reason: "shutdown",
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

// Note: uncaughtException and unhandledRejection handlers moved up to provide more debugging info

console.log("🎉 Kernel adapter operational!");
console.log(`📡 Session ${SESSION_ID} waiting for execution assignments...`);
console.log("🔌 Press Ctrl+C to stop");

// Keep process alive
let running = true;
while (running && !isShuttingDown) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
