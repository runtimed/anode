// Test fixtures and mock data for Anode tests

export const mockNotebookData = {
  id: 'test-notebook-123',
  title: 'Test Notebook',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z')
}

export const mockCellData = {
  id: 'test-cell-456',
  notebookId: 'test-notebook-123',
  source: 'print("Hello, World!")',
  cellType: 'code' as const,
  position: 0,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z')
}

export const mockKernelSession = {
  sessionId: 'test-session-789',
  kernelId: 'test-kernel-101',
  kernelType: 'python3' as const,
  startedAt: new Date('2024-01-01T00:00:00Z'),
  isActive: true,
  status: 'ready' as const,
  lastHeartbeat: new Date('2024-01-01T00:00:00Z'),
  capabilities: {
    canExecuteCode: true,
    canExecuteSql: false,
    canExecuteAi: false
  }
}

export const mockExecutionQueueEntry = {
  id: 'test-queue-202',
  cellId: 'test-cell-456',
  status: 'pending' as const,
  priority: 1,
  requestedAt: new Date('2024-01-01T00:00:00Z'),
  assignedKernelSession: null,
  assignedAt: null,
  startedAt: null,
  completedAt: null,
  error: null
}

export const mockCellOutput = {
  id: 'test-output-303',
  cellId: 'test-cell-456',
  outputType: 'stdout' as const,
  data: 'Hello, World!\n',
  position: 0,
  createdAt: new Date('2024-01-01T00:00:00Z')
}

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
`
}

// LiveStore event fixtures
export const mockEvents = {
  notebookCreated: {
    name: 'v1.NotebookCreated',
    args: {
      id: mockNotebookData.id,
      title: mockNotebookData.title,
      createdAt: mockNotebookData.createdAt
    }
  },
  cellCreated: {
    name: 'v1.CellCreated',
    args: {
      id: mockCellData.id,
      notebookId: mockCellData.notebookId,
      source: mockCellData.source,
      cellType: mockCellData.cellType,
      position: mockCellData.position,
      createdAt: mockCellData.createdAt
    }
  },
  executionRequested: {
    name: 'v1.ExecutionRequested',
    args: {
      cellId: mockCellData.id,
      queueId: mockExecutionQueueEntry.id,
      requestedAt: mockExecutionQueueEntry.requestedAt,
      priority: mockExecutionQueueEntry.priority
    }
  },
  executionAssigned: {
    name: 'v1.ExecutionAssigned',
    args: {
      queueId: mockExecutionQueueEntry.id,
      kernelSessionId: mockKernelSession.sessionId,
      assignedAt: new Date('2024-01-01T00:01:00Z')
    }
  },
  executionStarted: {
    name: 'v1.ExecutionStarted',
    args: {
      queueId: mockExecutionQueueEntry.id,
      kernelSessionId: mockKernelSession.sessionId,
      startedAt: new Date('2024-01-01T00:01:30Z')
    }
  },
  executionCompleted: {
    name: 'v1.ExecutionCompleted',
    args: {
      queueId: mockExecutionQueueEntry.id,
      status: 'success' as const,
      completedAt: new Date('2024-01-01T00:02:00Z'),
      error: null
    }
  },
  kernelSessionStarted: {
    name: 'v1.KernelSessionStarted',
    args: mockKernelSession
  },
  kernelSessionHeartbeat: {
    name: 'v1.KernelSessionHeartbeat',
    args: {
      sessionId: mockKernelSession.sessionId,
      heartbeatAt: new Date('2024-01-01T00:05:00Z'),
      status: 'ready' as const
    }
  },
  kernelSessionTerminated: {
    name: 'v1.KernelSessionTerminated',
    args: {
      sessionId: mockKernelSession.sessionId,
      reason: 'shutdown',
      terminatedAt: new Date('2024-01-01T01:00:00Z')
    }
  },
  cellOutputAdded: {
    name: 'v1.CellOutputAdded',
    args: mockCellOutput
  },
  cellOutputsCleared: {
    name: 'v1.CellOutputsCleared',
    args: {
      cellId: mockCellData.id,
      clearedBy: 'test-kernel'
    }
  }
}

// Expected execution flow for testing
export const mockExecutionFlow = [
  mockEvents.executionRequested,
  mockEvents.executionAssigned,
  mockEvents.executionStarted,
  mockEvents.cellOutputsCleared,
  mockEvents.cellOutputAdded,
  mockEvents.executionCompleted
]

// Mock Pyodide execution results
export const mockPyodideOutputs = {
  success: [
    {
      type: 'stdout',
      data: 'Hello, World!\n'
    }
  ],
  withResult: [
    {
      type: 'stdout',
      data: 'Processing...\n'
    },
    {
      type: 'result',
      data: '42'
    }
  ],
  withError: [
    {
      type: 'error',
      data: 'NameError: name \'undefined_variable\' is not defined'
    }
  ],
  empty: []
}

// Environment configurations for testing
export const testEnvironments = {
  minimal: {
    NOTEBOOK_ID: 'test-notebook',
    KERNEL_ID: 'test-kernel',
    LIVESTORE_SYNC_URL: 'ws://localhost:8787',
    AUTH_TOKEN: 'test-token'
  },
  withSession: {
    NOTEBOOK_ID: 'test-notebook',
    KERNEL_ID: 'test-kernel',
    SESSION_ID: 'test-session',
    LIVESTORE_SYNC_URL: 'ws://localhost:8787',
    AUTH_TOKEN: 'test-token'
  }
}

// Helper functions for creating test data
export const createMockCell = (overrides: Partial<typeof mockCellData> = {}) => ({
  ...mockCellData,
  ...overrides,
  id: overrides.id || `test-cell-${Date.now()}-${Math.random().toString(36).slice(2)}`
})

export const createMockKernelSession = (overrides: Partial<typeof mockKernelSession> = {}) => ({
  ...mockKernelSession,
  ...overrides,
  sessionId: overrides.sessionId || `test-session-${Date.now()}-${Math.random().toString(36).slice(2)}`
})

export const createMockExecutionQueueEntry = (overrides: Partial<typeof mockExecutionQueueEntry> = {}) => ({
  ...mockExecutionQueueEntry,
  ...overrides,
  id: overrides.id || `test-queue-${Date.now()}-${Math.random().toString(36).slice(2)}`
})

// Test scenarios for comprehensive testing
export const testScenarios = {
  happyPath: {
    description: 'Normal execution flow with successful completion',
    cell: createMockCell({ source: pythonCodeSamples.simple }),
    expectedOutputs: mockPyodideOutputs.success,
    expectedStatus: 'success' as const
  },
  errorPath: {
    description: 'Execution with Python error',
    cell: createMockCell({ source: pythonCodeSamples.withError }),
    expectedOutputs: mockPyodideOutputs.withError,
    expectedStatus: 'error' as const
  },
  emptyCell: {
    description: 'Empty cell execution',
    cell: createMockCell({ source: '' }),
    expectedOutputs: mockPyodideOutputs.empty,
    expectedStatus: 'success' as const
  },
  longRunning: {
    description: 'Long-running execution',
    cell: createMockCell({ source: pythonCodeSamples.longRunning }),
    expectedOutputs: [
      { type: 'stdout', data: 'Step 1\n' },
      { type: 'stdout', data: 'Step 2\n' },
      { type: 'stdout', data: 'Step 3\n' },
      { type: 'stdout', data: 'Done!\n' }
    ],
    expectedStatus: 'success' as const
  }
}
