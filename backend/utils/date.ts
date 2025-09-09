/**
 * Backend date utilities for standardized ISO format handling.
 *
 * D1 SQLite stores dates in UTC by default. This module ensures consistent
 * date formatting for database operations and API responses.
 */

/**
 * Convert a Date to ISO string format for database storage.
 * Always returns UTC timestamp ending with 'Z'.
 */
export function toDbIsoString(date: Date): string {
  return date.toISOString();
}

/**
 * Convert a date-like input to ISO string for database storage.
 * Handles Date objects, ISO strings, and timestamps.
 */
export function normalizeToDbIsoString(date: Date | string | number): string {
  if (typeof date === "string") {
    return new Date(date).toISOString();
  }
  if (typeof date === "number") {
    return new Date(date).toISOString();
  }
  return date.toISOString();
}

/**
 * Parse a date string from the database, ensuring it's treated as UTC.
 * D1 SQLite stores dates without timezone info but assumes UTC.
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
 * Get current timestamp as ISO string for database insertion.
 */
export function nowDbIsoString(): string {
  return new Date().toISOString();
}

/**
 * Format a date for API response, ensuring consistent ISO format.
 */
export function toApiIsoString(date: Date | string): string {
  if (typeof date === "string") {
    return parseDbDate(date).toISOString();
  }
  return date.toISOString();
}

/**
 * Validate if a string is a valid ISO date format.
 */
export function isValidIsoDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.toISOString() === dateString;
}
