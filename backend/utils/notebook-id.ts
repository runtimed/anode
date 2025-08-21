import { customAlphabet } from "nanoid";

// See: https://zelark.github.io/nano-id-cc
//

/**
 * Generates a URL-safe notebook ID with 12 characters
 */
const generateNotebookId = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-",
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
