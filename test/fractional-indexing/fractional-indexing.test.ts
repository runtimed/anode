import { describe, it, expect, beforeEach } from "vitest";
import { makeSchema, State, Store as LiveStore } from "@livestore/livestore";
import {
  fractionalIndexBetween,
  generateFractionalIndices,
  initialFractionalIndex,
  isValidFractionalIndex,
  validateFractionalIndexOrder,
  createTestJitterProvider,
  moveCellBetween,
  events,
  tables,
  materializers,
  type CellData,
  type CellType,
} from "@/runt-schema";

describe("Fractional Indexing", () => {
  describe("Basic Operations", () => {
    it("should generate initial index", () => {
      const index = initialFractionalIndex();
      expect(index).toBe("m");
      expect(isValidFractionalIndex(index)).toBe(true);
    });

    it("should generate index between null boundaries", () => {
      const index = fractionalIndexBetween(null, null);
      expect(index).toBe("m");
    });

    it("should generate index before a value", () => {
      const index = fractionalIndexBetween(null, "m");
      expect(index < "m").toBe(true);
      expect(isValidFractionalIndex(index)).toBe(true);
    });

    it("should generate index after a value", () => {
      const index = fractionalIndexBetween("m", null);
      expect(index > "m").toBe(true);
      expect(isValidFractionalIndex(index)).toBe(true);
    });

    it("should generate index between two values", () => {
      const index = fractionalIndexBetween("a", "z");
      expect(index > "a").toBe(true);
      expect(index < "z").toBe(true);
      expect(isValidFractionalIndex(index)).toBe(true);
    });

    it("should handle adjacent characters", () => {
      const index = fractionalIndexBetween("a", "b");
      expect(index > "a").toBe(true);
      expect(index < "b").toBe(true);
      expect(index.length).toBeGreaterThan(1); // Should extend
    });

    it("should maintain ordering with binary collation", () => {
      const indices: string[] = [];

      // Generate many indices by repeated insertion
      indices.push(fractionalIndexBetween(null, null));

      for (let i = 0; i < 100; i++) {
        // Randomly insert between existing indices
        const insertPos = Math.floor(Math.random() * (indices.length + 1));
        const before = insertPos > 0 ? indices[insertPos - 1] : null;
        const after = insertPos < indices.length ? indices[insertPos] : null;

        const newIndex = fractionalIndexBetween(before, after);
        indices.splice(insertPos, 0, newIndex);
      }

      // Verify all indices are valid
      indices.forEach((idx) => {
        expect(isValidFractionalIndex(idx)).toBe(true);
      });

      // Verify ordering is maintained
      const sorted = [...indices].sort();
      expect(indices).toEqual(sorted);
      expect(validateFractionalIndexOrder(indices)).toBe(true);
    });
  });

  describe("Deterministic Testing with JitterProvider", () => {
    it("should generate consistent indices with test jitter provider", () => {
      const jitter = createTestJitterProvider(42);

      const index1 = fractionalIndexBetween("a", "z", jitter);

      // Reset with same seed
      const jitter2 = createTestJitterProvider(42);
      const index2 = fractionalIndexBetween("a", "z", jitter2);

      expect(index1).toBe(index2);
    });

    it("should generate multiple indices with deterministic jitter", () => {
      const jitter = createTestJitterProvider(123);

      const indices = generateFractionalIndices("a", "z", 5, jitter);

      expect(indices).toHaveLength(5);
      expect(validateFractionalIndexOrder(["a", ...indices, "z"])).toBe(true);

      // Verify deterministic generation
      const jitter2 = createTestJitterProvider(123);
      const indices2 = generateFractionalIndices("a", "z", 5, jitter2);

      expect(indices).toEqual(indices2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very close indices", () => {
      let a = "a";
      let b = "b";

      // Repeatedly insert between a and b
      const indices = [a, b];

      for (let i = 0; i < 20; i++) {
        const mid = fractionalIndexBetween(a, b);
        indices.push(mid);

        // Alternately move boundaries closer
        if (i % 2 === 0) {
          a = mid;
        } else {
          b = mid;
        }
      }

      // All indices should be unique and maintain order
      const uniqueIndices = [...new Set(indices)];
      expect(uniqueIndices).toHaveLength(indices.length);

      const sorted = [...indices].sort();
      expect(validateFractionalIndexOrder(sorted)).toBe(true);
    });

    it("should handle empty string edge case", () => {
      expect(() => fractionalIndexBetween("", "a")).not.toThrow();
      expect(() => fractionalIndexBetween("a", "")).not.toThrow();
    });

    it("should reject invalid orderings", () => {
      expect(() => fractionalIndexBetween("z", "a")).toThrow();
      expect(() => fractionalIndexBetween("m", "m")).toThrow();
    });

    it("should validate fractional indices correctly", () => {
      expect(isValidFractionalIndex("a")).toBe(true);
      expect(isValidFractionalIndex("123")).toBe(true);
      expect(isValidFractionalIndex("a1b2c3")).toBe(true);

      expect(isValidFractionalIndex("")).toBe(false);
      expect(isValidFractionalIndex("A")).toBe(false); // uppercase not allowed
      expect(isValidFractionalIndex("a-b")).toBe(false); // hyphen not allowed
      expect(isValidFractionalIndex("a b")).toBe(false); // space not allowed
    });
  });

  describe("Store Integration", () => {
    const state = State.SQLite.makeState({
      tables: tables,
      materializers: materializers,
    });
    const schema = makeSchema({ events: events, state });

    let store: LiveStore<typeof schema>;

    beforeEach(async () => {
      // Create store with in-memory adapter for testing
      const { createInMemoryAdapter } = await import("../setup");
      const adapter = await createInMemoryAdapter();
      store = new LiveStore({ schema, ...adapter });
    });

    it("should create cells with fractional indices", () => {
      const cellId1 = "cell-1";
      const cellId2 = "cell-2";
      const cellId3 = "cell-3";

      // Create first cell
      store.commit(
        events.cellCreated2({
          id: cellId1,
          fractionalIndex: initialFractionalIndex(),
          cellType: "python",
          createdBy: "user-1",
        })
      );

      // Create second cell after first
      store.commit(
        events.cellCreated2({
          id: cellId2,
          fractionalIndex: fractionalIndexBetween("m", null),
          cellType: "python",
          createdBy: "user-1",
        })
      );

      // Create third cell between first and second
      const cells = store.query(
        tables.cells.select().orderBy("fractionalIndex", "asc")
      );

      const firstIndex = cells[0]?.fractionalIndex;
      const secondIndex = cells[1]?.fractionalIndex;

      store.commit(
        events.cellCreated2({
          id: cellId3,
          fractionalIndex: fractionalIndexBetween(firstIndex, secondIndex),
          cellType: "python",
          createdBy: "user-1",
        })
      );

      // Verify ordering
      const finalCells = store.query(
        tables.cells.select().orderBy("fractionalIndex", "asc")
      );

      expect(finalCells).toHaveLength(3);
      expect(finalCells[0].id).toBe(cellId1);
      expect(finalCells[1].id).toBe(cellId3);
      expect(finalCells[2].id).toBe(cellId2);

      // Verify indices maintain order
      const indices = finalCells.map((c) => c.fractionalIndex).filter(Boolean);
      expect(validateFractionalIndexOrder(indices)).toBe(true);
    });

    it("should move cells correctly", () => {
      // Create initial cells
      const cells = [
        { id: "cell-1", fractionalIndex: "a", cellType: "python" as const },
        { id: "cell-2", fractionalIndex: "m", cellType: "python" as const },
        { id: "cell-3", fractionalIndex: "t", cellType: "python" as const },
        { id: "cell-4", fractionalIndex: "z", cellType: "python" as const },
      ];

      cells.forEach((cell) => {
        store.commit(
          events.cellCreated2({
            ...cell,
            createdBy: "user-1",
          })
        );
      });

      // Move cell-4 between cell-1 and cell-2
      const moveEvent = moveCellBetween(
        cells[3], // cell-4
        cells[0], // cell-1 (before)
        cells[1], // cell-2 (after)
        "user-1"
      );

      expect(moveEvent).not.toBeNull();
      if (moveEvent) {
        store.commit(moveEvent);

        const updatedCells = store.query(
          tables.cells.select().orderBy("fractionalIndex", "asc")
        );

        expect(updatedCells).toHaveLength(4);
        expect(updatedCells[0].id).toBe("cell-1");
        expect(updatedCells[1].id).toBe("cell-4"); // moved here
        expect(updatedCells[2].id).toBe("cell-2");
        expect(updatedCells[3].id).toBe("cell-3");

        // Verify the moved cell got a valid index between a and m
        const movedCell = updatedCells.find((c) => c.id === "cell-4");
        expect(
          movedCell?.fractionalIndex && movedCell.fractionalIndex > "a"
        ).toBe(true);
        expect(
          movedCell?.fractionalIndex && movedCell.fractionalIndex < "m"
        ).toBe(true);
      }
    });

    it("should handle rapid consecutive moves", () => {
      // Create cells
      const cellCount = 5;
      const cells: CellData[] = [];

      for (let i = 0; i < cellCount; i++) {
        const index = fractionalIndexBetween(
          i > 0 ? cells[i - 1].fractionalIndex : null,
          null
        );

        const cell = {
          id: `cell-${i}`,
          fractionalIndex: index,
          cellType: "python" as const,
        };

        cells.push(cell as CellData);

        store.commit(
          events.cellCreated2({
            ...cell,
            createdBy: "user-1",
          })
        );
      }

      // Perform multiple moves rapidly
      // Move last cell up repeatedly
      let currentCells = store.query(
        tables.cells.select().orderBy("fractionalIndex", "asc")
      );

      for (let i = 0; i < 3; i++) {
        const lastIdx = currentCells.length - 1;
        const targetIdx = lastIdx - 1;

        if (targetIdx < 0) break;

        const moveEvent = moveCellBetween(
          currentCells[lastIdx],
          targetIdx > 0 ? currentCells[targetIdx - 1] : null,
          currentCells[targetIdx],
          "user-1"
        );

        if (moveEvent) {
          store.commit(moveEvent);
          currentCells = store.query(
            tables.cells.select().orderBy("fractionalIndex", "asc")
          );
        }
      }

      // Verify final ordering is valid
      const finalIndices = currentCells
        .map((c) => c.fractionalIndex)
        .filter(Boolean);
      expect(validateFractionalIndexOrder(finalIndices)).toBe(true);

      // Verify no duplicates
      const uniqueIndices = [...new Set(finalIndices)];
      expect(uniqueIndices).toHaveLength(finalIndices.length);
    });

    it("should detect when cell is already in position", () => {
      // Create three cells
      store.commit(
        events.cellCreated2({
          id: "cell-1",
          fractionalIndex: "a",
          cellType: "python",
          createdBy: "user-1",
        })
      );

      store.commit(
        events.cellCreated2({
          id: "cell-2",
          fractionalIndex: "m",
          cellType: "python",
          createdBy: "user-1",
        })
      );

      store.commit(
        events.cellCreated2({
          id: "cell-3",
          fractionalIndex: "z",
          cellType: "python",
          createdBy: "user-1",
        })
      );

      const cells = store.query(
        tables.cells.select().orderBy("fractionalIndex", "asc")
      );

      // Try to move cell-2 to where it already is (between cell-1 and cell-3)
      const moveEvent = moveCellBetween(
        cells[1], // cell-2
        cells[0], // cell-1
        cells[2], // cell-3
        "user-1"
      );

      // Should return null since cell is already in position
      expect(moveEvent).toBeNull();
    });
  });
});
