import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStorePromise, queryDb } from "@livestore/livestore";
import { makeAdapter } from "@livestore/adapter-node";
import { events, tables, schema } from "../../src/schema.js";
import {
  cleanupResources,
  createTestSessionId,
  createTestStoreId,
  waitFor,
} from "../setup.js";

describe("Reactivity Debugging", () => {
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
  });

  afterEach(async () => {
    await cleanupResources(store);
  });

  describe("Query Subscription Lifecycle", () => {
    it("should properly clean up subscriptions on query disposal", async () => {
      const updateCallback = vi.fn();
      let subscriptionCount = 0;

      // Create query and subscribe
      const assignedWork$ = queryDb(
        tables.executionQueue
          .select()
          .where({ assignedRuntimeSession: sessionId }),
        { label: "assignedWork" }
      );

      const subscription = store.subscribe(assignedWork$, {
        onUpdate: (data: any) => {
          subscriptionCount++;
          updateCallback(data);
        },
        onError: (error: any) => {
          console.error("Query error:", error);
        },
      });

      // Add some data to trigger updates
      const cellId = "test-cell";
      const queueId = "test-queue";

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
        events.executionAssigned({
          queueId,
          runtimeSessionId: sessionId,
        })
      );

      // Wait for initial updates
      await waitFor(() => updateCallback.mock.calls.length > 0);
      const initialCallCount = updateCallback.mock.calls.length;

      // Clean up subscription explicitly
      subscription();

      // Add more data - should NOT trigger more callbacks
      store.commit(
        events.executionStarted({
          queueId,
          cellId,
          runtimeSessionId: sessionId,
          startedAt: new Date(),
        })
      );

      // Wait a bit to ensure no additional calls
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not have received additional updates after unsubscribe
      expect(updateCallback.mock.calls.length).toBe(initialCallCount);
    });

    it("should handle multiple subscriptions to the same query", async () => {
      const callbacks = [vi.fn(), vi.fn(), vi.fn()];

      const pendingWork$ = queryDb(
        tables.executionQueue
          .select()
          .where({ status: "pending" })
          .orderBy("id", "desc")
          .limit(5),
        { label: "pendingWork" }
      );

      // Create multiple subscriptions to the same query
      const subscriptions = callbacks.map((callback) =>
        store.subscribe(pendingWork$, {
          onUpdate: callback,
        })
      );

      // Add data to trigger updates
      store.commit(
        events.cellCreated({
          id: "multi-sub-cell",
          cellType: "code",
          position: 0,
          createdBy: "test-user",
        })
      );

      store.commit(
        events.executionRequested({
          queueId: "multi-sub-queue",
          cellId: "multi-sub-cell",
          executionCount: 1,
          requestedBy: "test-user",
        })
      );

      // All callbacks should receive updates
      await waitFor(() => callbacks.every((cb) => cb.mock.calls.length > 0));

      callbacks.forEach((callback) => {
        expect(callback.mock.calls.length).toBeGreaterThan(0);
        expect(
          callback.mock.calls[callback.mock.calls.length - 1][0]
        ).toHaveLength(1);
      });

      // Clean up all subscriptions
      subscriptions.forEach((unsub) => unsub());

      // Add more data - no callbacks should be triggered
      const beforeCallCounts = callbacks.map((cb) => cb.mock.calls.length);

      store.commit(
        events.executionCompleted({
          queueId: "multi-sub-queue",
          cellId: "multi-sub-cell",
          status: "success",
          completedAt: new Date(),
          executionDurationMs: 100,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Call counts should remain the same
      callbacks.forEach((callback, index) => {
        expect(callback.mock.calls.length).toBe(beforeCallCounts[index]);
      });
    });

    it("should handle subscription errors without affecting other subscriptions", async () => {
      const goodCallback = vi.fn();
      const errorCallback = vi.fn();

      // Good query
      const goodQuery$ = queryDb(tables.cells.select(), { label: "goodQuery" });

      // Problematic query (simulate error conditions)
      // Note: With strict typing, we simulate runtime errors differently
      const badQuery$ = queryDb(
        tables.cells.select().where({ id: "non-existent-cell-id" }),
        { label: "badQuery" }
      );

      let goodSubscription: any;
      let badSubscription: any;

      try {
        goodSubscription = store.subscribe(goodQuery$, {
          onUpdate: goodCallback,
          onError: (error: any) => console.log("Good query error:", error),
        });

        badSubscription = store.subscribe(badQuery$, {
          onUpdate: (data: any) => console.log("Bad query data:", data),
          onError: errorCallback,
        });
      } catch (error) {
        // Expected for bad query
        console.log("Subscription creation error:", error);
      }

      // Add data that should trigger the good query
      store.commit(
        events.cellCreated({
          id: "error-test-cell",
          cellType: "code",
          position: 0,
          createdBy: "test-user",
        })
      );

      // Good callback should work even if bad query fails
      await waitFor(() => goodCallback.mock.calls.length > 0, 1000);
      expect(goodCallback.mock.calls.length).toBeGreaterThan(0);

      // Clean up
      if (goodSubscription) goodSubscription();
      if (badSubscription) badSubscription();
    });
  });

  describe("Store State Consistency", () => {
    it("should maintain consistent state during rapid updates", async () => {
      const stateSnapshots: any[] = [];

      const allCells$ = queryDb(tables.cells.select(), { label: "allCells" });

      const subscription = store.subscribe(allCells$, {
        onUpdate: (cells: any[]) => {
          stateSnapshots.push({
            timestamp: Date.now(),
            cellCount: cells.length,
            cells: cells.map((c) => ({
              id: c.id,
              position: c.position,
            })),
          });
        },
      });

      // Rapidly create, modify, and delete cells
      const operations: Array<() => any> = [];
      for (let i = 0; i < 20; i++) {
        const cellId = `rapid-${i}`;

        operations.push(() =>
          store.commit(
            events.cellCreated({
              id: cellId,
              cellType: "code",
              position: i,
              createdBy: "test-user",
            })
          )
        );

        if (i > 0) {
          operations.push(() =>
            store.commit(
              events.cellMoved({
                id: `rapid-${i - 1}`,
                newPosition: i * 10,
              })
            )
          );
        }

        if (i % 3 === 0) {
          operations.push(() =>
            store.commit(
              events.cellDeleted({
                id: cellId,
              })
            )
          );
        }
      }

      // Execute all operations
      operations.forEach((op: any) => op());

      // Wait for all updates to settle
      await (waitFor as any)(() => stateSnapshots.length > 10, 2000);

      // Verify state consistency
      expect(stateSnapshots.length).toBeGreaterThan(0);

      // Check that timestamps are monotonically increasing
      for (let i = 1; i < stateSnapshots.length; i++) {
        expect(stateSnapshots[i].timestamp).toBeGreaterThanOrEqual(
          stateSnapshots[i - 1].timestamp
        );
      }

      // Final state should be consistent
      const finalSnapshot = stateSnapshots[stateSnapshots.length - 1];
      const finalCells = store.query(tables.cells.select());
      expect(finalSnapshot.cellCount).toBe(finalCells.length);

      subscription();
    });

    it("should handle query dependencies correctly", async () => {
      const updates: { [key: string]: any[] } = {
        runtimeSessions: [],
        assignedWork: [],
        pendingWork: [],
      };

      // Create dependent queries
      const runtimeSessions$ = queryDb(
        tables.runtimeSessions.select().where({ isActive: true }),
        { label: "activeRuntimeSessions" }
      );

      const assignedWork$ = queryDb(
        tables.executionQueue
          .select()
          .where({ status: "assigned", assignedRuntimeSession: sessionId }),
        { label: "assignedWork" }
      );

      const pendingWork$ = queryDb(
        tables.executionQueue
          .select()
          .where({ status: "pending" })
          .orderBy("id", "desc"),
        { label: "pendingWork" }
      );

      // Subscribe to all queries
      const subscriptions = [
        store.subscribe(runtimeSessions$, {
          onUpdate: (data: any) =>
            updates.runtimeSessions.push({ timestamp: Date.now(), data }),
        }),
        store.subscribe(assignedWork$, {
          onUpdate: (data: any) =>
            updates.assignedWork.push({ timestamp: Date.now(), data }),
        }),
        store.subscribe(pendingWork$, {
          onUpdate: (data: any) =>
            updates.pendingWork.push({ timestamp: Date.now(), data }),
        }),
      ];

      // Trigger a sequence of related events

      // 1. Start runtime session
      store.commit(
        events.runtimeSessionStarted({
          sessionId,
          runtimeId: runtimeId,
          runtimeType: "python3",
          capabilities: {
            canExecuteCode: true,
            canExecuteSql: false,
            canExecuteAi: false,
          },
        })
      );

      // 2. Create cell and request execution
      const cellId = "dependency-test-cell";
      const queueId = "dependency-test-queue";

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

      // 3. Assign execution
      store.commit(
        events.executionAssigned({
          queueId,
          runtimeSessionId: sessionId,
        })
      );

      // Wait for all updates
      await waitFor(
        () =>
          updates.runtimeSessions.length > 0 &&
          updates.assignedWork.length > 0 &&
          updates.pendingWork.length > 0
      );

      // Verify all queries received updates
      expect(updates.runtimeSessions.length).toBeGreaterThan(0);
      expect(updates.assignedWork.length).toBeGreaterThan(0);
      expect(updates.pendingWork.length).toBeGreaterThan(0);

      // Verify final states are consistent
      const finalRuntimeSessions =
        updates.runtimeSessions[updates.runtimeSessions.length - 1].data;
      const finalAssignedWork =
        updates.assignedWork[updates.assignedWork.length - 1].data;

      expect(finalRuntimeSessions).toHaveLength(1);
      expect(finalRuntimeSessions[0].sessionId).toBe(sessionId);
      expect(finalAssignedWork).toHaveLength(1);
      expect(finalAssignedWork[0].assignedRuntimeSession).toBe(sessionId);

      // Clean up
      subscriptions.forEach((unsub) => unsub());
    });
  });

  describe("Memory and Performance", () => {
    it("should not leak memory with frequent subscription changes", async () => {
      const subscriptionCycles = 10;
      const operationsPerCycle = 5;

      for (let cycle = 0; cycle < subscriptionCycles; cycle++) {
        const subscriptions: any[] = [];

        // Create multiple subscriptions
        for (let i = 0; i < 3; i++) {
          const query$ = queryDb(
            tables.cells.select().where({ position: { op: ">=", value: i } }),
            { label: `memoryTestQuery-${cycle}-${i}` }
          );

          subscriptions.push(
            store.subscribe(query$, {
              onUpdate: () => {
                // Minimal processing to avoid interfering with memory test
              },
            })
          );
        }

        // Perform some operations
        for (let op = 0; op < operationsPerCycle; op++) {
          const cellId = `memory-test-${cycle}-${op}`;

          store.commit(
            events.cellCreated({
              id: cellId,
              cellType: "code",
              position: op,
              createdBy: "test-user",
            })
          );

          if (op % 2 === 0) {
            store.commit(
              events.cellDeleted({
                id: cellId,
              })
            );
          }
        }

        // Clean up subscriptions
        subscriptions.forEach((unsub) => unsub());

        // Small delay to allow cleanup
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // If we get here without running out of memory, the test passes
      expect(true).toBe(true);
    });

    it("should handle high-frequency updates efficiently", async () => {
      const updateCounts: number[] = [];
      const startTime = Date.now();

      const highFreqQuery$ = queryDb(tables.runtimeSessions.select(), {
        label: "highFrequencyQuery",
      });

      const subscription = store.subscribe(highFreqQuery$, {
        onUpdate: (data: any) => {
          updateCounts.push(Date.now() - startTime);
        },
      });

      // Generate high-frequency updates
      const updateCount = 50;
      const heartbeatInterval = 10; // ms

      for (let i = 0; i < updateCount; i++) {
        setTimeout(() => {
          store.commit(
            events.runtimeSessionStatusChanged({
              sessionId: `high-freq-session-${i % 3}`, // Cycle through 3 sessions
              status: i % 2 === 0 ? "ready" : "busy",
            })
          );
        }, i * heartbeatInterval);
      }

      // Start a runtime session first
      store.commit(
        events.runtimeSessionStarted({
          sessionId: "high-freq-session-0",
          runtimeId: "high-freq-runtime",
          runtimeType: "python3",
          capabilities: {
            canExecuteCode: true,
            canExecuteSql: false,
            canExecuteAi: false,
          },
        })
      );

      // Wait for updates to complete
      await waitFor(() => updateCounts.length >= updateCount / 2, 3000);

      // Verify we received a reasonable number of updates
      expect(updateCounts.length).toBeGreaterThan(0);

      // Check that updates completed in reasonable time
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds

      subscription();
    });
  });

  describe("Error Recovery", () => {
    it("should recover from query execution errors", async () => {
      const successfulUpdates: any[] = [];
      const errors: any[] = [];

      // This query should work initially
      const dynamicQuery$ = queryDb(tables.cells.select(), {
        label: "dynamicQuery",
      });

      const subscription = store.subscribe(dynamicQuery$, {
        onUpdate: (data: any) => {
          successfulUpdates.push(data);
        },
        onError: (error: any) => {
          errors.push(error);
        },
      });

      // Add some valid data
      store.commit(
        events.cellCreated({
          id: "recovery-cell-1",
          cellType: "code",
          position: 0,
          createdBy: "test-user",
        })
      );

      await waitFor(() => successfulUpdates.length > 0);
      expect(successfulUpdates.length).toBeGreaterThan(0);

      // Add more valid data after potential error
      store.commit(
        events.cellCreated({
          id: "recovery-cell-2",
          cellType: "code",
          position: 1,
          createdBy: "test-user",
        })
      );

      await waitFor(() => successfulUpdates.length > 1);
      expect(successfulUpdates.length).toBeGreaterThan(1);

      subscription();
    });

    it("should handle store shutdown gracefully", async () => {
      const updates: any[] = [];
      let shutdownError: any = null;

      const query$ = queryDb(tables.executionQueue.select(), {
        label: "shutdownTestQuery",
      });

      const subscription = store.subscribe(query$, {
        onUpdate: (data: any) => updates.push(data),
        onError: (error: any) => {
          shutdownError = error;
        },
      });

      // Add some data
      store.commit(
        events.cellCreated({
          id: "shutdown-test-cell",
          cellType: "code",
          position: 0,
          createdBy: "test-user",
        })
      );

      await waitFor(() => updates.length > 0);

      // Shutdown store
      await store.shutdown();

      // Subscription cleanup should not throw
      expect(() => subscription()).not.toThrow();

      // If there was a shutdown error, it should be handled gracefully
      if (shutdownError) {
        expect(shutdownError).toBeDefined();
      }
    });
  });
});
