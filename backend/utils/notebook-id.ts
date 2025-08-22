import { customAlphabet } from "nanoid";

// See: https://zelark.github.io/nano-id-cc
//

/**
 * Generates a URL-safe notebook ID with 12 characters
 * No dashes because LiveStore doesn't like them
 *
 * Store IDs probably shouldn't include "dashes", primarily because they get
 * converted to _ in SQLite table names, which then causes conflicts with
 * LiveStore in very weird ways
 */
const generateNotebookId = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_",
  12
);

/**
 * Creates a unique notebook ID that is:
 * - 12 characters long
 * - URL-safe
 */
export function createNotebookId(): string {
  return generateNotebookId();
}
