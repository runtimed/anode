import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  console.log("🧪 Starting DateDisplay parsing test suite...");
});

// Extract the parsing function from DateDisplay for testing
function parseStringToDate(dateString: string): Date {
  // If no timezone info present, assume UTC (D1 sqlite default)
  if (
    !dateString.includes("Z") &&
    !dateString.includes("+") &&
    !dateString.includes("-", 10)
  ) {
    try {
      const utcDate = new Date(dateString + "Z");
      if (!isNaN(utcDate.getTime())) {
        return utcDate;
      }
    } catch {
      // Continue to final fallback
    }
  }

  // Final fallback - parse as-is
  return new Date(dateString);
}

describe("DateDisplay Parsing", () => {
  describe("parseStringToDate", () => {
    it("should parse valid ISO strings with Z timezone", () => {
      const dateString = "2025-01-15T10:30:00.000Z";
      const result = parseStringToDate(dateString);
      expect(result.toISOString()).toBe("2025-01-15T10:30:00.000Z");
      expect(isNaN(result.getTime())).toBe(false);
    });

    it("should parse valid ISO strings without timezone by assuming UTC", () => {
      const dateString = "2025-01-15T10:30:00.000";
      const result = parseStringToDate(dateString);
      expect(result.toISOString()).toBe("2025-01-15T10:30:00.000Z");
      expect(isNaN(result.getTime())).toBe(false);
    });

    it("should parse ISO strings with timezone offsets", () => {
      const dateString = "2025-01-15T10:30:00.000+02:00";
      const result = parseStringToDate(dateString);
      expect(result.toISOString()).toBe("2025-01-15T08:30:00.000Z");
      expect(isNaN(result.getTime())).toBe(false);
    });

    it("should handle D1 SQLite datetime format", () => {
      const dateString = "2025-01-15 10:30:00";
      const result = parseStringToDate(dateString);
      expect(result.toISOString()).toBe("2025-01-15T10:30:00.000Z");
      expect(isNaN(result.getTime())).toBe(false);
    });

    it("should not break with invalid date strings", () => {
      const invalidDates = [
        "invalid-date",
        "",
        "2025-13-01T10:30:00.000Z",
        "not-a-date-at-all",
        "2025-01-32T10:30:00.000Z",
      ];

      invalidDates.forEach((dateString) => {
        const result = parseStringToDate(dateString);
        // Should return a Date object, even if invalid
        expect(result).toBeInstanceOf(Date);
        // But the time should be NaN for invalid dates
        expect(isNaN(result.getTime())).toBe(true);
      });
    });

    it("should handle edge case that caused the original RangeError", () => {
      // Test the specific pattern that was causing issues
      const problematicDates = [
        "2025-01-15T10:30:00.000 Z", // Extra space before Z
        "2025-01-15T10:30:00.000ZZ", // Double Z
        "2025-01-15T10:30:00.000Z Z", // Z with space and another Z
      ];

      problematicDates.forEach((dateString) => {
        const result = parseStringToDate(dateString);
        expect(result).toBeInstanceOf(Date);
        // These should result in invalid dates, but not throw errors
        expect(isNaN(result.getTime())).toBe(true);
      });
    });

    it("should preserve timezone information when present", () => {
      const dateWithOffset = "2025-01-15T10:30:00.000-05:00";
      const result = parseStringToDate(dateWithOffset);
      expect(result.toISOString()).toBe("2025-01-15T15:30:00.000Z");
      expect(isNaN(result.getTime())).toBe(false);
    });

    it("should handle different ISO format variations", () => {
      const variations = [
        "2025-01-15T10:30:00Z",
        "2025-01-15T10:30:00.000Z",
        "2025-01-15T10:30:00.123Z",
        "2025-01-15T10:30:00.123456Z",
      ];

      variations.forEach((dateString) => {
        const result = parseStringToDate(dateString);
        expect(result).toBeInstanceOf(Date);
        expect(isNaN(result.getTime())).toBe(false);
      });
    });
  });

  describe("Error Prevention", () => {
    it("should never throw RangeError for any string input", () => {
      const testCases = [
        "2025-01-15T10:30:00.000Z",
        "2025-01-15T10:30:00.000",
        "invalid",
        "",
        "2025-01-15T10:30:00.000 Z", // This was causing the original error
        null as any, // Type coercion test
        undefined as any, // Type coercion test
        123 as any, // Type coercion test
      ];

      testCases.forEach((testCase) => {
        expect(() => {
          const result = parseStringToDate(String(testCase));
          // Verify it returns a Date object
          expect(result).toBeInstanceOf(Date);
        }).not.toThrow();
      });
    });
  });
});
