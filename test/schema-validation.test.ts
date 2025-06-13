import { describe, it, expect } from "vitest";
import { Schema as S } from "effect";
import { events } from "../packages/schema/dist/index.js";

describe("Schema Event Validation", () => {
  describe("Notebook Events", () => {
    it("should validate notebookInitialized event", () => {
      const validEvent = {
        id: "notebook-123",
        title: "Test Notebook",
        ownerId: "user-456",
        createdAt: new Date().toISOString(),
      };

      const result = S.decodeUnknownSync(events.notebookInitialized.schema)(
        validEvent,
      );
      expect(result.id).toBe(validEvent.id);
      expect(result.title).toBe(validEvent.title);
      expect(result.ownerId).toBe(validEvent.ownerId);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it("should validate notebookTitleChanged event", () => {
      const validEvent = {
        title: "Updated Title",
        lastModified: new Date().toISOString(),
      };

      const result = S.decodeUnknownSync(events.notebookTitleChanged.schema)(
        validEvent,
      );
      expect(result.title).toBe(validEvent.title);
      expect(result.lastModified).toBeInstanceOf(Date);
    });

    it("should reject invalid notebook events", () => {
      const invalidEvent = {
        id: 123, // Should be string
        title: "Test Notebook",
        ownerId: "user-456",
        createdAt: new Date().toISOString(),
      };

      expect(() => {
        S.decodeUnknownSync(events.notebookInitialized.schema)(invalidEvent);
      }).toThrow();
    });
  });

  describe("Cell Events", () => {
    it("should validate cellCreated event", () => {
      const validEvent = {
        id: "cell-123",
        cellType: "code" as const,
        position: 0,
        createdBy: "user-456",
        createdAt: new Date().toISOString(),
      };

      const result = S.decodeUnknownSync(events.cellCreated.schema)(validEvent);
      expect(result.id).toBe(validEvent.id);
      expect(result.cellType).toBe(validEvent.cellType);
      expect(result.position).toBe(validEvent.position);
      expect(result.createdBy).toBe(validEvent.createdBy);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it("should validate cellSourceChanged event", () => {
      const validEvent = {
        id: "cell-123",
        source: 'print("Hello, World!")',
        modifiedBy: "user-456",
      };

      const result = S.decodeUnknownSync(events.cellSourceChanged.schema)(
        validEvent,
      );
      expect(result).toEqual(validEvent);
    });

    it("should validate all cell types", () => {
      const cellTypes = ["code", "markdown", "raw", "sql", "ai"] as const;

      cellTypes.forEach((cellType) => {
        const validEvent = {
          id: `cell-${cellType}`,
          cellType,
          position: 0,
          createdBy: "user-456",
          createdAt: new Date().toISOString(),
        };

        expect(() => {
          S.decodeUnknownSync(events.cellCreated.schema)(validEvent);
        }).not.toThrow();
      });
    });

    it("should reject invalid cell types", () => {
      const invalidEvent = {
        id: "cell-123",
        cellType: "invalid-type",
        position: 0,
        createdBy: "user-456",
        createdAt: new Date().toISOString(),
      };

      expect(() => {
        S.decodeUnknownSync(events.cellCreated.schema)(invalidEvent);
      }).toThrow();
    });
  });

  describe("Kernel Session Events", () => {
    it("should validate kernelSessionStarted event", () => {
      const validEvent = {
        sessionId: "session-123",
        kernelId: "kernel-456",
        kernelType: "python3",
        startedAt: new Date().toISOString(),
        capabilities: {
          canExecuteCode: true,
          canExecuteSql: false,
          canExecuteAi: false,
        },
      };

      const result = S.decodeUnknownSync(events.kernelSessionStarted.schema)(
        validEvent,
      );
      expect(result.sessionId).toBe(validEvent.sessionId);
      expect(result.kernelId).toBe(validEvent.kernelId);
      expect(result.kernelType).toBe(validEvent.kernelType);
      expect(result.startedAt).toBeInstanceOf(Date);
      expect(result.capabilities).toEqual(validEvent.capabilities);
    });

    it("should validate kernelSessionHeartbeat event", () => {
      const validEvent = {
        sessionId: "session-123",
        heartbeatAt: new Date().toISOString(),
        status: "ready" as const,
      };

      const result = S.decodeUnknownSync(events.kernelSessionHeartbeat.schema)(
        validEvent,
      );
      expect(result.sessionId).toBe(validEvent.sessionId);
      expect(result.heartbeatAt).toBeInstanceOf(Date);
      expect(result.status).toBe(validEvent.status);
    });

    it("should validate kernelSessionTerminated event", () => {
      const validEvent = {
        sessionId: "session-123",
        reason: "shutdown" as const,
        terminatedAt: new Date().toISOString(),
      };

      const result = S.decodeUnknownSync(events.kernelSessionTerminated.schema)(
        validEvent,
      );
      expect(result.sessionId).toBe(validEvent.sessionId);
      expect(result.reason).toBe(validEvent.reason);
      expect(result.terminatedAt).toBeInstanceOf(Date);
    });

    it("should validate all termination reasons", () => {
      const reasons = ["shutdown", "restart", "error", "timeout"] as const;

      reasons.forEach((reason) => {
        const validEvent = {
          sessionId: "session-123",
          reason,
          terminatedAt: new Date().toISOString(),
        };

        expect(() => {
          S.decodeUnknownSync(events.kernelSessionTerminated.schema)(
            validEvent,
          );
        }).not.toThrow();
      });
    });
  });

  describe("Execution Queue Events", () => {
    it("should validate executionRequested event", () => {
      const validEvent = {
        queueId: "queue-123",
        cellId: "cell-456",
        executionCount: 1,
        requestedBy: "user-789",
        requestedAt: new Date().toISOString(),
        priority: 1,
      };

      const result = S.decodeUnknownSync(events.executionRequested.schema)(
        validEvent,
      );
      expect(result.queueId).toBe(validEvent.queueId);
      expect(result.cellId).toBe(validEvent.cellId);
      expect(result.executionCount).toBe(validEvent.executionCount);
      expect(result.requestedBy).toBe(validEvent.requestedBy);
      expect(result.requestedAt).toBeInstanceOf(Date);
      expect(result.priority).toBe(validEvent.priority);
    });

    it("should validate executionAssigned event", () => {
      const validEvent = {
        queueId: "queue-123",
        kernelSessionId: "session-456",
        assignedAt: new Date().toISOString(),
      };

      const result = S.decodeUnknownSync(events.executionAssigned.schema)(
        validEvent,
      );
      expect(result.queueId).toBe(validEvent.queueId);
      expect(result.kernelSessionId).toBe(validEvent.kernelSessionId);
      expect(result.assignedAt).toBeInstanceOf(Date);
    });

    it("should validate executionCompleted event", () => {
      const validEvent = {
        queueId: "queue-123",
        status: "success" as const,
        completedAt: new Date().toISOString(),
      };

      const result = S.decodeUnknownSync(events.executionCompleted.schema)(
        validEvent,
      );
      expect(result.queueId).toBe(validEvent.queueId);
      expect(result.status).toBe(validEvent.status);
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it("should validate all execution statuses", () => {
      const statuses = ["success", "error", "cancelled"] as const;

      statuses.forEach((status) => {
        const validEvent = {
          queueId: "queue-123",
          status,
          completedAt: new Date().toISOString(),
        };

        expect(() => {
          S.decodeUnknownSync(events.executionCompleted.schema)(validEvent);
        }).not.toThrow();
      });
    });

    it("should handle optional error field", () => {
      const validEventWithError = {
        queueId: "queue-123",
        status: "error" as const,
        completedAt: new Date().toISOString(),
        error: "Python execution failed",
      };

      const validEventWithoutError = {
        queueId: "queue-123",
        status: "success" as const,
        completedAt: new Date().toISOString(),
      };

      expect(() => {
        S.decodeUnknownSync(events.executionCompleted.schema)(
          validEventWithError,
        );
      }).not.toThrow();

      expect(() => {
        S.decodeUnknownSync(events.executionCompleted.schema)(
          validEventWithoutError,
        );
      }).not.toThrow();
    });
  });

  describe("Output Events", () => {
    it("should validate cellOutputAdded event", () => {
      const validEvent = {
        id: "output-123",
        cellId: "cell-456",
        outputType: "stream" as const,
        data: { name: "stdout", text: "Hello, World!" },
        position: 0,
        createdAt: new Date().toISOString(),
      };

      const result = S.decodeUnknownSync(events.cellOutputAdded.schema)(
        validEvent,
      );
      expect(result.id).toBe(validEvent.id);
      expect(result.cellId).toBe(validEvent.cellId);
      expect(result.outputType).toBe(validEvent.outputType);
      expect(result.data).toEqual(validEvent.data);
      expect(result.position).toBe(validEvent.position);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it("should validate all output types", () => {
      const outputTypes = [
        "display_data",
        "execute_result",
        "stream",
        "error",
      ] as const;

      outputTypes.forEach((outputType) => {
        const validEvent = {
          id: "output-123",
          cellId: "cell-456",
          outputType,
          data: { type: outputType, content: "test" },
          position: 0,
          createdAt: new Date().toISOString(),
        };

        expect(() => {
          S.decodeUnknownSync(events.cellOutputAdded.schema)(validEvent);
        }).not.toThrow();
      });
    });

    it("should validate cellOutputsCleared event", () => {
      const validEvent = {
        cellId: "cell-456",
        clearedBy: "kernel-123",
      };

      const result = S.decodeUnknownSync(events.cellOutputsCleared.schema)(
        validEvent,
      );
      expect(result).toEqual(validEvent);
    });
  });

  describe("Event Naming Convention", () => {
    it("should have proper v1 prefixes for all events", () => {
      const eventNames = Object.values(events)
        .filter((event) => event.name !== "uiStateSet") // Filter out client document events
        .map((event) => event.name);

      eventNames.forEach((name) => {
        expect(name).toMatch(/^v1\./);
      });
    });

    it("should use PascalCase after version prefix", () => {
      const eventNames = Object.values(events)
        .filter((event) => event.name !== "uiStateSet")
        .map((event) => event.name);

      eventNames.forEach((name) => {
        const withoutPrefix = name.replace(/^v1\./, "");
        expect(withoutPrefix).toMatch(/^[A-Z][a-zA-Z]*$/);
      });
    });

    it("should use past tense for event names", () => {
      const pastTenseEvents = [
        "NotebookInitialized",
        "CellCreated",
        "CellDeleted",
        "KernelSessionStarted",
        "KernelSessionTerminated",
        "ExecutionRequested",
        "ExecutionAssigned",
        "ExecutionStarted",
        "ExecutionCompleted",
        "CellOutputAdded",
      ];

      pastTenseEvents.forEach((eventName) => {
        const fullName = `v1.${eventName}`;
        const exists = Object.values(events).some(
          (event) => event.name === fullName,
        );
        expect(exists).toBe(true);
      });
    });
  });
});
