import { describe, it, expect, beforeAll } from "vitest";
import {
  toDbIsoString,
  normalizeToDbIsoString,
  parseDbDate,
  nowDbIsoString,
  toApiIsoString,
  isValidIsoDate,
} from "../backend/utils/date";

beforeAll(() => {
  console.log("🧪 Starting Anode date utilities test suite...");
});

describe("Backend Date Utilities", () => {
  describe("toDbIsoString", () => {
    it("should convert Date to ISO string", () => {
      const date = new Date("2025-01-15T10:30:00.000Z");
      const result = toDbIsoString(date);
      expect(result).toBe("2025-01-15T10:30:00.000Z");
    });

    it("should always return UTC format", () => {
      const date = new Date("2025-01-15T10:30:00.000Z");
      const result = toDbIsoString(date);
      expect(result).toMatch(/Z$/);
    });
  });

  describe("normalizeToDbIsoString", () => {
    it("should handle Date objects", () => {
      const date = new Date("2025-01-15T10:30:00.000Z");
      const result = normalizeToDbIsoString(date);
      expect(result).toBe("2025-01-15T10:30:00.000Z");
    });

    it("should handle ISO date strings", () => {
      const dateString = "2025-01-15T10:30:00.000Z";
      const result = normalizeToDbIsoString(dateString);
      expect(result).toBe("2025-01-15T10:30:00.000Z");
    });

    it("should handle timestamp numbers", () => {
      const timestamp = 1737023400000; // 2025-01-16T10:30:00.000Z
      const result = normalizeToDbIsoString(timestamp);
      expect(result).toBe("2025-01-16T10:30:00.000Z");
    });

    it("should handle non-UTC date strings by converting to UTC", () => {
      const dateString = "2025-01-15T10:30:00.000+05:00";
      const result = normalizeToDbIsoString(dateString);
      // Should convert to UTC (subtract 5 hours)
      expect(result).toBe("2025-01-15T05:30:00.000Z");
    });
  });

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

  describe("nowDbIsoString", () => {
    it("should return current time as ISO string", () => {
      const before = Date.now();
      const result = nowDbIsoString();
      const after = Date.now();

      const parsed = new Date(result);
      expect(parsed.getTime()).toBeGreaterThanOrEqual(before);
      expect(parsed.getTime()).toBeLessThanOrEqual(after);
    });

    it("should return UTC format", () => {
      const result = nowDbIsoString();
      expect(result).toMatch(/Z$/);
    });

    it("should be valid ISO format", () => {
      const result = nowDbIsoString();
      expect(isValidIsoDate(result)).toBe(true);
    });
  });

  describe("toApiIsoString", () => {
    it("should handle Date objects", () => {
      const date = new Date("2025-01-15T10:30:00.000Z");
      const result = toApiIsoString(date);
      expect(result).toBe("2025-01-15T10:30:00.000Z");
    });

    it("should handle date strings from database (no timezone)", () => {
      const dateString = "2025-01-15T10:30:00.000";
      const result = toApiIsoString(dateString);
      expect(result).toBe("2025-01-15T10:30:00.000Z");
    });

    it("should handle date strings with timezone info", () => {
      const dateString = "2025-01-15T10:30:00.000Z";
      const result = toApiIsoString(dateString);
      expect(result).toBe("2025-01-15T10:30:00.000Z");
    });

    it("should consistently format dates for API responses", () => {
      const date = new Date("2025-01-15T10:30:00.000Z");
      const dateStringWithZ = "2025-01-15T10:30:00.000Z";
      const dateStringWithoutZ = "2025-01-15T10:30:00.000";

      const resultFromDate = toApiIsoString(date);
      const resultFromStringWithZ = toApiIsoString(dateStringWithZ);
      const resultFromStringWithoutZ = toApiIsoString(dateStringWithoutZ);

      expect(resultFromDate).toBe(resultFromStringWithZ);
      expect(resultFromDate).toBe(resultFromStringWithoutZ);
    });
  });

  describe("isValidIsoDate", () => {
    it("should validate correct ISO date strings", () => {
      expect(isValidIsoDate("2025-01-15T10:30:00.000Z")).toBe(true);
      expect(isValidIsoDate("2025-12-31T23:59:59.999Z")).toBe(true);
    });

    it("should reject invalid date strings", () => {
      expect(isValidIsoDate("invalid-date")).toBe(false);
      expect(isValidIsoDate("2025-13-01T10:30:00.000Z")).toBe(false);
      expect(isValidIsoDate("2025-01-32T10:30:00.000Z")).toBe(false);
      expect(isValidIsoDate("")).toBe(false);
    });

    it("should be strict about ISO format", () => {
      // These are valid dates but not strict ISO format
      expect(isValidIsoDate("2025-01-15")).toBe(false);
      expect(isValidIsoDate("Jan 15, 2025")).toBe(false);
    });
  });

  describe("Integration: Database to API Flow", () => {
    it("should handle typical D1 SQLite date without timezone", () => {
      // Simulates a date string returned from D1 SQLite CURRENT_TIMESTAMP
      const dbDate = "2025-01-15 10:30:00";

      // Parse as if from database
      const parsed = parseDbDate(dbDate);

      // Format for API response
      const apiFormatted = toApiIsoString(parsed);

      expect(apiFormatted).toBe("2025-01-15T10:30:00.000Z");
      expect(isValidIsoDate(apiFormatted)).toBe(true);
    });

    it("should handle round-trip consistency", () => {
      const originalDate = new Date("2025-01-15T10:30:00.000Z");

      // Store in database format
      const dbFormat = toDbIsoString(originalDate);

      // Parse back from database
      const parsed = parseDbDate(dbFormat);

      // Format for API
      const apiFormat = toApiIsoString(parsed);

      expect(apiFormat).toBe(originalDate.toISOString());
    });
  });
});
