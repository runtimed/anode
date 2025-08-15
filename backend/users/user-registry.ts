import type { D1Database } from "@cloudflare/workers-types";
import type { ValidatedUser } from "../auth.ts";

export interface UserRecord {
  id: string;
  email: string;
  username?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  first_seen_at: string;
  last_seen_at: string;
  updated_at: string;
}

export interface UserRegistryOptions {
  updateLastSeen?: boolean;
}

/**
 * User registry for managing user records in D1
 * Handles upserting users from OAuth tokens and looking up user info
 */
export class UserRegistry {
  constructor(private db: D1Database) {}

  /**
   * Upsert a user record from authentication data
   * Updates existing users or creates new ones
   */
  async upsertUser(
    user: ValidatedUser,
    options: UserRegistryOptions = { updateLastSeen: true }
  ): Promise<void> {
    if (user.isAnonymous) {
      // Don't store anonymous users
      return;
    }

    try {
      const now = new Date().toISOString();

      // Check if user exists
      const existing = await this.db
        .prepare("SELECT id, first_seen_at FROM users WHERE id = ?")
        .bind(user.id)
        .first<{ id: string; first_seen_at: string }>();

      if (existing) {
        // Update existing user
        const updates: string[] = [];
        const bindings: unknown[] = [];

        // Always update email (in case it changed)
        updates.push("email = ?");
        bindings.push(user.email);

        if (user.name) {
          updates.push("name = ?");
          bindings.push(user.name);
        }

        if (user.givenName) {
          updates.push("given_name = ?");
          bindings.push(user.givenName);
        }

        if (user.familyName) {
          updates.push("family_name = ?");
          bindings.push(user.familyName);
        }

        if (options.updateLastSeen) {
          updates.push("last_seen_at = ?");
          bindings.push(now);
        }

        updates.push("updated_at = ?");
        bindings.push(now);

        bindings.push(user.id);

        await this.db
          .prepare(`
            UPDATE users
            SET ${updates.join(", ")}
            WHERE id = ?
          `)
          .bind(...bindings)
          .run();
      } else {
        // Create new user
        await this.db
          .prepare(`
            INSERT INTO users (
              id, email, name, given_name, family_name,
              first_seen_at, last_seen_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(
            user.id,
            user.email,
            user.name || null,
            user.givenName || null,
            user.familyName || null,
            now,
            now,
            now
          )
          .run();
      }
    } catch (error) {
      console.error("Failed to upsert user:", {
        userId: user.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      // Don't throw - authentication should still succeed even if user registry fails
    }
  }

  /**
   * Get user record by ID
   * Returns null if user not found
   */
  async getUserById(userId: string): Promise<UserRecord | null> {
    try {
      const user = await this.db
        .prepare("SELECT * FROM users WHERE id = ?")
        .bind(userId)
        .first<UserRecord>();

      return user || null;
    } catch (error) {
      console.error("Failed to get user by ID:", {
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }
  }

  /**
   * Get multiple users by IDs
   * Returns map of userId -> UserRecord
   */
  async getUsersByIds(userIds: string[]): Promise<Map<string, UserRecord>> {
    if (userIds.length === 0) {
      return new Map();
    }

    try {
      const placeholders = userIds.map(() => "?").join(",");
      const users = await this.db
        .prepare(`SELECT * FROM users WHERE id IN (${placeholders})`)
        .bind(...userIds)
        .all<UserRecord>();

      const userMap = new Map<string, UserRecord>();
      for (const user of users.results) {
        userMap.set(user.id, user);
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
   * Convert UserRecord to GraphQL User format
   */
  static toGraphQLUser(userRecord: UserRecord) {
    return {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name || null,
      givenName: userRecord.given_name || null,
      familyName: userRecord.family_name || null,
    };
  }

  /**
   * Fallback user data when user not found in registry
   * Useful for API key users who may not have been registered via OAuth
   */
  static createFallbackUser(userId: string) {
    return {
      id: userId,
      email: `${userId}@unknown.user`, // Clearly indicates missing data
      name: null,
      givenName: null,
      familyName: null,
    };
  }
}
