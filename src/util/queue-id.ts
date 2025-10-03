/**
 * Generates a unique queue ID for an execution request
 */
export function generateQueueId() {
  // Date should prevent most of the collisions, but not as reliable when making bulk requests
  // 6 char length + alphabet of 36 chars = 6K IDs to have 1% chance of collision
  // See: https://zelark.github.io/nano-id-cc/
  return `exec-${Date.now()}-${Math.random().toString(36).slice(6)}`;
}
