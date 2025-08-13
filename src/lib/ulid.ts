import { ulid } from 'ulid'

/**
 * Generate a new ULID (Universally Unique Lexicographically Sortable Identifier)
 */
export function generateUlid(): string {
  return ulid()
}

/**
 * Validate if a string is a valid ULID format
 */
export function isValidUlid(id: string): boolean {
  return /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/.test(id)
}

/**
 * Create a URL-friendly vanity string from a title
 */
export function createVanityUrl(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-')          // Collapse multiple hyphens
    .replace(/^-+|-+$/g, '')      // Remove leading/trailing hyphens
    .slice(0, 50) || 'interaction-log' // Limit length, fallback if empty
}

/**
 * Create a full interaction log URL from ULID and title
 */
export function createInteractionLogUrl(ulid: string, title: string): string {
  const vanityUrl = createVanityUrl(title)
  return `/i/${ulid}/${vanityUrl}`
}

/**
 * Parse interaction log URL to extract ULID and vanity URL
 */
export function parseInteractionLogUrl(pathname: string): { ulid: string; vanityUrl: string } | null {
  const match = pathname.match(/^\/i\/([0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26})\/(.+)$/)
  if (!match) return null

  return {
    ulid: match[1],
    vanityUrl: match[2]
  }
}

/**
 * Extract timestamp from ULID (first 48 bits encode milliseconds since Unix epoch)
 */
export function getUlidTimestamp(ulid: string): Date {
  if (!isValidUlid(ulid)) {
    throw new Error('Invalid ULID format')
  }

  // ULID uses Crockford's Base32 encoding
  // First 10 characters represent 48-bit timestamp
  const timeChars = ulid.slice(0, 10)
  const crockfordBase32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

  let timestamp = 0
  for (let i = 0; i < timeChars.length; i++) {
    const charIndex = crockfordBase32.indexOf(timeChars[i])
    timestamp = timestamp * 32 + charIndex
  }

  return new Date(timestamp)
}
