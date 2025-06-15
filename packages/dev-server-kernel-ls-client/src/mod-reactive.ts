// LiveStore <-> Pyodide kernel adapter with REACTIVE architecture
// Key changes from polling version:
// 1. Use queryDb() for reactive queries instead of polling intervals
// 2. Subscribe to execution queue changes with proper lifecycle management
// 3. Maintain same event flow but react automatically to data changes

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
const INITIAL_SYNC_DELAY = parseInt(process.env.INITIAL_SYNC_DELAY ?? "2000");

// Generate unique session ID for this kernel instance
const SESSION_ID = `${KERNEL_ID}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

console.log(`🔗 Starting REACTIVE kernel adapter for notebook '${NOTEBOOK_ID}'`);
console.log(`📝 Store ID: ${NOTEBOOK_ID} (same as notebook ID)`);
console.log(`🎯 Kernel ID: ${KERNEL_ID}`);
console.log(`🎫 Session ID: ${SESSION_ID}`);
console.log(`🔄 Sync URL: ${SYNC_URL}`);
console.log(`⚡ Using reactive queries instead of polling`);
console.log(`🤖 AI cell support: enabled (mock responses)`);

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
      canExecuteAi: true,
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

console.log("📝 Kernel session registered. Setting up reactive queries...");

// Track which executions we've processed to prevent duplicates
const processedExecutions = new Set<string>();
let isShuttingDown = false;

// Define reactive queries
console.log("🔍 Setting up reactive query for assigned work...");
const assignedWorkQuery$ = queryDb(
  tables.executionQueue.select()
    .where({
      status: 'assigned',
      assignedKernelSession: SESSION_ID
    })
    .orderBy('priority', 'desc'),
  {
    label: 'assignedWork',
    deps: [SESSION_ID] // React to changes in our session
  }
);

console.log("🔍 Setting up reactive query for pending work...");
const pendingWorkQuery$ = queryDb(
  tables.executionQueue.select()
    .where({ status: 'pending' })
    .orderBy('priority', 'desc')
    .limit(1), // Only look at the highest priority pending item
  {
    label: 'pendingWork'
  }
);

console.log("🔍 Setting up reactive query for active kernels...");
const activeKernelsQuery$ = queryDb(
  tables.kernelSessions.select()
    .where({ isActive: true, status: 'ready' }),
  {
    label: 'activeKernels'
  }
);

// Generate fake AI response for testing
async function generateFakeAiResponse(cell: any): Promise<any[]> {
  const provider = cell.aiProvider || 'openai';
  const model = cell.aiModel || 'gpt-4';
  const prompt = cell.source || '';

  // Simulate AI thinking time
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

  const responses = [
    `I understand you're asking: "${prompt}"\n\nThis is a mock response from ${model}. In the full implementation, I would analyze your notebook context and provide helpful insights.`,

    `Based on your prompt "${prompt}", here are some thoughts:\n\n1. This appears to be a question about your notebook\n2. I can see the context from previous cells\n3. Let me provide a helpful response\n\nNote: This is currently a mock response from the ${provider} ${model} integration.`,

    `Hello! I'm your AI assistant powered by ${model}.\n\nYour prompt: "${prompt}"\n\nI'm designed to help with:\n• Code analysis and debugging\n• Data interpretation\n• Suggestions for next steps\n• Answering questions about your work\n\nThis is a placeholder response while we build the real API integration.`,

    `Analyzing your request: "${prompt}"\n\n🔍 **Context Analysis:**\nI can see this is part of your notebook workflow. \n\n💡 **Insights:**\nBased on the pattern of your request, you might be interested in exploring data analysis techniques.\n\n🚀 **Next Steps:**\nConsider breaking down your problem into smaller components.\n\n*Note: This is a simulated ${provider} ${model} response for development.*`
  ];

  const randomResponse = responses[Math.floor(Math.random() * responses.length)];

  return [{
    type: "execute_result",
    data: { "text/plain": randomResponse },
    position: 0,
  }];
}

// Process execution function (same as before)
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

    // Check if this is an AI cell
    let outputs;
    if (cell.cellType === 'ai') {
      console.log(`🤖 Executing AI prompt for cell ${cell.id}:`);
      console.log(`    Provider: ${cell.aiProvider || 'openai'}`);
      console.log(`    Model: ${cell.aiModel || 'gpt-4'}`);
      console.log(`    Prompt: ${(cell.source || '').slice(0, 100)}${cell.source?.length > 100 ? '...' : ''}`);

      // Generate fake AI response
      outputs = await generateFakeAiResponse(cell);
      console.log(`📤 Generated ${outputs.length} AI outputs`);
    } else {
      console.log(`🐍 Executing Python code for cell ${cell.id}:`);
      console.log(`    ${(cell.source || '').slice(0, 100)}${cell.source?.length > 100 ? '...' : ''}`);

      // Execute the code
      outputs = await kernel.execute(cell.source ?? "");
      console.log(`📤 Generated ${outputs.length} outputs`);
    }

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

// Set up reactive subscriptions
let assignedWorkSubscription: (() => void) | null = null;
let pendingWorkSubscription: (() => void) | null = null;

console.log("📡 Setting up reactive subscription for assigned work...");
assignedWorkSubscription = store.subscribe(assignedWorkQuery$ as any, {
  onUpdate: async (entries: any[]) => {
    if (isShuttingDown) return;

    console.log(`🔔 Assigned work changed: ${entries.length} items for session ${SESSION_ID}`);

    // Defer processing to avoid reactive system conflicts
    setTimeout(async () => {
      for (const queueEntry of entries) {
        // Skip if already processed
        if (processedExecutions.has(queueEntry.id)) {
          continue;
        }

        // Mark as processed immediately to prevent duplicates
        processedExecutions.add(queueEntry.id);
        console.log(`📝 Processing assigned execution ${queueEntry.id}`);

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
    }, 0);
  }
});

console.log("📡 Setting up reactive subscription for pending work...");
pendingWorkSubscription = store.subscribe(pendingWorkQuery$ as any, {
  onUpdate: async (entries: any[]) => {
    if (isShuttingDown) return;

    console.log(`🔔 Pending work changed: ${entries.length} items available`);

    if (entries.length === 0) return;

    // Defer processing to avoid reactive system conflicts
    setTimeout(async () => {
      // Check if this kernel is ready to take work
      console.log("🔍 Checking if our kernel is ready...");
      const activeKernels = store.query(activeKernelsQuery$) as any[];
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
    }, 0);
  }
});

// Heartbeat mechanism to keep session alive (still using interval as it's not reactive)
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

// Graceful shutdown
const shutdown = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("🛑 Shutting down REACTIVE kernel adapter...");

  // Clear heartbeat interval
  clearInterval(heartbeatInterval);

  // Unsubscribe from reactive queries
  if (assignedWorkSubscription) {
    console.log("🔌 Unsubscribing from assigned work query...");
    assignedWorkSubscription();
    assignedWorkSubscription = null;
  }

  if (pendingWorkSubscription) {
    console.log("🔌 Unsubscribing from pending work query...");
    pendingWorkSubscription();
    pendingWorkSubscription = null;
  }

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

  console.log("✅ REACTIVE kernel adapter shutdown complete");
  process.exit(0);
};

// Handle shutdown signals
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("🎉 REACTIVE kernel adapter operational!");
console.log(`📡 Session ${SESSION_ID} listening for reactive queue changes...`);
console.log("🔄 Subscriptions active:");
console.log("  • Assigned work → immediate processing");
console.log("  • Pending work → automatic claiming");
console.log("🔌 Press Ctrl+C to stop");

// Keep process alive
let running = true;
while (running && !isShuttingDown) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
