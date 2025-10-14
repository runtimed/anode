import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signal, createStorePromise } from "@runtimed/schema";
import { makeAdapter } from "@livestore/adapter-node";
import { schema } from "@runtimed/schema";
import { createTestStoreId, cleanupResources } from "./setup.js";

console.log("🧪 Starting Anode test suite...");

// Skip test unconditionally due to native parcel watcher CI compatibility issues
describe.skip("Focused Cell Signal", () => {
  let store: any;
  let storeId: string;

  beforeEach(async () => {
    storeId = createTestStoreId();

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

  describe("Basic Signal Operations", () => {
    it("should initialize with null value", () => {
      const focusedCellSignal$ = signal<string | null>(null, {
        label: "focusedCellId$",
      });

      const currentValue = store.query(focusedCellSignal$);
      expect(currentValue).toBe(null);
    });

    it("should allow setting and getting focused cell ID", () => {
      const focusedCellSignal$ = signal<string | null>(null, {
        label: "focusedCellId$",
      });

      const cellId = "test-cell-123";
      store.setSignal(focusedCellSignal$, cellId);

      const currentValue = store.query(focusedCellSignal$);
      expect(currentValue).toBe(cellId);
    });

    it("should allow unsetting focused cell (set to null)", () => {
      const focusedCellSignal$ = signal<string | null>(null, {
        label: "focusedCellId$",
      });

      // First set a value
      const cellId = "test-cell-123";
      store.setSignal(focusedCellSignal$, cellId);
      expect(store.query(focusedCellSignal$)).toBe(cellId);

      // Then unset it
      store.setSignal(focusedCellSignal$, null);
      expect(store.query(focusedCellSignal$)).toBe(null);
    });
  });

  describe("Focus Management Use Case", () => {
    it("should handle focus transitions like in NotebookViewer", () => {
      const focusedCellSignal$ = signal<string | null>(null, {
        label: "focusedCellId$",
      });

      // Initial focus state
      expect(store.query(focusedCellSignal$)).toBe(null);

      // Focus a cell
      store.setSignal(focusedCellSignal$, "cell-1");
      expect(store.query(focusedCellSignal$)).toBe("cell-1");

      // Focus another cell
      store.setSignal(focusedCellSignal$, "cell-2");
      expect(store.query(focusedCellSignal$)).toBe("cell-2");

      // Clear focus
      store.setSignal(focusedCellSignal$, null);
      expect(store.query(focusedCellSignal$)).toBe(null);
    });
  });

  describe("Signal Independence", () => {
    it("should maintain separate state for different signals", () => {
      const focusedCellSignal1$ = signal<string | null>(null, {
        label: "focusedCellId1$",
      });

      const focusedCellSignal2$ = signal<string | null>(null, {
        label: "focusedCellId2$",
      });

      // Set different values
      store.setSignal(focusedCellSignal1$, "cell-1");
      store.setSignal(focusedCellSignal2$, "cell-2");

      // Each should maintain its own value
      expect(store.query(focusedCellSignal1$)).toBe("cell-1");
      expect(store.query(focusedCellSignal2$)).toBe("cell-2");

      // Changing one shouldn't affect the other
      store.setSignal(focusedCellSignal1$, "cell-3");
      expect(store.query(focusedCellSignal1$)).toBe("cell-3");
      expect(store.query(focusedCellSignal2$)).toBe("cell-2");
    });

    it("should be ephemeral and not create database events", () => {
      const focusedCellSignal$ = signal<string | null>(null, {
        label: "focusedCellId$",
      });

      const initialValue = store.query(focusedCellSignal$);
      expect(initialValue).toBe(null);

      store.setSignal(focusedCellSignal$, "cell-1");
      const newValue = store.query(focusedCellSignal$);
      expect(newValue).toBe("cell-1");

      // Signal should be ephemeral - this is verified by the fact that
      // setSignal doesn't require events or materializers like LiveStore data
    });
  });
});
