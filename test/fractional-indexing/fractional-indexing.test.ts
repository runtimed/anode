import { describe, it, expect } from "vitest";
import {
  fractionalIndexBetween,
  generateFractionalIndices,
  initialFractionalIndex,
  isValidFractionalIndex,
  validateFractionalIndexOrder,
  createTestJitterProvider,
  moveCellBetween,
} from "@/runt-schema";

describe("Fractional Indexing", () => {
  describe("Basic Operations", () => {
    it("should generate initial index", () => {
      const index = initialFractionalIndex();
      expect(index.startsWith("m")).toBe(true);
      expect(isValidFractionalIndex(index)).toBe(true);
    });

    it("should generate index between null boundaries", () => {
      const index = fractionalIndexBetween(null, null);
      expect(index.startsWith("m")).toBe(true);
      expect(isValidFractionalIndex(index)).toBe(true);
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

      // Use deterministic jitter to avoid conflicts
      const jitter = createTestJitterProvider(42);

      // Generate many indices by repeated insertion
      indices.push(fractionalIndexBetween(null, null, jitter));

      for (let i = 0; i < 100; i++) {
        // Randomly insert between existing indices
        const insertPos = Math.floor(Math.random() * (indices.length + 1));
        const before = insertPos > 0 ? indices[insertPos - 1] : null;
        const after = insertPos < indices.length ? indices[insertPos] : null;

        const newIndex = fractionalIndexBetween(before, after, jitter);
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

  describe("Fractional Index Integration", () => {
    it("should create cells with proper fractional indices", () => {
      // Simulate creating cells with fractional indices
      const cells: Array<{ id: string; fractionalIndex: string }> = [];

      // Create first cell
      const cellId1 = "cell-1";
      const index1 = initialFractionalIndex();
      cells.push({ id: cellId1, fractionalIndex: index1 });

      // Create second cell after first
      const cellId2 = "cell-2";
      const index2 = fractionalIndexBetween(index1, null);
      cells.push({ id: cellId2, fractionalIndex: index2 });

      // Create third cell between first and second
      const cellId3 = "cell-3";
      const index3 = fractionalIndexBetween(index1, index2);
      cells.push({ id: cellId3, fractionalIndex: index3 });

      // Sort cells by fractional index
      cells.sort((a, b) => a.fractionalIndex.localeCompare(b.fractionalIndex));

      // Verify ordering
      expect(cells).toHaveLength(3);
      expect(cells[0].id).toBe(cellId1);
      expect(cells[1].id).toBe(cellId3);
      expect(cells[2].id).toBe(cellId2);

      // Verify indices maintain order
      const indices = cells.map((c) => c.fractionalIndex);
      expect(validateFractionalIndexOrder(indices)).toBe(true);
    });

    it("should move cells correctly using moveCellBetween", () => {
      // Create initial cells
      const cells = [
        { id: "cell-1", fractionalIndex: "a" },
        { id: "cell-2", fractionalIndex: "m" },
        { id: "cell-3", fractionalIndex: "t" },
        { id: "cell-4", fractionalIndex: "z" },
      ];

      // Move cell-4 between cell-1 and cell-2
      const moveEvent = moveCellBetween(
        cells[3], // cell-4
        cells[0], // cell-1 (before)
        cells[1], // cell-2 (after)
        "user-1"
      );

      expect(moveEvent).not.toBeNull();
      if (moveEvent) {
        // Verify the move event has correct data
        expect(moveEvent.name).toBe("v2.CellMoved");
        expect(moveEvent.args.id).toBe("cell-4");

        const newIndex = moveEvent.args.fractionalIndex;
        expect(newIndex > "a").toBe(true);
        expect(newIndex < "m").toBe(true);

        // Update the cell with new index
        cells[3].fractionalIndex = newIndex;

        // Sort and verify order
        const sorted = [...cells].sort((a, b) =>
          a.fractionalIndex.localeCompare(b.fractionalIndex)
        );

        expect(sorted[0].id).toBe("cell-1");
        expect(sorted[1].id).toBe("cell-4"); // moved here
        expect(sorted[2].id).toBe("cell-2");
        expect(sorted[3].id).toBe("cell-3");
      }
    });

    it("should handle rapid consecutive moves", () => {
      // Create cells
      const cellCount = 5;
      const cells: Array<{ id: string; fractionalIndex: string }> = [];

      for (let i = 0; i < cellCount; i++) {
        const index = fractionalIndexBetween(
          i > 0 ? cells[i - 1].fractionalIndex : null,
          null
        );

        cells.push({
          id: `cell-${i}`,
          fractionalIndex: index,
        });
      }

      // Perform multiple moves rapidly
      // Move last cell up repeatedly
      for (let i = 0; i < 3; i++) {
        // Sort cells by fractional index
        cells.sort((a, b) =>
          a.fractionalIndex.localeCompare(b.fractionalIndex)
        );

        const lastIdx = cells.length - 1;
        const targetIdx = lastIdx - 1;

        if (targetIdx < 0) break;

        const moveEvent = moveCellBetween(
          cells[lastIdx],
          targetIdx > 0 ? cells[targetIdx - 1] : null,
          cells[targetIdx],
          "user-1"
        );

        if (moveEvent) {
          // Update the cell's fractional index
          cells[lastIdx].fractionalIndex = moveEvent.args.fractionalIndex;
        }
      }

      // Sort final cells
      cells.sort((a, b) => a.fractionalIndex.localeCompare(b.fractionalIndex));

      // Verify final ordering is valid
      const finalIndices = cells.map((c) => c.fractionalIndex);
      expect(validateFractionalIndexOrder(finalIndices)).toBe(true);

      // Verify no duplicates
      const uniqueIndices = [...new Set(finalIndices)];
      expect(uniqueIndices).toHaveLength(finalIndices.length);
    });

    it("should detect when cell is already in position", () => {
      // Create three cells
      const cells = [
        { id: "cell-1", fractionalIndex: "a" },
        { id: "cell-2", fractionalIndex: "m" },
        { id: "cell-3", fractionalIndex: "z" },
      ];

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
