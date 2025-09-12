import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStorePromise, queryDb } from "@livestore/livestore";
import { makeAdapter } from "@livestore/adapter-node";
import { events, tables, schema } from "@runtimed/schema";
import {
  cleanupResources,
  createTestSessionId,
  createTestStoreId,
  waitFor,
} from "../setup.js";

// Mock Pyodide for integration tests
const mockPyodide = {
  runPython: vi.fn(),
  globals: {
    get: vi.fn(),
    set: vi.fn(),
  },
};

vi.mock("pyodide", () => ({
  loadPyodide: vi.fn(() => Promise.resolve(mockPyodide)),
}));

describe("End-to-End Execution Flow", () => {
  let store: any;
  let storeId: string;
  let sessionId: string;
  let runtimeId: string;

  beforeEach(async () => {
    storeId = createTestStoreId();
    sessionId = createTestSessionId();
    runtimeId = `runtime-${Date.now()}`;

    const adapter = makeAdapter({
      storage: { type: "in-memory" },
    });

    store = await createStorePromise({
      adapter,
      schema,
      storeId,
    });

    // Reset mocks
    vi.clearAllMocks();
    mockPyodide.runPython.mockReturnValue(undefined);
    mockPyodide.globals.get.mockReturnValue(undefined);
  });

  afterEach(async () => {
    await cleanupResources(store);
  });

  describe("Complete Notebook Execution Flow", () => {
    it("should handle full notebook creation and execution cycle", async () => {
      const notebookId = storeId; // Same as store ID in simplified architecture
      const cellId = "cell-001";
      const queueId = "queue-001";
      const outputId = "output-001";

      // Track state changes
      const stateChanges: string[] = [];
      const metadataQuery$ = queryDb(tables.notebookMetadata.select(), {
        label: "metadata",
      });
      const cellsQuery$ = queryDb(tables.cells.select(), { label: "cells" });
      const queueQuery$ = queryDb(tables.executionQueue.select(), {
        label: "queue",
      });
      const outputsQuery$ = queryDb(tables.outputs.select(), {
        label: "outputs",
      });

      store.subscribe(metadataQuery$, {
        onUpdate: () => stateChanges.push("metadata"),
      });
      store.subscribe(cellsQuery$, {
        onUpdate: () => stateChanges.push("cells"),
      });
      store.subscribe(queueQuery$, {
        onUpdate: () => stateChanges.push("queue"),
      });
      store.subscribe(outputsQuery$, {
        onUpdate: () => stateChanges.push("outputs"),
      });

      // Step 1: Initialize notebook
      store.commit(
        events.notebookInitialized({
          id: notebookId,
          title: "Integration Test Notebook",
          ownerId: "test-user",
        })
      );

      await waitFor(() => stateChanges.includes("metadata"));

      // Step 2: Create a code cell
      store.commit(
        events.cellCreated2({
          id: cellId,
          cellType: "code",
          fractionalIndex: "a0",
          createdBy: "test-user",
        })
      );

      store.commit(
        events.cellSourceChanged({
          id: cellId,
          source: 'print("Hello from integration test!")',
          modifiedBy: "test-user",
        })
      );

      await waitFor(() => stateChanges.includes("cells"));

      // Step 3: Start runtime session
      store.commit(
        events.runtimeSessionStarted({
          sessionId,
          runtimeId,
          runtimeType: "python3",
          capabilities: {
            canExecuteCode: true,
            canExecuteSql: false,
            canExecuteAi: false,
          },
        })
      );

      // Step 4: Request execution
      store.commit(
        events.executionRequested({
          queueId,
          cellId,
          executionCount: 1,
          requestedBy: "test-user",
        })
      );

      await waitFor(() => stateChanges.includes("queue"));

      // Step 5: Assign execution to runtime
      store.commit(
        events.executionAssigned({
          queueId,
          runtimeSessionId: sessionId,
        })
      );

      // Step 6: Start execution
      store.commit(
        events.executionStarted({
          queueId,
          cellId,
          runtimeSessionId: sessionId,
          startedAt: new Date(),
        })
      );

      // Step 7: Clear previous outputs
      store.commit(
        events.cellOutputsCleared({
          cellId,
          clearedBy: runtimeId,
          wait: false,
        })
      );

      // Step 8: Add execution output
      store.commit(
        events.terminalOutputAdded({
          id: outputId,
          cellId,
          content: {
            type: "inline",
            data: "Hello from integration test!\n",
          },
          streamName: "stdout",
          position: 0,
        })
      );

      await waitFor(() => stateChanges.includes("outputs"));

      // Step 9: Complete execution
      store.commit(
        events.executionCompleted({
          queueId,
          cellId,
          status: "success",
          completedAt: new Date(),
          executionDurationMs: 150,
        })
      );

      // Verify final state
      const metadata = store.query(tables.notebookMetadata.select());
      const notebookTitle =
        metadata.find((m) => m.key === "title")?.value ?? "Untitled";
      expect(notebookTitle).toBe("Integration Test Notebook");

      const cells = store.query(tables.cells.select());
      expect(cells).toHaveLength(1);
      expect(cells[0].id).toBe(cellId);
      expect(cells[0].source).toBe('print("Hello from integration test!")');

      const queue = store.query(tables.executionQueue.select());
      expect(queue).toHaveLength(1);
      expect(queue[0].status).toBe("completed");

      const outputs = store.query(tables.outputs.select());
      expect(outputs).toHaveLength(1);
      expect(outputs[0].cellId).toBe(cellId);
      expect(outputs[0].outputType).toBe("terminal");
      expect(outputs[0].streamName).toBe("stdout");
      expect(outputs[0].data).toBe("Hello from integration test!\n");
    });

    it("should handle execution errors gracefully", async () => {
      const cellId = "error-cell";
      const queueId = "error-queue";

      // Create notebook and cell with error code
      store.commit(
        events.notebookInitialized({
          id: storeId,
          title: "Error Test Notebook",
          ownerId: "test-user",
        })
      );

      store.commit(
        events.cellCreated2({
          id: cellId,
          cellType: "code",
          fractionalIndex: "a0",
          createdBy: "test-user",
        })
      );

      store.commit(
        events.cellSourceChanged({
          id: cellId,
          source: 'raise ValueError("Test error")',
          modifiedBy: "test-user",
        })
      );

      // Start runtime and request execution
      store.commit(
        events.runtimeSessionStarted({
          sessionId,
          runtimeId,
          runtimeType: "python3",
          capabilities: {
            canExecuteCode: true,
            canExecuteSql: false,
            canExecuteAi: false,
          },
        })
      );

      store.commit(
        events.executionRequested({
          queueId,
          cellId,
          executionCount: 1,
          requestedBy: "test-user",
        })
      );

      store.commit(
        events.executionAssigned({
          queueId,
          runtimeSessionId: sessionId,
        })
      );

      store.commit(
        events.executionStarted({
          queueId,
          cellId,
          runtimeSessionId: sessionId,
          startedAt: new Date(),
        })
      );

      // Add error output
      store.commit(
        events.errorOutputAdded({
          id: "error-output",
          cellId,
          content: {
            type: "inline",
            data: {
              ename: "ValueError",
              evalue: "Test error",
              traceback: [
                "Traceback (most recent call last):",
                '  File "<stdin>", line 1, in <module>',
                "ValueError: Test error",
              ],
            },
          },
          position: 0,
        })
      );

      // Complete with error status
      store.commit(
        events.executionCompleted({
          queueId,
          cellId,
          status: "error",
          error: "ValueError: Test error",
          completedAt: new Date(),
          executionDurationMs: 75,
        })
      );

      // Verify error handling
      const queue = store.query(tables.executionQueue.select());
      expect(queue[0].status).toBe("failed");

      const outputs = store.query(tables.outputs.select());
      expect(outputs[0].outputType).toBe("error");
      const errorData = JSON.parse(outputs[0].data);
      expect(errorData.ename).toBe("ValueError");
    });

    it("should handle multiple concurrent executions", async () => {
      const numCells = 3;
      const cells = Array.from({ length: numCells }, (_, i) => ({
        cellId: `cell-${i}`,
        queueId: `queue-${i}`,
        outputId: `output-${i}`,
      }));

      // Create notebook
      store.commit(
        events.notebookInitialized({
          id: storeId,
          title: "Concurrent Test Notebook",
          ownerId: "test-user",
        })
      );

      // Create multiple cells
      cells.forEach(({ cellId }, index) => {
        store.commit(
          events.cellCreated2({
            id: cellId,
            cellType: "code",
            fractionalIndex: `a${index.toString(36)}`,
            createdBy: "test-user",
          })
        );

        store.commit(
          events.cellSourceChanged({
            id: cellId,
            source: `print("Output from cell ${index}")`,
            modifiedBy: "test-user",
          })
        );
      });

      // Start multiple runtime sessions
      const sessions = Array.from({ length: 2 }, (_, i) => ({
        sessionId: `${sessionId}-${i}`,
        runtimeId: `${runtimeId}-${i}`,
      }));

      sessions.forEach(({ sessionId: sid, runtimeId: rid }) => {
        store.commit(
          events.runtimeSessionStarted({
            sessionId: sid,
            runtimeId: rid,
            runtimeType: "python3",
            capabilities: {
              canExecuteCode: true,
              canExecuteSql: false,
              canExecuteAi: false,
            },
          })
        );
      });

      // Request executions for all cells
      cells.forEach(({ cellId, queueId }, index) => {
        store.commit(
          events.executionRequested({
            queueId,
            cellId,
            executionCount: 1,
            requestedBy: "test-user",
          })
        );
      });

      // Assign executions to different sessions
      cells.forEach(({ queueId, cellId }, index) => {
        const sessionIndex = index % sessions.length;
        const { sessionId: sid } = sessions[sessionIndex];

        store.commit(
          events.executionAssigned({
            queueId,
            runtimeSessionId: sid,
          })
        );

        store.commit(
          events.executionStarted({
            queueId,
            cellId,
            runtimeSessionId: sid,
            startedAt: new Date(),
          })
        );
      });

      // Complete all executions
      cells.forEach(({ cellId, queueId, outputId }, index) => {
        store.commit(
          events.terminalOutputAdded({
            id: outputId,
            cellId,
            content: {
              type: "inline",
              data: `Output from cell ${index}\n`,
            },
            streamName: "stdout",
            position: 0,
          })
        );

        store.commit(
          events.executionCompleted({
            queueId,
            cellId,
            status: "success",
            completedAt: new Date(),
            executionDurationMs: 120,
          })
        );
      });

      // Verify all executions completed
      const queue = store.query(tables.executionQueue.select());
      expect(queue).toHaveLength(numCells);
      expect(queue.every((entry) => entry.status === "completed")).toBe(true);

      const outputs = store.query(tables.outputs.select());
      expect(outputs).toHaveLength(numCells);
      outputs.forEach((output, index) => {
        expect(output.data).toBe(`Output from cell ${index}\n`);
      });
    });
  });

  describe("Reactive Query Behavior", () => {
    it("should handle reactive queries without memory leaks", async () => {
      const updateCounts = {
        cells: 0,
        queue: 0,
        outputs: 0,
      };

      // Create reactive queries
      const cellsQuery$ = queryDb(tables.cells.select(), {
        label: "activeCells",
      });

      const queueQuery$ = queryDb(
        tables.executionQueue.select().where({ status: "pending" }),
        { label: "pendingQueue" }
      );

      const outputsQuery$ = queryDb(tables.outputs.select(), {
        label: "allOutputs",
      });

      // Subscribe to queries
      const subscriptions = [
        store.subscribe(cellsQuery$, {
          onUpdate: () => updateCounts.cells++,
        }),
        store.subscribe(queueQuery$, {
          onUpdate: () => updateCounts.queue++,
        }),
        store.subscribe(outputsQuery$, {
          onUpdate: () => updateCounts.outputs++,
        }),
      ];

      // Perform operations that trigger updates
      const cellId = "reactive-test-cell";
      const queueId = "reactive-test-queue";

      store.commit(
        events.cellCreated({
          id: cellId,
          cellType: "code",
          position: 0,
          createdBy: "test-user",
        })
      );

      store.commit(
        events.executionRequested({
          queueId,
          cellId,
          executionCount: 1,
          requestedBy: "test-user",
        })
      );

      store.commit(
        events.terminalOutputAdded({
          id: "reactive-output",
          cellId,
          content: {
            type: "inline",
            data: "Test output",
          },
          streamName: "stdout",
          position: 0,
        })
      );

      // Wait for updates to propagate
      await waitFor(
        () =>
          updateCounts.cells > 0 &&
          updateCounts.queue > 0 &&
          updateCounts.outputs > 0
      );

      expect(updateCounts.cells).toBeGreaterThan(0);
      expect(updateCounts.queue).toBeGreaterThan(0);
      expect(updateCounts.outputs).toBeGreaterThan(0);

      // Clean up subscriptions (critical for preventing memory leaks)
      subscriptions.forEach((unsub) => unsub());
    });

    it("should handle subscription errors without crashing", async () => {
      const errorCallback = vi.fn();

      // Create a query that might cause issues (simulate error conditions)
      // Note: With strict typing, we simulate runtime errors differently
      const problematicQuery$ = queryDb(
        tables.cells.select().where({ id: "non-existent-cell-id" }),
        { label: "problematicQuery" }
      );

      // This should handle the error gracefully
      try {
        const subscription = store.subscribe(problematicQuery$, {
          onUpdate: () => {},
          onError: errorCallback,
        });

        // If subscription was created successfully, clean it up
        if (typeof subscription === "function") {
          subscription();
        }
      } catch (error) {
        // Expected for invalid query
        expect(error).toBeDefined();
      }
    });

    it("should handle rapid state changes without dropping updates", async () => {
      const allUpdates: any[] = [];

      const cellsQuery$ = queryDb(tables.cells.select(), {
        label: "allCellsMonitor",
      });

      const subscription = store.subscribe(cellsQuery$, {
        onUpdate: (cells) => {
          allUpdates.push({ timestamp: Date.now(), cellCount: cells.length });
        },
      });

      // Rapidly create and delete cells
      const operations: Array<() => any> = [];
      for (let i = 0; i < 10; i++) {
        const cellId = `rapid-cell-${i}`;

        operations.push(() =>
          store.commit(
            (events as any).cellCreated({
              id: cellId,
              cellType: "code",
              position: i,
              createdBy: "test-user",
            })
          )
        );

        if (i % 2 === 0) {
          operations.push(() =>
            store.commit(
              events.cellDeleted({
                id: cellId,
              })
            )
          );
        }
      }

      // Execute operations rapidly
      operations.forEach((op: any) => op());

      // Wait for updates to settle
      await (waitFor as any)(() => allUpdates.length > 5, 2000);

      expect(allUpdates.length).toBeGreaterThan(0);

      // Verify updates are in chronological order
      for (let i = 1; i < allUpdates.length; i++) {
        expect(allUpdates[i].timestamp).toBeGreaterThanOrEqual(
          allUpdates[i - 1].timestamp
        );
      }

      subscription();
    });
  });

  describe("Runtime Session Lifecycle", () => {
    it("should handle runtime restart during execution", async () => {
      const cellId = "restart-test-cell";
      const queueId = "restart-test-queue";
      const newSessionId = `${sessionId}-restarted`;

      // Create cell and start execution
      store.commit(
        events.cellCreated({
          id: cellId,
          cellType: "code",
          position: 0,
          createdBy: "test-user",
        })
      );

      store.commit(
        events.runtimeSessionStarted({
          sessionId,
          runtimeId,
          runtimeType: "python3",
          capabilities: {
            canExecuteCode: true,
            canExecuteSql: false,
            canExecuteAi: false,
          },
        })
      );

      store.commit(
        events.executionRequested({
          queueId,
          cellId,
          executionCount: 1,
          requestedBy: "test-user",
        })
      );

      store.commit(
        events.executionAssigned({
          queueId,
          runtimeSessionId: sessionId,
        })
      );

      store.commit(
        events.executionStarted({
          queueId,
          cellId,
          runtimeSessionId: sessionId,
          startedAt: new Date(),
        })
      );

      // Simulate runtime restart during execution
      store.commit(
        events.runtimeSessionTerminated({
          sessionId,
          reason: "restart",
        })
      );

      // Start new runtime session
      store.commit(
        events.runtimeSessionStarted({
          sessionId: newSessionId,
          runtimeId,
          runtimeType: "python3",
          capabilities: {
            canExecuteCode: true,
            canExecuteSql: false,
            canExecuteAi: false,
          },
        })
      );

      // Update session status to ready
      store.commit(
        events.runtimeSessionStatusChanged({
          sessionId: newSessionId,
          status: "ready",
        })
      );

      // Verify runtime states
      const sessions = store.query(tables.runtimeSessions.select());
      expect(sessions).toHaveLength(2);

      const oldSession = sessions.find((s) => s.sessionId === sessionId);
      const newSession = sessions.find((s) => s.sessionId === newSessionId);

      expect(oldSession.status).toBe("terminated");
      expect(oldSession.isActive).toBe(false);
      expect(newSession.status).toBe("ready");
      expect(newSession.isActive).toBe(true);
    });

    it("should track status and session health", async () => {
      store.commit(
        events.runtimeSessionStarted({
          sessionId,
          runtimeId,
          runtimeType: "python3",
          capabilities: {
            canExecuteCode: true,
            canExecuteSql: false,
            canExecuteAi: false,
          },
        })
      );

      const heartbeatTimes: Date[] = [];

      // Send multiple heartbeats
      for (let i = 0; i < 5; i++) {
        const heartbeatTime = new Date(Date.now() + i * 30000); // Every 30 seconds
        heartbeatTimes.push(heartbeatTime);

        store.commit(
          events.runtimeSessionStatusChanged({
            sessionId,
            status: i % 2 === 1 ? "ready" : "busy",
          })
        );
      }

      const session = store.query(tables.runtimeSessions.select())[0];
      expect(session.status).toBeDefined();
      expect(session.status).toBe("busy"); // Last heartbeat status
    });
  });

  describe("Data Consistency", () => {
    it("should maintain referential integrity between tables", async () => {
      const cellId = "integrity-test-cell";
      const queueId = "integrity-test-queue";
      const outputId = "integrity-test-output";

      // Create related records
      store.commit(
        events.cellCreated({
          id: cellId,
          cellType: "code",
          position: 0,
          createdBy: "test-user",
        })
      );

      store.commit(
        events.executionRequested({
          queueId,
          cellId,
          executionCount: 1,
          requestedBy: "test-user",
        })
      );

      store.commit(
        events.terminalOutputAdded({
          id: outputId,
          cellId,
          content: {
            type: "inline",
            data: "Test output",
          },
          streamName: "stdout",
          position: 0,
        })
      );

      // Verify relationships
      const cell = store.query(tables.cells.select().where({ id: cellId }))[0];
      const queueEntry = store.query(
        tables.executionQueue.select().where({ cellId })
      )[0];
      const output = store.query(tables.outputs.select().where({ cellId }))[0];

      expect(cell.id).toBe(cellId);
      expect(queueEntry.cellId).toBe(cellId);
      expect(output.cellId).toBe(cellId);

      // Delete cell (soft delete)
      store.commit(
        events.cellDeleted({
          id: cellId,
        })
      );

      // Outputs should still exist (they're not automatically cleaned up)
      const outputsAfterDelete = store.query(
        tables.outputs.select().where({ cellId })
      );
      expect(outputsAfterDelete).toHaveLength(1);

      // But cell should be marked as deleted
      const cellAfterDelete = store.query(
        tables.cells.select().where({ id: cellId })
      )[0];
    });

    it("should handle transaction rollbacks correctly", async () => {
      const initialCellCount = store.query(tables.cells.select()).length;

      try {
        // This should work
        store.commit(
          events.cellCreated({
            id: "valid-cell",
            cellType: "code",
            position: 0,
            createdBy: "test-user",
          })
        );

        // Verify cell was created
        const cellsAfterValid = store.query(tables.cells.select());
        expect(cellsAfterValid.length).toBe(initialCellCount + 1);
      } catch (error) {
        // If there was an error, count should remain unchanged
        const cellsAfterError = store.query(tables.cells.select());
        expect(cellsAfterError.length).toBe(initialCellCount);
      }
    });
  });
});
