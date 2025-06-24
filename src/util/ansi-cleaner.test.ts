import { describe, expect, it } from "vitest";
import {
  cleanAnsiCodes,
  cleanForAI,
  cleanStreamOutput,
  cleanTraceback,
  cleanTracebackForAI,
} from "./ansi-cleaner.js";

describe("ANSI Cleaner Utilities", () => {
  describe("cleanForAI", () => {
    it("should remove ANSI color codes for AI context", () => {
      const input = "\u001b[31mThis is red text\u001b[0m";
      const expected = "This is red text";
      expect(cleanForAI(input)).toBe(expected);
    });

    it("should remove complex ANSI sequences for AI context", () => {
      const input =
        "\u001b[0;31mAttributeError\u001b[0m                            \u001b[0mTraceback (most recent call last)\u001b[0m";
      const expected =
        "AttributeError                            Traceback (most recent call last)";
      expect(cleanForAI(input)).toBe(expected);
    });

    it("should handle hyperlink ANSI sequences for AI context", () => {
      const input =
        "\u001b]8;;https://example.com\u0007Link Text\u001b]8;;\u0007";
      const expected = "Link Text";
      expect(cleanForAI(input)).toBe(expected);
    });

    it("should handle cursor movement codes for AI context", () => {
      const input = "\u001b[2J\u001b[H\u001b[3;1HHello World";
      const expected = "Hello World";
      expect(cleanForAI(input)).toBe(expected);
    });

    it("should preserve text without ANSI codes for AI context", () => {
      const input = "This is plain text";
      expect(cleanForAI(input)).toBe(input);
    });

    it("should handle empty or null input for AI context", () => {
      expect(cleanForAI("")).toBe("");
      expect(cleanForAI(null as any)).toBe(null);
      expect(cleanForAI(undefined as any)).toBe(undefined);
    });

    it("should handle mixed content with multiple ANSI sequences for AI context", () => {
      const input =
        "\u001b[1;32mSuccess:\u001b[0m Operation completed \u001b[31mwith warnings\u001b[0m";
      const expected = "Success: Operation completed with warnings";
      expect(cleanForAI(input)).toBe(expected);
    });
  });

  describe("cleanTracebackForAI", () => {
    it("should clean ANSI codes from traceback array for AI context", () => {
      const input = [
        "\u001b[31mTraceback (most recent call last):\u001b[0m",
        '  File "<stdin>", line 1, in <module>',
        "\u001b[38;5;241mAttributeError\u001b[0m: 'str' object has no attribute 'nonexistent'",
      ];
      const expected = [
        "Traceback (most recent call last):",
        '  File "<stdin>", line 1, in <module>',
        "AttributeError: 'str' object has no attribute 'nonexistent'",
      ];
      expect(cleanTracebackForAI(input)).toEqual(expected);
    });

    it("should clean ANSI codes from traceback string for AI context", () => {
      const input = "\u001b[31mError:\u001b[0m Something went wrong";
      const expected = "Error: Something went wrong";
      expect(cleanTracebackForAI(input)).toBe(expected);
    });

    it("should handle undefined traceback for AI context", () => {
      expect(cleanTracebackForAI(undefined)).toBe(undefined);
    });

    it("should handle empty traceback array for AI context", () => {
      expect(cleanTracebackForAI([])).toEqual([]);
    });

    it("should handle Python-style colored traceback for AI context", () => {
      const input = [
        '\u001b[0;32mIn [1]: \u001b[0m\u001b[0;34mprint\u001b[0m\u001b[0;37m(\u001b[0m\u001b[0;31m"hello"\u001b[0m\u001b[0;37m.\u001b[0m\u001b[0;32mnonexistent\u001b[0m\u001b[0;37m(\u001b[0m\u001b[0;37m)\u001b[0m\u001b[0;37m)\u001b[0m',
        "\u001b[0;31m---------------------------------------------------------------------------\u001b[0m",
        "\u001b[0;31mAttributeError\u001b[0m                            Traceback (most recent call last)",
      ];
      const expected = [
        'In [1]: print("hello".nonexistent())',
        "---------------------------------------------------------------------------",
        "AttributeError                            Traceback (most recent call last)",
      ];
      expect(cleanTracebackForAI(input)).toEqual(expected);
    });
  });

  describe("Legacy compatibility functions", () => {
    it("cleanAnsiCodes should work as alias to cleanForAI", () => {
      const input = "\u001b[31mThis is red text\u001b[0m";
      const expected = "This is red text";
      expect(cleanAnsiCodes(input)).toBe(expected);
      expect(cleanAnsiCodes(input)).toBe(cleanForAI(input));
    });

    it("cleanTraceback should work as alias to cleanTracebackForAI", () => {
      const input = ["\u001b[31mError\u001b[0m"];
      const expected = ["Error"];
      expect(cleanTraceback(input)).toEqual(expected);
      expect(cleanTraceback(input)).toEqual(cleanTracebackForAI(input));
    });

    it("cleanStreamOutput should work as alias to cleanForAI", () => {
      const input =
        "\u001b[32mProcessing...\u001b[0m\n\u001b[31mError occurred!\u001b[0m";
      const expected = "Processing...\nError occurred!";
      expect(cleanStreamOutput(input)).toBe(expected);
      expect(cleanStreamOutput(input)).toBe(cleanForAI(input));
    });
  });

  describe("Real-world examples for AI context", () => {
    it("should clean GeoPandas error for AI consumption while preserving structure", () => {
      // This simulates the kind of error shown in the user's screenshot
      const input =
        "\u001b[0;31mAttributeError\u001b[0m                            \u001b[0mTraceback (most recent call last)\u001b[0m\n\u001b[0;32mIn [1]\u001b[0m, line \u001b[0;36m6\u001b[0m\n\u001b[1;32m      3\u001b[0m \u001b[38;5;66;03m# Load a sample GeoDataFrame\u001b[39;00m\n\u001b[1;32m      5\u001b[0m \u001b[38;5;66;03m# Display the first few rows of the GeoDataFrame\u001b[39;00m\n\u001b[0;32m----> 6\u001b[0m world \u001b[38;5;241m=\u001b[39m \u001b[43mgpd\u001b[49m\u001b[38;5;241;43m.\u001b[39;49m\u001b[43mread_file\u001b[49m\u001b[43m(\u001b[49m\u001b[43mgpd\u001b[49m\u001b[38;5;241;43m.\u001b[39;49m\u001b[43mdatasets\u001b[49m\u001b[38;5;241;43m.\u001b[39;49m\u001b[43mget_path\u001b[49m\u001b[43m(\u001b[49m\u001b[38;5;124;43m'\u001b[39;49m\u001b[38;5;124;43mnaturalearth_lowres\u001b[39;49m\u001b[38;5;124;43m'\u001b[39;49m\u001b[43m)\u001b[49m\u001b[43m)\u001b[49m";

      const cleaned = cleanForAI(input);

      // Should not contain any ANSI escape sequences for AI parsing
      expect(cleaned).not.toMatch(/\u001b/);
      // Should contain readable error information for AI understanding
      expect(cleaned).toContain("AttributeError");
      expect(cleaned).toContain("Traceback (most recent call last)");
      expect(cleaned).toContain("naturalearth_lowres");
    });

    it("should clean progress bars for AI context while preserving content", () => {
      const input =
        "\u001b[2K\u001b[1G\u001b[32m████████████████████\u001b[0m \u001b[1m100%\u001b[0m Loading packages...";
      const expected = "████████████████████ 100% Loading packages...";
      expect(cleanForAI(input)).toBe(expected);
    });

    it("should clean IPython-style output for AI context", () => {
      const input =
        "\u001b[0;31mOut[\u001b[1;32m1\u001b[0;31m]:\u001b[0m \u001b[0;35m42\u001b[0m";
      const expected = "Out[1]: 42";
      expect(cleanForAI(input)).toBe(expected);
    });
  });
});
