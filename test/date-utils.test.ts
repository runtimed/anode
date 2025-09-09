import { describe, it, expect, beforeAll } from "vitest";
import { parseISO } from "date-fns";

beforeAll(() => {
  console.log("🧪 Starting Anode date handling test suite...");
});

describe("Date Handling Integration", () => {
  describe("SQLite ISO String Formatting", () => {
    it("should handle properly formatted ISO strings from SQLite", () => {
      // This simulates what SQLite strftime('%Y-%m-%dT%H:%M:%SZ') returns
      const sqliteFormattedDate = "2025-01-15T10:30:00Z";
      const parsed = parseISO(sqliteFormattedDate);

      expect(parsed).toBeInstanceOf(Date);
      expect(isNaN(parsed.getTime())).toBe(false);
      expect(parsed.toISOString()).toBe("2025-01-15T10:30:00.000Z");
    });

    it("should handle various ISO string formats that might come from API", () => {
      const testCases = [
        "2025-01-15T10:30:00Z",
        "2025-01-15T10:30:00.000Z",
        "2025-01-15T10:30:00.123Z",
        "2025-12-31T23:59:59Z",
      ];

      testCases.forEach((dateString) => {
        const parsed = parseISO(dateString);
        expect(parsed).toBeInstanceOf(Date);
        expect(isNaN(parsed.getTime())).toBe(false);
      });
    });
  });

  describe("Frontend Date Parsing", () => {
    it("should successfully parse ISO strings with parseISO", () => {
      const isoString = "2025-01-15T10:30:00.000Z";
      const parsed = parseISO(isoString);

      expect(parsed.getUTCFullYear()).toBe(2025);
      expect(parsed.getUTCMonth()).toBe(0); // January is 0
      expect(parsed.getUTCDate()).toBe(15);
      expect(parsed.getUTCHours()).toBe(10);
      expect(parsed.getUTCMinutes()).toBe(30);
    });

    it("should handle edge cases gracefully", () => {
      const edgeCases = [
        "2025-01-01T00:00:00Z", // Start of year
        "2025-12-31T23:59:59Z", // End of year
        "2025-02-28T12:00:00Z", // Non-leap year Feb 28
        "2024-02-29T12:00:00Z", // Leap year Feb 29
      ];

      edgeCases.forEach((dateString) => {
        const parsed = parseISO(dateString);
        expect(parsed).toBeInstanceOf(Date);
        expect(isNaN(parsed.getTime())).toBe(false);
      });
    });
  });

  describe("Date Consistency", () => {
    it("should maintain consistency between Date objects and ISO strings", () => {
      const originalDate = new Date("2025-01-15T10:30:00.000Z");
      const isoString = originalDate.toISOString();
      const reparsed = parseISO(isoString);

      expect(reparsed.getTime()).toBe(originalDate.getTime());
    });

    it("should handle the format SQLite strftime produces", () => {
      // SQLite strftime('%Y-%m-%dT%H:%M:%SZ') format
      const sqliteFormat = "2025-01-15T10:30:00Z";
      const parsed = parseISO(sqliteFormat);

      // Should parse without milliseconds and still work
      expect(parsed.toISOString()).toBe("2025-01-15T10:30:00.000Z");
    });
  });

  describe("Current Timestamp Generation", () => {
    it("should generate valid ISO timestamp for database storage", () => {
      const now = new Date().toISOString();

      expect(now).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      // Should be parseable
      const parsed = parseISO(now);
      expect(isNaN(parsed.getTime())).toBe(false);
    });

    it("should generate timestamps that are very close to current time", () => {
      const before = Date.now();
      const isoNow = new Date().toISOString();
      const after = Date.now();

      const timestamp = parseISO(isoNow).getTime();

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });
});
