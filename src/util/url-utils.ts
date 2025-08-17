/**
 * Utility functions for generating URL-safe slugs and vanity URLs for runbooks
 */

/**
 * Convert a string to a URL-safe slug
 */
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      // Replace spaces and underscores with hyphens
      .replace(/[\s_]+/g, "-")
      // Remove special characters except hyphens and alphanumeric
      .replace(/[^a-z0-9-]/g, "")
      // Remove multiple consecutive hyphens
      .replace(/-+/g, "-")
      // Remove leading and trailing hyphens
      .replace(/^-+|-+$/g, "")
      // Limit length to reasonable URL size
      .substring(0, 50)
      // Remove trailing hyphen if we truncated
      .replace(/-$/, "")
  );
}

/**
 * Generate a vanity URL for a runbook
 * If title is empty or becomes empty after slugification, returns just the ulid path
 */
export function getRunbookVanityUrl(
  ulid: string,
  title?: string | null
): string {
  const basePath = `/r/${ulid}`;

  if (!title?.trim()) {
    return basePath;
  }

  const slug = slugify(title);

  if (!slug) {
    return basePath;
  }

  return `${basePath}/${slug}`;
}

/**
 * Extract ulid from a runbook path (with or without vanity name)
 * Supports: /r/{ulid}, /r/{ulid}/, /r/{ulid}/{vanity}
 */
export function extractRunbookUlid(path: string): string | null {
  const match = path.match(/^\/r\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Check if a runbook URL has the correct vanity name
 * Used to redirect to canonical URL if needed
 */
export function hasCorrectVanityUrl(
  currentPath: string,
  ulid: string,
  title?: string | null
): boolean {
  const expectedUrl = getRunbookVanityUrl(ulid, title);
  const expectedPath = expectedUrl.replace(/^\/r\/[^/]+/, ""); // Get just the vanity part
  const currentVanityPath = currentPath.replace(/^\/r\/[^/]+/, "");

  // If no title, both should be empty
  if (!title?.trim()) {
    return !currentVanityPath || currentVanityPath === "/";
  }

  // If title exists, check if vanity matches
  return (
    currentVanityPath === expectedPath ||
    currentVanityPath === `${expectedPath}/`
  );
}
