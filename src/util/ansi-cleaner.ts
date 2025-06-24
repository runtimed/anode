import stripAnsi from "strip-ansi";

/**
 * Cleans ANSI escape codes from text for AI context consumption
 *
 * This utility strips ANSI codes to provide clean, readable text that
 * AI models can properly parse and understand. The original ANSI codes
 * are preserved in the raw data for user display rendering.
 *
 * @param text - Raw text that may contain ANSI escape sequences
 * @returns Clean text with ANSI codes removed for AI processing
 */
export function cleanForAI(text: string): string {
  if (!text || typeof text !== "string") {
    return text;
  }

  return stripAnsi(text);
}

/**
 * Cleans ANSI codes from error traceback for AI context
 *
 * Python tracebacks often contain ANSI color codes that interfere with
 * AI model understanding. This strips codes while preserving structure.
 *
 * @param traceback - Array of traceback lines or single string
 * @returns Cleaned traceback for AI consumption
 */
export function cleanTracebackForAI(
  traceback: string[] | string | undefined
): string[] | string | undefined {
  if (!traceback) {
    return traceback;
  }

  if (Array.isArray(traceback)) {
    return traceback.map((line) => cleanForAI(line));
  }

  return cleanForAI(traceback);
}

/**
 * Legacy function - use cleanForAI instead
 * @deprecated Use cleanForAI for AI context or preserve ANSI for user display
 */
export function cleanAnsiCodes(text: string): string {
  return cleanForAI(text);
}

/**
 * Legacy function - use cleanTracebackForAI instead
 * @deprecated Use cleanTracebackForAI for AI context or preserve ANSI for user display
 */
export function cleanTraceback(
  traceback: string[] | string | undefined
): string[] | string | undefined {
  return cleanTracebackForAI(traceback);
}

/**
 * Legacy function - use cleanForAI instead
 * @deprecated Use cleanForAI for AI context or preserve ANSI for user display
 */
export function cleanStreamOutput(text: string): string {
  return cleanForAI(text);
}
