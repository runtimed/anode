import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanupResources,
  createTestSessionId,
  createTestStoreId,
} from "./setup.js";
import { makeAdapter } from "@livestore/adapter-node";
import { createStorePromise } from "@livestore/livestore";
import { events, schema, tables } from "@runt/schema";

console.log("🧪 Starting Anode edge case test suite...");

describe("Edge Cases and Stress Tests", () => {
  let store: any;
  let storeId: string;
  let sessionId: string;

  beforeEach(async () => {
    storeId = createTestStoreId();
    sessionId = createTestSessionId();

    const adapter = makeAdapter({
      storage: { type: "in-memory" },
    });

    store = await createStorePromise({
      adapter,
      schema,
      storeId,
    });
  });

  afterEach(async () => {
    await cleanupResources(store);
  });

  describe("Concurrent Event Stress Tests", () => {
    it("should handle rapid cell creation and deletion without state corruption", async () => {
      const cellCount = 50;
      const cells: string[] = [];

      // Create many cells rapidly
      for (let i = 0; i < cellCount; i++) {
        const cellId = `stress-cell-${i}`;
        cells.push(cellId);

        store.commit(
          events.cellCreated({
            id: cellId,
            cellType: "code",
            position: i,
            createdBy: "stress-test",
          }),
        );
      }

      // Verify all cells exist
      let storedCells = store.query(tables.cells.select());
      expect(storedCells).toHaveLength(cellCount);

      // Delete every other cell
      for (let i = 0; i < cellCount; i += 2) {
        store.commit(
          events.cellDeleted({
            id: cells[i],
          }),
        );
      }

      // Verify correct number remain
      storedCells = store.query(tables.cells.select());
      expect(storedCells).toHaveLength(Math.ceil(cellCount / 2));

      // Verify remaining cells have correct IDs
      const remainingIds = storedCells.map((c: any) => c.id).sort();
      const expectedIds = cells.filter((_, i) => i % 2 === 1).sort();
      expect(remainingIds).toEqual(expectedIds);
    });

    it("should handle concurrent executions without queue corruption", async () => {
      const executionCount = 20;
      const cellIds: string[] = [];
      const queueIds: string[] = [];

      // Create cells
      for (let i = 0; i < executionCount; i++) {
        const cellId = `concurrent-cell-${i}`;
        const queueId = `concurrent-queue-${i}`;
        cellIds.push(cellId);
        queueIds.push(queueId);

        store.commit(
          events.cellCreated({
            id: cellId,
            cellType: "code",
            position: i,
            createdBy: "stress-test",
          }),
        );
      }

      // Request all executions simultaneously
      for (let i = 0; i < executionCount; i++) {
        store.commit(
          events.executionRequested({
            queueId: queueIds[i],
            cellId: cellIds[i],
            executionCount: 1,
            requestedBy: "stress-test",
            priority: Math.floor(Math.random() * 100), // Random integer priorities
          }),
        );
      }

      // Start a kernel session
      store.commit(
        events.kernelSessionStarted({
          sessionId,
          kernelId: "stress-kernel",
          kernelType: "python3",
          capabilities: {
            canExecuteCode: true,
            canExecuteSql: false,
            canExecuteAi: false,
          },
        }),
      );

      // Assign and complete all executions
      for (let i = 0; i < executionCount; i++) {
        store.commit(
          events.executionAssigned({
            queueId: queueIds[i],
            kernelSessionId: sessionId,
          }),
        );

        store.commit(
          events.executionStarted({
            queueId: queueIds[i],
            cellId: cellIds[i],
            kernelSessionId: sessionId,
            startedAt: new Date(),
          }),
        );

        store.commit(
          events.executionCompleted({
            queueId: queueIds[i],
            cellId: cellIds[i],
            status: "success",
            completedAt: new Date(),
            executionDurationMs: 100,
          }),
        );
      }

      // Verify all executions completed
      const queueEntries = store.query(tables.executionQueue.select());
      expect(queueEntries).toHaveLength(executionCount);
      expect(
        queueEntries.every((entry: any) => entry.status === "completed"),
      ).toBe(true);

      // Verify all cells have correct execution state
      const cells = store.query(tables.cells.select());
      expect(
        cells.every((cell: any) => cell.executionState === "completed"),
      ).toBe(true);
    });
  });

  describe("Data Integrity Edge Cases", () => {
    it("should handle cell moves to extreme positions", async () => {
      const cellId = "position-test-cell";

      store.commit(
        events.cellCreated({
          id: cellId,
          cellType: "code",
          position: 0,
          createdBy: "test-user",
        }),
      );

      // Test moving to very large position
      store.commit(
        events.cellMoved({
          id: cellId,
          newPosition: Number.MAX_SAFE_INTEGER,
        }),
      );

      let cell = store.query(tables.cells.select().where({ id: cellId }))[0];
      expect(cell.position).toBe(Number.MAX_SAFE_INTEGER);

      // Test moving to negative position
      store.commit(
        events.cellMoved({
          id: cellId,
          newPosition: -1000,
        }),
      );

      cell = store.query(tables.cells.select().where({ id: cellId }))[0];
      expect(cell.position).toBe(-1000);

      // Test moving to zero
      store.commit(
        events.cellMoved({
          id: cellId,
          newPosition: 0,
        }),
      );

      cell = store.query(tables.cells.select().where({ id: cellId }))[0];
      expect(cell.position).toBe(0);
    });

    it("should handle very large output data", async () => {
      const cellId = "large-output-cell";
      const outputId = "large-output";

      store.commit(
        events.cellCreated({
          id: cellId,
          cellType: "code",
          position: 0,
          createdBy: "test-user",
        }),
      );

      // Create a very large output (1MB of data)
      const largeData = {
        text: "A".repeat(1024 * 1024), // 1MB string
        metadata: {
          size: 1024 * 1024,
          type: "stress-test",
        },
      };

      store.commit(
        events.cellOutputAdded({
          id: outputId,
          cellId,
          outputType: "display_data",
          data: largeData,
          position: 0,
        }),
      );

      const outputs = store.query(tables.outputs.select().where({ cellId }));
      expect(outputs).toHaveLength(1);
      expect(outputs[0].data.text).toHaveLength(1024 * 1024);
      expect(outputs[0].data.metadata.size).toBe(1024 * 1024);
    });

    it("should handle unicode and special characters in all text fields", async () => {
      const specialStrings = [
        "🚀 Rocket emoji",
        "Hello 世界", // Chinese characters
        "Здравствуй мир", // Cyrillic
        "مرحبا بالعالم", // Arabic
        "🎨💻🔬🎯🌟", // Multiple emojis
        "\\n\\t\\r\"'`", // Escape sequences
        "SELECT * FROM users; DROP TABLE users;--", // SQL injection attempt
        "<script>alert('xss')</script>", // XSS attempt
        "Special chars: àáâã", // Accented characters instead of null bytes
        "A".repeat(10000), // Very long string
      ];

      for (let i = 0; i < specialStrings.length; i++) {
        const testString = specialStrings[i];
        const cellId = `unicode-cell-${i}`;

        // Test in cell creation
        store.commit(
          events.cellCreated({
            id: cellId,
            cellType: "code",
            position: i,
            createdBy: testString,
          }),
        );

        // Test in source change
        store.commit(
          events.cellSourceChanged({
            id: cellId,
            source: testString,
            modifiedBy: testString,
          }),
        );

        // Verify data integrity
        const cell = store.query(
          tables.cells.select().where({ id: cellId }),
        )[0];
        expect(cell.createdBy).toBe(testString);
        expect(cell.source).toBe(testString);
      }
    });
  });

  describe("Kernel Session Edge Cases", () => {
    it("should handle rapid kernel session start/stop cycles", async () => {
      const cycleCount = 10;

      for (let i = 0; i < cycleCount; i++) {
        const currentSessionId = `cycle-session-${i}`;

        // Start session
        store.commit(
          events.kernelSessionStarted({
            sessionId: currentSessionId,
            kernelId: `cycle-kernel-${i}`,
            kernelType: "python3",
            capabilities: {
              canExecuteCode: true,
              canExecuteSql: false,
              canExecuteAi: false,
            },
          }),
        );

        // Send heartbeat
        store.commit(
          events.kernelSessionHeartbeat({
            sessionId: currentSessionId,
            status: "ready",
            timestamp: new Date(),
          }),
        );

        // Terminate session
        store.commit(
          events.kernelSessionTerminated({
            sessionId: currentSessionId,
            reason: "restart",
          }),
        );
      }

      const sessions = store.query(tables.kernelSessions.select());
      expect(sessions).toHaveLength(cycleCount);
      expect(sessions.every((s: any) => s.status === "terminated")).toBe(true);
      expect(sessions.every((s: any) => s.isActive === false)).toBe(true);
    });

    it("should handle heartbeat flood without corruption", async () => {
      store.commit(
        events.kernelSessionStarted({
          sessionId,
          kernelId: "heartbeat-kernel",
          kernelType: "python3",
          capabilities: {
            canExecuteCode: true,
            canExecuteSql: false,
            canExecuteAi: false,
          },
        }),
      );

      // Send 100 heartbeats rapidly
      const heartbeatCount = 100;
      let lastTimestamp = new Date();

      for (let i = 0; i < heartbeatCount; i++) {
        lastTimestamp = new Date(lastTimestamp.getTime() + 1000); // 1 second apart
        store.commit(
          events.kernelSessionHeartbeat({
            sessionId,
            status: i % 2 === 0 ? "ready" : "busy",
            timestamp: lastTimestamp,
          }),
        );
      }

      const session = store.query(tables.kernelSessions.select())[0];
      expect(session.lastHeartbeat).toEqual(lastTimestamp);
      expect(session.status).toBe("busy"); // Last heartbeat was busy (odd index)
    });
  });

  describe("Complex Query Edge Cases", () => {
    it("should handle queries with no results gracefully", async () => {
      // Query non-existent cells
      const emptyCells = store.query(
        tables.cells.select().where({ id: "non-existent-cell" }),
      );
      expect(emptyCells).toEqual([]);

      // Query with complex conditions that match nothing
      const emptyQueue = store.query(
        tables.executionQueue
          .select()
          .where({ status: "pending" })
          .where({ priority: { op: ">", value: 1000 } }),
      );
      expect(emptyQueue).toEqual([]);

      // Query with multiple joins that return nothing
      const emptyOutputs = store.query(
        tables.outputs.select().where({ cellId: "non-existent-cell" }),
      );
      expect(emptyOutputs).toEqual([]);
    });

    it("should handle complex aggregation queries", async () => {
      // Create test data
      const cellCount = 20;
      for (let i = 0; i < cellCount; i++) {
        const cellId = `agg-cell-${i}`;
        const queueId = `agg-queue-${i}`;

        store.commit(
          events.cellCreated({
            id: cellId,
            cellType: i % 2 === 0 ? "code" : "markdown",
            position: i,
            createdBy: "test-user",
          }),
        );

        store.commit(
          events.executionRequested({
            queueId,
            cellId,
            executionCount: 1,
            requestedBy: "test-user",
            priority: i + 1,
          }),
        );
      }

      // Test count queries
      const totalCells = store.query(tables.cells.count());
      expect(totalCells).toBe(cellCount);

      const codeCells = store.query(
        tables.cells.count().where({ cellType: "code" }),
      );
      expect(codeCells).toBe(cellCount / 2);

      const markdownCells = store.query(
        tables.cells.count().where({ cellType: "markdown" }),
      );
      expect(markdownCells).toBe(cellCount / 2);

      // Test ordering
      const cellsByPosition = store.query(
        tables.cells.select().orderBy("position", "asc"),
      );
      expect(cellsByPosition).toHaveLength(cellCount);
      expect(cellsByPosition[0].position).toBe(0);
      expect(cellsByPosition[cellCount - 1].position).toBe(cellCount - 1);

      const queueByPriority = store.query(
        tables.executionQueue.select().orderBy("priority", "desc"),
      );
      expect(queueByPriority).toHaveLength(cellCount);
      expect(queueByPriority[0].priority).toBe(cellCount);
      expect(queueByPriority[cellCount - 1].priority).toBe(1);
    });
  });

  describe("Error Recovery Edge Cases", () => {
    it("should handle execution errors at various stages", async () => {
      const cellId = "error-cell";
      const queueId = "error-queue";

      store.commit(
        events.cellCreated({
          id: cellId,
          cellType: "code",
          position: 0,
          createdBy: "test-user",
        }),
      );

      store.commit(
        events.kernelSessionStarted({
          sessionId,
          kernelId: "error-kernel",
          kernelType: "python3",
          capabilities: {
            canExecuteCode: true,
            canExecuteSql: false,
            canExecuteAi: false,
          },
        }),
      );

      // Test error during execution request
      store.commit(
        events.executionRequested({
          queueId,
          cellId,
          executionCount: 1,
          requestedBy: "test-user",
          priority: 1,
        }),
      );

      store.commit(
        events.executionAssigned({
          queueId,
          kernelSessionId: sessionId,
        }),
      );

      store.commit(
        events.executionStarted({
          queueId,
          cellId,
          kernelSessionId: sessionId,
          startedAt: new Date(),
        }),
      );

      // Simulate execution error
      store.commit(
        events.executionCompleted({
          queueId,
          cellId,
          status: "error",
          error:
            "Simulated execution error with special chars: 🚨💥 Error message",
          completedAt: new Date(),
          executionDurationMs: 50,
        }),
      );

      const queueEntry = store.query(tables.executionQueue.select())[0];
      const cell = store.query(tables.cells.select())[0];

      expect(queueEntry.status).toBe("failed");
      expect(cell.executionState).toBe("error");
    });

    it("should handle kernel session termination during execution", async () => {
      const cellId = "termination-cell";
      const queueId = "termination-queue";

      store.commit(
        events.cellCreated({
          id: cellId,
          cellType: "code",
          position: 0,
          createdBy: "test-user",
        }),
      );

      store.commit(
        events.kernelSessionStarted({
          sessionId,
          kernelId: "termination-kernel",
          kernelType: "python3",
          capabilities: {
            canExecuteCode: true,
            canExecuteSql: false,
            canExecuteAi: false,
          },
        }),
      );

      store.commit(
        events.executionRequested({
          queueId,
          cellId,
          executionCount: 1,
          requestedBy: "test-user",
          priority: 1,
        }),
      );

      store.commit(
        events.executionAssigned({
          queueId,
          kernelSessionId: sessionId,
        }),
      );

      store.commit(
        events.executionStarted({
          queueId,
          cellId,
          kernelSessionId: sessionId,
          startedAt: new Date(),
        }),
      );

      // Terminate kernel while execution is running
      store.commit(
        events.kernelSessionTerminated({
          sessionId,
          reason: "error",
        }),
      );

      const session = store.query(tables.kernelSessions.select())[0];
      expect(session.status).toBe("terminated");
      expect(session.isActive).toBe(false);

      // Queue should still be in executing state (real system would handle cleanup)
      const queueEntry = store.query(tables.executionQueue.select())[0];
      expect(queueEntry.status).toBe("executing");
    });
  });

  describe("Memory and Performance Edge Cases", () => {
    it("should handle large numbers of outputs per cell", async () => {
      const cellId = "output-heavy-cell";
      const outputCount = 100;

      store.commit(
        events.cellCreated({
          id: cellId,
          cellType: "code",
          position: 0,
          createdBy: "test-user",
        }),
      );

      // Add many outputs
      for (let i = 0; i < outputCount; i++) {
        store.commit(
          events.cellOutputAdded({
            id: `output-${i}`,
            cellId,
            outputType: i % 4 === 0 ? "error" : "stream",
            data: {
              text: `Output ${i} with data`,
              value: i,
            },
            position: i,
          }),
        );
      }

      const outputs = store.query(tables.outputs.select().where({ cellId }));
      expect(outputs).toHaveLength(outputCount);

      // Clear all outputs
      store.commit(
        events.cellOutputsCleared({
          cellId,
          clearedBy: "test-user",
        }),
      );

      const clearedOutputs = store.query(
        tables.outputs.select().where({ cellId }),
      );
      expect(clearedOutputs).toHaveLength(0);
    });

    it("should handle notebook with maximum reasonable cell count", async () => {
      const maxCells = 1000; // Reasonable upper limit for a notebook

      store.commit(
        events.notebookInitialized({
          id: storeId,
          title: "Large Notebook Test",
          ownerId: "test-user",
        }),
      );

      // Create maximum cells
      for (let i = 0; i < maxCells; i++) {
        store.commit(
          events.cellCreated({
            id: `max-cell-${i}`,
            cellType: i % 3 === 0 ? "code" : i % 3 === 1 ? "markdown" : "raw",
            position: i,
            createdBy: "test-user",
          }),
        );

        // Add some content to every 10th cell
        if (i % 10 === 0) {
          store.commit(
            events.cellSourceChanged({
              id: `max-cell-${i}`,
              source: `# Cell ${i}\nprint("Hello from cell ${i}")`,
              modifiedBy: "test-user",
            }),
          );
        }
      }

      const notebook = store.query(tables.notebook.select())[0];
      const cells = store.query(tables.cells.select());

      expect(notebook.title).toBe("Large Notebook Test");
      expect(cells).toHaveLength(maxCells);

      // Test querying specific ranges
      const firstHundred = store.query(
        tables.cells
          .select()
          .where({ position: { op: "<", value: 100 } })
          .orderBy("position", "asc"),
      );
      expect(firstHundred).toHaveLength(100);
      expect(firstHundred[0].position).toBe(0);
      expect(firstHundred[99].position).toBe(99);

      // Test querying by type
      const codeCells = store.query(
        tables.cells.select().where({ cellType: "code" }),
      );
      expect(codeCells.length).toBeGreaterThan(300); // Roughly 1/3 of total
    });
  });

  describe("Event Ordering and Consistency", () => {
    it("should maintain consistency with rapid cell reordering", async () => {
      const cellCount = 10;
      const cellIds: string[] = [];

      // Create cells
      for (let i = 0; i < cellCount; i++) {
        const cellId = `order-cell-${i}`;
        cellIds.push(cellId);
        store.commit(
          events.cellCreated({
            id: cellId,
            cellType: "code",
            position: i,
            createdBy: "test-user",
          }),
        );
      }

      // Randomly reorder cells multiple times
      for (let round = 0; round < 5; round++) {
        const shuffledPositions = Array.from(
          { length: cellCount },
          (_, i) => i,
        ).sort(() => Math.random() - 0.5);

        for (let i = 0; i < cellCount; i++) {
          store.commit(
            events.cellMoved({
              id: cellIds[i],
              newPosition: shuffledPositions[i],
            }),
          );
        }

        // Verify no duplicate positions
        const cells = store.query(tables.cells.select());
        const positions = cells
          .map((c: any) => c.position)
          .sort((a: number, b: number) => a - b);
        const uniquePositions = [...new Set(positions)];
        expect(uniquePositions).toHaveLength(cellCount);
      }
    });

    it("should handle complex execution state transitions", async () => {
      const cellId = "state-transition-cell";
      const queueId = "state-transition-queue";

      store.commit(
        events.cellCreated({
          id: cellId,
          cellType: "code",
          position: 0,
          createdBy: "test-user",
        }),
      );

      store.commit(
        events.kernelSessionStarted({
          sessionId,
          kernelId: "state-kernel",
          kernelType: "python3",
          capabilities: {
            canExecuteCode: true,
            canExecuteSql: false,
            canExecuteAi: false,
          },
        }),
      );

      // Test state transitions: idle -> queued -> assigned -> executing -> completed
      let cell = store.query(tables.cells.select().where({ id: cellId }))[0];
      expect(cell.executionState).toBe("idle");

      store.commit(
        events.executionRequested({
          queueId,
          cellId,
          executionCount: 1,
          requestedBy: "test-user",
          priority: 1,
        }),
      );

      cell = store.query(tables.cells.select().where({ id: cellId }))[0];
      expect(cell.executionState).toBe("queued");

      store.commit(
        events.executionAssigned({
          queueId,
          kernelSessionId: sessionId,
        }),
      );

      // Cell state should still be queued after assignment
      cell = store.query(tables.cells.select().where({ id: cellId }))[0];
      expect(cell.executionState).toBe("queued");

      store.commit(
        events.executionStarted({
          queueId,
          cellId,
          kernelSessionId: sessionId,
          startedAt: new Date(),
        }),
      );

      cell = store.query(tables.cells.select().where({ id: cellId }))[0];
      expect(cell.executionState).toBe("running");

      store.commit(
        events.executionCompleted({
          queueId,
          cellId,
          status: "success",
          completedAt: new Date(),
          executionDurationMs: 200,
        }),
      );

      cell = store.query(tables.cells.select().where({ id: cellId }))[0];
      expect(cell.executionState).toBe("completed");
    });
  });
});
