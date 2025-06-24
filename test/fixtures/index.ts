// Test fixtures and mock data for Anode tests

export const mockNotebookData = {
  id: "test-notebook-123",
  title: "Test Notebook",
};

export const mockCellData = {
  id: "test-cell-456",
  notebookId: "test-notebook-123",
  source: 'print("Hello, World!")',
  cellType: "code" as const,
  position: 0,
};

export const mockKernelSession = {
  sessionId: "test-session-789",
  kernelId: "test-kernel-101",
  kernelType: "python3" as const,
  isActive: true,
  status: "ready" as const,
  lastHeartbeat: new Date("2024-01-01T00:00:00Z"),
  capabilities: {
    canExecuteCode: true,
    canExecuteSql: false,
    canExecuteAi: false,
  },
};

export const mockExecutionQueueEntry = {
  id: "test-queue-202",
  cellId: "test-cell-456",
  status: "pending" as const,
  priority: 1,
  assignedKernelSession: null,
  error: null,
};

export const mockCellOutput = {
  id: "test-output-303",
  cellId: "test-cell-456",
  outputType: "stdout" as const,
  data: "Hello, World!\n",
  position: 0,
};

// Python code samples for testing
export const pythonCodeSamples = {
  simple: 'print("Hello, World!")',
  withVariables: `
x = 42
y = "test"
print(f"x = {x}, y = {y}")
`,
  withError: `
# This will cause a NameError
print(undefined_variable)
`,
  withImport: `
import math
result = math.sqrt(16)
print(f"Square root of 16 is {result}")
`,
  longRunning: `
import time
for i in range(3):
    print(f"Step {i + 1}")
    time.sleep(0.1)
print("Done!")
`,
  multipleOutputs: `
print("First output")
print("Second output", file=sys.stderr)
42  # This should be captured as the result
`,
};

// LiveStore event fixtures
export const mockEvents = {
  notebookCreated: {
    name: "v1.NotebookCreated",
    args: {
      id: mockNotebookData.id,
      title: mockNotebookData.title,
    },
  },
  cellCreated: {
    name: "v1.CellCreated",
    args: {
      id: mockCellData.id,
      notebookId: mockCellData.notebookId,
      source: mockCellData.source,
      cellType: mockCellData.cellType,
      position: mockCellData.position,
    },
  },
  executionRequested: {
    name: "v1.ExecutionRequested",
    args: {
      cellId: mockCellData.id,
      queueId: mockExecutionQueueEntry.id,
      priority: mockExecutionQueueEntry.priority,
    },
  },
  executionAssigned: {
    name: "v1.ExecutionAssigned",
    args: {
      queueId: mockExecutionQueueEntry.id,
      kernelSessionId: mockKernelSession.sessionId,
    },
  },
  executionStarted: {
    name: "v1.ExecutionStarted",
    args: {
      queueId: mockExecutionQueueEntry.id,
      cellId: mockCellData.id,
      kernelSessionId: mockKernelSession.sessionId,
      startedAt: new Date(),
    },
  },
  executionCompleted: {
    name: "v1.ExecutionCompleted",
    args: {
      queueId: mockExecutionQueueEntry.id,
      cellId: mockCellData.id,
      status: "success" as const,
      error: null,
      completedAt: new Date(),
      executionDurationMs: 100,
    },
  },
  kernelSessionStarted: {
    name: "v1.KernelSessionStarted",
    args: mockKernelSession,
  },
  kernelSessionHeartbeat: {
    name: "v1.KernelSessionHeartbeat",
    args: {
      sessionId: mockKernelSession.sessionId,
      status: "ready" as const,
      timestamp: new Date(),
    },
  },
  kernelSessionTerminated: {
    name: "v1.KernelSessionTerminated",
    args: {
      sessionId: mockKernelSession.sessionId,
      reason: "shutdown",
    },
  },
  cellOutputAdded: {
    name: "v1.CellOutputAdded",
    args: mockCellOutput,
  },
  cellOutputsCleared: {
    name: "v1.CellOutputsCleared",
    args: {
      cellId: mockCellData.id,
      clearedBy: "test-kernel",
    },
  },
};

// Expected execution flow for testing
export const mockExecutionFlow = [
  mockEvents.executionRequested,
  mockEvents.executionAssigned,
  mockEvents.executionStarted,
  mockEvents.cellOutputsCleared,
  mockEvents.cellOutputAdded,
  mockEvents.executionCompleted,
];

// Mock Pyodide execution results
export const mockPyodideOutputs = {
  success: [
    {
      type: "stdout",
      data: "Hello, World!\n",
    },
  ],
  withResult: [
    {
      type: "stdout",
      data: "Processing...\n",
    },
    {
      type: "result",
      data: "42",
    },
  ],
  withError: [
    {
      type: "error",
      data: "NameError: name 'undefined_variable' is not defined",
    },
  ],
  empty: [],
};

// Environment configurations for testing
export const testEnvironments = {
  minimal: {
    NOTEBOOK_ID: "test-notebook",
    KERNEL_ID: "test-kernel",
    LIVESTORE_SYNC_URL: "ws://localhost:8787",
    AUTH_TOKEN: "test-token",
  },
  withSession: {
    NOTEBOOK_ID: "test-notebook",
    KERNEL_ID: "test-kernel",
    SESSION_ID: "test-session",
    LIVESTORE_SYNC_URL: "ws://localhost:8787",
    AUTH_TOKEN: "test-token",
  },
};

// Helper functions for creating test data
export const createMockCell = (
  overrides: Partial<typeof mockCellData> = {}
) => ({
  ...mockCellData,
  ...overrides,
  id:
    overrides.id ||
    `test-cell-${Date.now()}-${Math.random().toString(36).slice(2)}`,
});

export const createMockKernelSession = (
  overrides: Partial<typeof mockKernelSession> = {}
) => ({
  ...mockKernelSession,
  ...overrides,
  sessionId:
    overrides.sessionId ||
    `test-session-${Date.now()}-${Math.random().toString(36).slice(2)}`,
});

export const createMockExecutionQueueEntry = (
  overrides: Partial<typeof mockExecutionQueueEntry> = {}
) => ({
  ...mockExecutionQueueEntry,
  ...overrides,
  id:
    overrides.id ||
    `test-queue-${Date.now()}-${Math.random().toString(36).slice(2)}`,
});

// Test scenarios for comprehensive testing
export const testScenarios = {
  happyPath: {
    description: "Normal execution flow with successful completion",
    cell: createMockCell({ source: pythonCodeSamples.simple }),
    expectedOutputs: mockPyodideOutputs.success,
    expectedStatus: "success" as const,
  },
  errorPath: {
    description: "Execution with Python error",
    cell: createMockCell({ source: pythonCodeSamples.withError }),
    expectedOutputs: mockPyodideOutputs.withError,
    expectedStatus: "error" as const,
  },
  emptyCell: {
    description: "Empty cell execution",
    cell: createMockCell({ source: "" }),
    expectedOutputs: mockPyodideOutputs.empty,
    expectedStatus: "success" as const,
  },
  longRunning: {
    description: "Long-running execution",
    cell: createMockCell({ source: pythonCodeSamples.longRunning }),
    expectedOutputs: [
      { type: "stdout", data: "Step 1\n" },
      { type: "stdout", data: "Step 2\n" },
      { type: "stdout", data: "Step 3\n" },
      { type: "stdout", data: "Done!\n" },
    ],
    expectedStatus: "success" as const,
  },
};
