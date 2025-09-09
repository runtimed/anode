/**
 * D1 SQLite-specific date utilities.
 *
 * D1 SQLite stores dates in UTC format but without timezone indicators.
 * This module handles that specific case.
 */

/**
 * Parse a date string from D1 SQLite, which stores UTC dates without timezone indicators.
 * If no timezone info is present, assumes UTC (D1's default behavior).
 */
export function parseDbDate(dateString: string): Date {
  // If no timezone info present, assume UTC (D1 sqlite default)
  if (
    !dateString.includes("Z") &&
    !dateString.includes("+") &&
    !dateString.includes("-", 10) // Check for timezone offset after position 10 (YYYY-MM-DD)
  ) {
    return new Date(dateString + "Z");
  }

  return new Date(dateString);
}

/**
 * Get current timestamp as ISO string for database operations.
 */
export function nowIsoString(): string {
  return new Date().toISOString();
}
