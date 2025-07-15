// Color palette for avatar generation
export const AVATAR_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E9",
  "#F8C471",
  "#82E0AA",
  "#F1948A",
  "#85C1E9",
  "#D7BDE2",
];

/**
 * Generate initials from string
 * - If the string is a single character, return it
 * - If the string is a single word, return the first two characters
 * - If the string is a multi-word string, return the first character of each word
 */
export function generateInitials(str: string): string {
  if (!str || str.length < 1) return "?";

  if (str.length === 1) {
    return str.charAt(0).toUpperCase();
  }

  const names = str.split(" ");

  if (names.length === 1) {
    return names[0].substring(0, 2).toUpperCase();
  }
  return names[0].charAt(0).toUpperCase() + names[1].charAt(0).toUpperCase();
}

/**
 * Simple hash function for consistent color/pattern generation
 */
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

/**
 * Generate a consistent color from userId
 */
export function generateColor(userId: string): string {
  if (!userId) return AVATAR_COLORS[0];

  const hash = hashUserId(userId);
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}
