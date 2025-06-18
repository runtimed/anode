// LiveStore <-> Pyodide kernel adapter with REACTIVE architecture
// Key changes from polling version:
// 1. Use queryDb() for reactive queries instead of polling intervals
// 2. Subscribe to execution queue changes with proper lifecycle management
// 3. Maintain same event flow but react automatically to data changes

import { makeAdapter } from "@livestore/adapter-node";
import { createStorePromise, queryDb } from "@livestore/livestore";
import { makeCfSync } from "@livestore/sync-cf";
import { randomUUID } from "crypto";

// Import the same schema used by the web client so we share events/tables.
import { events, schema, tables, CellData, ExecutionQueueData, KernelSessionData, OutputData } from "../../../shared/schema.js";
import { PyodideKernel } from "./pyodide-kernel.js";
import { openaiClient } from "./openai-client.js";

const NOTEBOOK_ID = process.env.NOTEBOOK_ID ?? "demo-notebook";
const AUTH_TOKEN = process.env.AUTH_TOKEN ?? "insecure-token-change-me";
const SYNC_URL = process.env.LIVESTORE_SYNC_URL ?? "ws://localhost:8787";
const KERNEL_ID = process.env.KERNEL_ID ?? `kernel-${process.pid}`;

// Generate unique session ID for this kernel instance
const SESSION_ID = `${KERNEL_ID}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

console.log(`🔗 Starting REACTIVE kernel adapter for notebook '${NOTEBOOK_ID}'`);
console.log(`📝 Store ID: ${NOTEBOOK_ID} (same as notebook ID)`);
console.log(`🎯 Kernel ID: ${KERNEL_ID}`);
console.log(`🎫 Session ID: ${SESSION_ID}`);
console.log(`🔄 Sync URL: ${SYNC_URL}`);
console.log(`⚡ Using reactive queries instead of polling`);
console.log(`🤖 AI cell support: enabled (${openaiClient.isReady() ? 'OpenAI configured' : 'mock responses only - set OPENAI_API_KEY for real AI'})`);

const adapter = makeAdapter({
  storage: { type: "in-memory" },
  sync: {
    backend: makeCfSync({ url: SYNC_URL }),
    onSyncError: "ignore",
  },
});

// Add error handlers to track what causes shutdowns
process.on("uncaughtException", (error: any) => {
  console.error("💥 Uncaught exception that might trigger shutdown:");
  console.error(error.stack);
});

process.on("unhandledRejection", (reason: any, promise: any) => {
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

  // Send immediate heartbeat to show UI as connected right away
  console.log("💓 Sending immediate heartbeat for instant UI feedback...");
  store.commit(events.kernelSessionHeartbeat({
    sessionId: SESSION_ID,
    status: "ready",
    timestamp: new Date(),
  }));
  console.log("✅ Initial heartbeat sent successfully");
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

// Context interface for AI cells
interface NotebookContext {
  previousCells: Array<{
    id: string;
    cellType: string;
    source: string;
    position: number;
    outputs: Array<{
      outputType: string;
      data: any;
    }>;
  }>;
  totalCells: number;
  currentCellPosition: number;
}

// Gather context from previous cells for AI execution
async function gatherNotebookContext(store: any, currentCell: CellData): Promise<NotebookContext> {
  // Query all cells that come before the current cell AND are visible to AI
  const previousCellsQuery = queryDb(
    tables.cells.select()
      .where({
        position: { op: '<', value: currentCell.position },
        aiContextVisible: true
      })
      .orderBy('position', 'asc')
  );

  const previousCells = store.query(previousCellsQuery);

  // Query total cell count for context
  const allCellsQuery = queryDb(tables.cells.select());
  const allCells = store.query(allCellsQuery);

  // Get outputs for all previous cells
  const previousCellsWithOutputs = previousCells.map((cell: CellData) => {
    const outputsQuery = queryDb(
      tables.outputs.select()
        .where({ cellId: cell.id })
        .orderBy('position', 'asc')
    );
    const outputs = store.query(outputsQuery);

    // Filter outputs to only include text/plain and text/markdown for AI context
    const filteredOutputs = outputs.map((output: any) => {
      const outputData = output.data;
      const filteredData: any = {};

      // Include text/plain and text/markdown outputs
      if (outputData && typeof outputData === 'object') {
        if (outputData['text/plain']) {
          filteredData['text/plain'] = outputData['text/plain'];
        }
        if (outputData['text/markdown']) {
          filteredData['text/markdown'] = outputData['text/markdown'];
        }
        // For stream outputs, include the text directly
        if (outputData.text && outputData.name) {
          filteredData.text = outputData.text;
          filteredData.name = outputData.name;
        }
        // For error outputs, include error info
        if (outputData.ename && outputData.evalue) {
          filteredData.ename = outputData.ename;
          filteredData.evalue = outputData.evalue;
          if (outputData.traceback) {
            filteredData.traceback = outputData.traceback;
          }
        }
      }

      return {
        outputType: output.outputType,
        data: Object.keys(filteredData).length > 0 ? filteredData : outputData
      };
    });

    return {
      id: cell.id,
      cellType: cell.cellType,
      source: cell.source || '',
      position: cell.position,
      outputs: filteredOutputs
    };
  });

  return {
    previousCells: previousCellsWithOutputs,
    totalCells: allCells.length,
    currentCellPosition: currentCell.position
  };
}

// Build system prompt with notebook context
function buildSystemPromptWithContext(context: NotebookContext): string {
  let systemPrompt = `You are a helpful AI assistant in a Jupyter-like notebook environment. You have access to the context of previous cells in the notebook.

**Notebook Context:**
- Total cells: ${context.totalCells}
- Current cell position: ${context.currentCellPosition}
- Previous cells visible to AI: ${context.previousCells.length}

**Previous Cell Contents (only cells marked as visible to AI):**
`;

  if (context.previousCells.length === 0) {
    systemPrompt += "No previous cells are visible to AI in this notebook (either no previous cells exist or they have been hidden from AI context).\n";
  } else {
    context.previousCells.forEach((cell, index) => {
      systemPrompt += `
Cell ${index + 1} (Position ${cell.position}, Type: ${cell.cellType}):
\`\`\`${cell.cellType === 'code' ? 'python' : cell.cellType}
${cell.source}
\`\`\`
`;

      // Include outputs if they exist
      if (cell.outputs && cell.outputs.length > 0) {
        systemPrompt += `
Output:
`;
        cell.outputs.forEach((output) => {
          if (output.outputType === 'stream') {
            // Handle stream outputs (stdout/stderr)
            if (output.data.text) {
              systemPrompt += `\`\`\`
${output.data.text}
\`\`\`
`;
            }
          } else if (output.outputType === 'error') {
            // Handle error outputs
            if (output.data.ename && output.data.evalue) {
              systemPrompt += `\`\`\`
Error: ${output.data.ename}: ${output.data.evalue}
\`\`\`
`;
            }
          } else if (output.outputType === 'execute_result' || output.outputType === 'display_data') {
            // Handle rich outputs
            if (output.data['text/plain']) {
              systemPrompt += `\`\`\`
${output.data['text/plain']}
\`\`\`
`;
            }
            if (output.data['text/markdown']) {
              systemPrompt += `
${output.data['text/markdown']}
`;
            }
          }
        });
      }
    });
  }

  systemPrompt += `
**Instructions:**
- Provide clear, concise responses and include code examples when appropriate
- Reference previous cells when relevant to provide context-aware assistance
- If you see variables, functions, or data structures defined in previous cells, you can reference them
- You can see the outputs from previous code executions to understand the current state
- Help with debugging, optimization, or extending the existing code
- Suggest next steps based on the notebook's progression`;

  return systemPrompt;
}

// Helper function to calculate new cell position
function calculateNewCellPosition(store: any, currentCell: CellData, placement: string): number {
  const allCells = store.query(queryDb(tables.cells.select().orderBy('position', 'asc'))) as CellData[];

  switch (placement) {
    case 'before_current':
      return currentCell.position - 0.1;
    case 'at_end':
      const maxPosition = allCells.length > 0 ? Math.max(...allCells.map(c => c.position)) : 0;
      return maxPosition + 1;
    case 'after_current':
    default:
      return currentCell.position + 0.1;
  }
}

// Tool execution handler
async function handleToolCall(store: any, currentCell: CellData, toolCall: { id: string; name: string; arguments: any }): Promise<void> {
  const { name, arguments: args } = toolCall;

  switch (name) {
    case 'create_cell':
      const { cellType, content, position = 'after_current' } = args;

      // Calculate position for new cell
      const newPosition = calculateNewCellPosition(store, currentCell, position);

      // Generate unique cell ID
      const newCellId = `cell-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      console.log(`🔧 Creating ${cellType} cell at position ${newPosition}`);

      // Create the new cell
      store.commit(events.cellCreated({
        id: newCellId,
        cellType: cellType as any,
        position: newPosition,
        createdBy: `ai-assistant-${SESSION_ID}`,
      }));

      // Set the cell source if provided
      if (content) {
        store.commit(events.cellSourceChanged({
          id: newCellId,
          source: content,
          modifiedBy: `ai-assistant-${SESSION_ID}`,
        }));
      }

      console.log(`✅ Created cell ${newCellId} with ${content.length} characters`);
      break;

    default:
      console.warn(`⚠️ Unknown tool: ${name}`);
  }
}

// Generate fake AI response for testing with rich output support
async function generateFakeAiResponse(cell: any, context?: NotebookContext): Promise<any[]> {
  const provider = cell.aiProvider || 'openai';
  const model = cell.aiModel || 'gpt-4o-mini';
  const prompt = cell.source || '';

  // Simulate AI thinking time (reduced for better dev experience)
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 500));

  // Generate context-aware response
  let contextInfo = '';
  if (context && context.previousCells.length > 0) {
    contextInfo = `

## 📚 Notebook Context Analysis

I can see **${context.previousCells.length} previous cells** in this notebook:

`;
    context.previousCells.forEach((cell, index) => {
      const preview = cell.source.slice(0, 100);
      contextInfo += `- **Cell ${index + 1}** (${cell.cellType}): ${preview}${cell.source.length > 100 ? '...' : ''}\n`;
    });
  } else if (context) {
    contextInfo = '\n\n## 📚 Notebook Context\n\nThis appears to be the first cell in your notebook.\n';
  }

  // Create rich markdown responses with various content types
  const markdownResponses = [
`I understand you're asking: "${prompt}"

This is a **mock response** from \`${model}\` with notebook context awareness.${contextInfo}

## 🔍 Analysis & Suggestions

Based on your prompt and notebook context:
- 💡 **Context Understanding**: I can see the progression of your work
- 📊 **Data Insights**: Previous cells provide valuable context
- 🚀 **Next Steps**: Building on existing code and variables

\`\`\`python
# Example based on notebook context
import pandas as pd
df = pd.read_csv('data.csv')
df.head()
\`\`\`

> **Note**: This is a simulated response. Real AI integration will provide deeper context analysis.`,

    `# 🤖 ${provider.toUpperCase()} ${model} Response

Based on your prompt: **"${prompt}"**${contextInfo}

## Analysis

1. **Context Understanding**: Analyzed your notebook progression
2. **Data Insights**: Building on previous cells and variables
3. **Recommendations**: Context-aware suggestions

## Code Example

\`\`\`python
# Based on your question, you might find this helpful:
import matplotlib.pyplot as plt
import numpy as np

# Generate sample data
x = np.linspace(0, 10, 100)
y = np.sin(x)

plt.figure(figsize=(10, 6))
plt.plot(x, y, 'b-', linewidth=2)
plt.title('Example Visualization')
plt.xlabel('X values')
plt.ylabel('Y values')
plt.grid(True, alpha=0.3)
plt.show()
\`\`\`

---
*This is currently a mock response from the ${provider} ${model} integration.*`,

    `# Hello! 👋 I'm your AI assistant

**Powered by**: ${provider} ${model}

## Your prompt
> "${prompt}"${contextInfo}

## How I can help

| Area | Description |
|------|-------------|
| 🔧 **Code Analysis** | Debug and optimize your code |
| 📊 **Data Interpretation** | Analyze patterns and insights |
| 💡 **Suggestions** | Recommend next steps |
| ❓ **Q&A** | Answer questions about your work |

## Example Analysis

\`\`\`python
# Let's say you have this data:
data = {
    'category': ['A', 'B', 'C', 'D'],
    'values': [23, 45, 56, 78]
}

# I could suggest:
import pandas as pd
df = pd.DataFrame(data)
print(df.describe())
\`\`\`

### 🚀 Ready to help!
This is a placeholder response while we build the real API integration.`,

    `# 🔍 Analysis Results

## Request Analysis
**Your prompt**: "${prompt}"${contextInfo}

### Context Analysis
Building on your existing notebook workflow to provide targeted assistance!

### Recommendations

#### 1. **Data Exploration**
Start with understanding your data structure:

\`\`\`python
# Basic data exploration
print(f"Shape: {df.shape}")
print(f"Columns: {df.columns.tolist()}")
print(f"Data types:\\n{df.dtypes}")
\`\`\`

#### 2. **Visualization Strategy**
Consider these visualization approaches:

- **Scatter plots** for relationships
- **Histograms** for distributions
- **Box plots** for outlier detection

#### 3. **Next Steps**
Break down your problem into:
1. Data cleaning
2. Exploratory analysis
3. Hypothesis testing
4. Results interpretation

---

> 💡 **Tip**: This is a simulated ${provider} ${model} response for development. The real integration will provide context-aware insights based on your actual notebook content.`
  ];

  // Occasionally generate SVG examples
  const shouldGenerateSvg = Math.random() < 0.2; // 20% chance

  if (shouldGenerateSvg) {
    const svgExample = `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2"/>
  <circle cx="150" cy="100" r="60" fill="#007bff" opacity="0.7"/>
  <text x="150" y="105" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="white">
    AI Response
  </text>
  <text x="150" y="170" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#6c757d">
    ${provider} ${model}
  </text>
</svg>`;

    return [{
      type: "execute_result",
      data: {
        "text/markdown": `# AI Response with Visualization

Here's an example of how I can provide visual responses:`,
        "image/svg+xml": svgExample,
        "text/plain": `AI Response from ${provider} ${model} with SVG visualization`
      },
      position: 0,
    }];
  }

  const randomResponse = markdownResponses[Math.floor(Math.random() * markdownResponses.length)];

  return [{
    type: "execute_result",
    data: {
      "text/markdown": randomResponse,
      "text/plain": randomResponse.replace(/[#*`>|\-]/g, '').replace(/\n+/g, '\n').trim() // Fallback plain text
    },
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
      cellId: queueEntry.cellId,
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

      // Gather context from previous cells
      const context = await gatherNotebookContext(store, cell);
      console.log(`📚 Gathered context from ${context.previousCells.length} previous cells`);

      // Use real OpenAI API if configured, otherwise fall back to mock
      if (openaiClient.isReady() && (cell.aiProvider === 'openai' || !cell.aiProvider)) {
        outputs = await openaiClient.generateResponse(cell.source || '', {
          model: cell.aiModel || 'gpt-4o-mini',
          provider: cell.aiProvider || 'openai',
          systemPrompt: buildSystemPromptWithContext(context),
          enableTools: true,
          currentCellId: cell.id,
          onToolCall: async (toolCall) => {
            console.log(`🔧 AI requested tool call: ${toolCall.name}`);
            await handleToolCall(store, cell, toolCall);
          }
        });
      } else {
        // Generate fake AI response for development/testing
        outputs = await generateFakeAiResponse(cell, context);
      }
      console.log(`📤 Generated ${outputs.length} AI outputs`);
    } else {
      console.log(`🐍 Executing Python code for cell ${cell.id}:`);
      console.log(`    ${(cell.source || '').slice(0, 100)}${cell.source?.length > 100 ? '...' : ''}`);

      // Execute the code
      outputs = await kernel.execute(cell.source ?? "");
      console.log(`📤 Generated ${outputs.length} outputs`);
    }

    // Emit outputs with metadata support
    outputs.forEach((output, idx) => {
      store.commit(events.cellOutputAdded({
        id: randomUUID(),
        cellId: cell.id,
        outputType: output.type as any,
        data: output.data,
        metadata: output.metadata || undefined,
        position: idx,
      }));
    });

    // Mark execution as completed
    const hasErrors = outputs.some(o => o.type === "error");
    store.commit(events.executionCompleted({
      queueId: queueEntry.id,
      cellId: queueEntry.cellId,
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
        cellId: queueEntry.cellId,
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
              cellId: queueEntry.cellId,
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
      timestamp: new Date(),
    }));
    console.log("💓 Heartbeat sent successfully");
  } catch (error) {
    console.warn("⚠️ Heartbeat failed:", error);
    if (error instanceof Error) {
      console.warn("Heartbeat error stack:", error.stack);
    }
  }
}, 15000); // Every 15 seconds (reduced from 30s for better UI responsiveness)

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

  // Event sync is handled by reactive system - no delay needed

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
