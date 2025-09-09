import { describe, it, expect, beforeAll } from "vitest";
import { parseDbDate, nowIsoString } from "../backend/utils/date";

beforeAll(() => {
  console.log("🧪 Starting Anode date utilities test suite...");
});

describe("Backend Date Utilities", () => {
  describe("parseDbDate", () => {
    it("should parse ISO date strings with Z timezone", () => {
      const dateString = "2025-01-15T10:30:00.000Z";
      const result = parseDbDate(dateString);
      expect(result.toISOString()).toBe("2025-01-15T10:30:00.000Z");
    });

    it("should assume UTC for dates without timezone info (D1 SQLite default)", () => {
      const dateString = "2025-01-15T10:30:00.000";
      const result = parseDbDate(dateString);
      expect(result.toISOString()).toBe("2025-01-15T10:30:00.000Z");
    });

    it("should handle date strings with timezone offsets", () => {
      const dateString = "2025-01-15T10:30:00.000+02:00";
      const result = parseDbDate(dateString);
      // Should correctly parse the timezone offset
      expect(result.toISOString()).toBe("2025-01-15T08:30:00.000Z");
    });

    it("should handle date strings with negative timezone offsets", () => {
      const dateString = "2025-01-15T10:30:00.000-05:00";
      const result = parseDbDate(dateString);
      // Should correctly parse the negative timezone offset
      expect(result.toISOString()).toBe("2025-01-15T15:30:00.000Z");
    });

    it("should not add Z to dates that already have timezone info", () => {
      const dateString = "2025-01-15T10:30:00.000+00:00";
      const result = parseDbDate(dateString);
      expect(result.toISOString()).toBe("2025-01-15T10:30:00.000Z");
    });
  });

  describe("nowIsoString", () => {
    it("should return current time as ISO string", () => {
      const before = Date.now();
      const result = nowIsoString();
      const after = Date.now();

      const parsed = new Date(result);
      expect(parsed.getTime()).toBeGreaterThanOrEqual(before);
      expect(parsed.getTime()).toBeLessThanOrEqual(after);
    });

    it("should return UTC format", () => {
      const result = nowIsoString();
      expect(result).toMatch(/Z$/);
    });

    it("should be valid ISO format", () => {
      const result = nowIsoString();
      const parsed = new Date(result);
      expect(!isNaN(parsed.getTime())).toBe(true);
    });
  });

  describe("Integration: Database to API Flow", () => {
    it("should handle typical D1 SQLite date without timezone", () => {
      // Simulates a date string returned from D1 SQLite CURRENT_TIMESTAMP
      const dbDate = "2025-01-15 10:30:00";

      // Parse as if from database
      const parsed = parseDbDate(dbDate);

      // Format for API response
      const apiFormatted = parsed.toISOString();

      expect(apiFormatted).toBe("2025-01-15T10:30:00.000Z");
      expect(!isNaN(parsed.getTime())).toBe(true);
    });

    it("should handle round-trip consistency", () => {
      const originalDate = new Date("2025-01-15T10:30:00.000Z");

      // Store in database format (just ISO string)
      const dbFormat = originalDate.toISOString();

      // Parse back from database
      const parsed = parseDbDate(dbFormat);

      // Format for API
      const apiFormat = parsed.toISOString();

      expect(apiFormat).toBe(originalDate.toISOString());
    });
  });
});
