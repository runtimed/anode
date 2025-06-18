import stripAnsi from 'strip-ansi';

/**
 * Cleans ANSI escape codes from text output for display
 *
 * This utility handles the messy terminal output that comes from Python execution,
 * stripping color codes, cursor movement, and other ANSI sequences to provide
 * clean, readable text for the UI.
 *
 * @param text - Raw text that may contain ANSI escape sequences
 * @returns Clean text with ANSI codes removed
 */
export function cleanAnsiCodes(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  return stripAnsi(text);
}

/**
 * Cleans ANSI codes from error traceback arrays
 *
 * Python tracebacks often contain ANSI color codes that make them hard to read
 * in a web interface. This function cleans each line of the traceback.
 *
 * @param traceback - Array of traceback lines or single string
 * @returns Cleaned traceback
 */
export function cleanTraceback(traceback: string[] | string | undefined): string[] | string | undefined {
  if (!traceback) {
    return traceback;
  }

  if (Array.isArray(traceback)) {
    return traceback.map(line => cleanAnsiCodes(line));
  }

  return cleanAnsiCodes(traceback);
}

/**
 * Cleans ANSI codes from stream output data
 *
 * This handles stdout/stderr output that may contain terminal formatting
 *
 * @param text - Stream text that may contain ANSI codes
 * @returns Clean stream text
 */
export function cleanStreamOutput(text: string): string {
  return cleanAnsiCodes(text);
}
