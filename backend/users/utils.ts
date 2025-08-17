import type { D1Database } from "@cloudflare/workers-types";

/**
 * Public user data safe for sharing in runbook contexts
 * Does NOT include email to prevent privacy leaks
 */
export interface PublicUserData {
  id: string;
  givenName: string | null;
  familyName: string | null;
}

/**
 * Full user record from database (includes private data)
 * Only use for own user profile, never for other users
 */
export interface PrivateUserData extends PublicUserData {
  email: string;
  first_seen_at: string;
  last_seen_at: string;
  updated_at: string;
}

/**
 * Get public user data by ID (excludes email for privacy)
 * Returns null if user not found
 */
export async function getUserById(
  db: D1Database,
  userId: string
): Promise<PublicUserData | null> {
  try {
    const user = await db
      .prepare("SELECT id, given_name, family_name FROM users WHERE id = ?")
      .bind(userId)
      .first<{
        id: string;
        given_name: string | null;
        family_name: string | null;
      }>();

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      givenName: user.given_name,
      familyName: user.family_name,
    };
  } catch (error) {
    console.error("Failed to get user by ID:", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Get multiple users by IDs (public data only)
 * Returns map of userId -> PublicUserData
 */
export async function getUsersByIds(
  db: D1Database,
  userIds: string[]
): Promise<Map<string, PublicUserData>> {
  if (userIds.length === 0) {
    return new Map();
  }

  try {
    const placeholders = userIds.map(() => "?").join(",");
    const users = await db
      .prepare(
        `SELECT id, given_name, family_name
         FROM users
         WHERE id IN (${placeholders})`
      )
      .bind(...userIds)
      .all<{
        id: string;
        given_name: string | null;
        family_name: string | null;
      }>();

    const userMap = new Map<string, PublicUserData>();
    for (const user of users.results) {
      userMap.set(user.id, {
        id: user.id,
        givenName: user.given_name,
        familyName: user.family_name,
      });
    }

    return userMap;
  } catch (error) {
    console.error("Failed to get users by IDs:", {
      userIds,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return new Map();
  }
}

/**
 * Get own user's private data (includes email)
 * Only use for current user's profile, never for others
 */
export async function getPrivateUserById(
  db: D1Database,
  userId: string
): Promise<PrivateUserData | null> {
  try {
    const user = await db
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(userId)
      .first<{
        id: string;
        email: string;
        given_name: string | null;
        family_name: string | null;
        first_seen_at: string;
        last_seen_at: string;
        updated_at: string;
      }>();

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      givenName: user.given_name,
      familyName: user.family_name,
      first_seen_at: user.first_seen_at,
      last_seen_at: user.last_seen_at,
      updated_at: user.updated_at,
    };
  } catch (error) {
    console.error("Failed to get private user by ID:", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Convert PublicUserData to GraphQL User format
 */
export function toGraphQLPublicUser(userData: PublicUserData) {
  return {
    id: userData.id,
    givenName: userData.givenName,
    familyName: userData.familyName,
    // NO email field
  };
}

/**
 * Fallback user data when user not found in registry
 * Useful for API key users who may not have been registered via OAuth
 */
export function createFallbackUser(userId: string): PublicUserData {
  return {
    id: userId,
    givenName: null,
    familyName: null,
    // NO email - maintains privacy
  };
}
