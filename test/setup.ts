import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { Effect, TestContext } from "effect";

// Global test setup
beforeAll(async () => {
  console.log("🧪 Starting Anode test suite...");

  // Set test environment variables
  process.env.NODE_ENV = "test";
  process.env.LIVESTORE_SYNC_URL = "ws://localhost:8787";
  process.env.AUTH_TOKEN = "test-token";

  // Suppress console.log in tests unless explicitly needed
  if (!process.env.DEBUG_TESTS) {
    console.log = () => {};
    console.warn = () => {};
  }
});

afterAll(async () => {
  console.log("🏁 Anode test suite completed");
});

beforeEach(async () => {
  // Reset any global state before each test
});

afterEach(async () => {
  // Cleanup after each test
});

// Custom test utilities
export const testEffect = <E, A>(effect: Effect.Effect<A, E>) => {
  return Effect.runPromise(effect);
};

// Mock implementations for testing
export const createMockStore = () => ({
  query: vi.fn(),
  commit: vi.fn(),
  subscribe: vi.fn(() => () => {}),
  shutdown: vi.fn(),
  _dev: {
    downloadDb: vi.fn(),
    downloadEventlogDb: vi.fn(),
    hardReset: vi.fn(),
    syncStates: vi.fn(),
  },
});

export const createMockKernel = () => ({
  initialize: vi.fn(),
  execute: vi.fn(),
  terminate: vi.fn(),
  isReady: vi.fn(() => true),
});

// LiveStore test helpers
export const createTestStoreId = () =>
  `test-store-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const createTestNotebookId = () =>
  `test-notebook-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const createTestSessionId = () =>
  `test-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Async test utilities
export const waitFor = (condition: () => boolean, timeout = 5000) => {
  return new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - start > timeout) {
        reject(new Error(`Timeout waiting for condition after ${timeout}ms`));
      } else {
        setTimeout(check, 10);
      }
    };
    check();
  });
};

// Event testing utilities
export const collectEvents = <T>(
  observable: any,
  count: number,
  timeout = 1000
): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    const events: T[] = [];
    const timer = setTimeout(() => {
      reject(
        new Error(
          `Timeout: collected ${events.length}/${count} events after ${timeout}ms`
        )
      );
    }, timeout);

    const subscription = observable.subscribe({
      next: (event: T) => {
        events.push(event);
        if (events.length >= count) {
          clearTimeout(timer);
          subscription.unsubscribe?.();
          resolve(events);
        }
      },
      error: (error: any) => {
        clearTimeout(timer);
        reject(error);
      },
    });
  });
};

// Database testing utilities
export const createInMemoryAdapter = async () => {
  // This would need to be implemented based on your LiveStore adapter setup
  // For now, return a mock
  return {
    storage: { type: "in-memory" as const },
    sync: undefined,
  };
};

// Error testing utilities
export const expectError = async <T>(
  promise: Promise<T>,
  expectedMessage?: string
) => {
  try {
    await promise;
    throw new Error("Expected promise to reject, but it resolved");
  } catch (error) {
    if (expectedMessage && !error.message.includes(expectedMessage)) {
      throw new Error(
        `Expected error message to contain "${expectedMessage}", but got: ${error.message}`
      );
    }
    return error;
  }
};

// Cleanup utilities
export const cleanupResources = (
  ...resources: Array<{ shutdown?: () => Promise<void> | void }>
) => {
  return Promise.all(
    resources.map(async (resource) => {
      try {
        await resource.shutdown?.();
      } catch (error) {
        console.warn("Error during cleanup:", error);
      }
    })
  );
};
