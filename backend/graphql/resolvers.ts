import { GraphQLError } from "graphql";
import type { ValidatedUser } from "../auth.ts";
import { ulid } from "ulid";
import type { PermissionsProvider } from "../runbook-permissions/types.ts";
import {
  getUserById,
  getUsersByIds,
  getUserByEmail,
  toPublicFacingUser,
  createFallbackUser,
} from "../users/utils.ts";
import type { Env } from "../types.ts";

export interface GraphQLContext extends Env {
  user: ValidatedUser | null;
  permissionsProvider: PermissionsProvider;
}

interface RunbookRow {
  ulid: string;
  owner_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateRunbookInput {
  title: string;
}

interface UpdateRunbookInput {
  title?: string;
}

interface ShareRunbookInput {
  runbookUlid: string;
  userId: string;
}

interface UnshareRunbookInput {
  runbookUlid: string;
  userId: string;
}

// Query arguments
interface RunbooksArgs {
  owned?: boolean;
  shared?: boolean;
  limit?: number;
  offset?: number;
}

interface RunbookArgs {
  ulid: string;
}

interface UpdateRunbookArgs {
  ulid: string;
  input: UpdateRunbookInput;
}

interface DeleteRunbookArgs {
  ulid: string;
}

export const resolvers = {
  Query: {
    async runbooks(
      _parent: unknown,
      args: RunbooksArgs,
      context: GraphQLContext
    ) {
      const { user, DB, permissionsProvider } = context;
      const { owned, shared, limit = 50, offset = 0 } = args;

      if (!user) {
        return [];
      }

      // Query permissions provider first, then D1. It would be _faster_ to
      // do it all in one query for the local provider, but we want consistency
      // with the deployed service. Instead we do this in two steps because
      // we can't JOIN across different data stores.
      //
      // Approach largely influenced by
      // [AuthZed's approach to Protecting a List Endpoint](https://authzed.com/docs/spicedb/modeling/protecting-a-list-endpoint)
      // Currently we use the LookupResources filtering approach. We may need
      // to switch to CheckBulkPermissions to filter the results in the future, or
      // AuthZed's Materialized views.

      try {
        let accessibleRunbookIds: string[];

        if (owned && !shared) {
          accessibleRunbookIds =
            await permissionsProvider.listAccessibleResources(
              user.id,
              "runbook",
              ["owner"]
            );
        } else if (shared && !owned) {
          const allAccessible =
            await permissionsProvider.listAccessibleResources(
              user.id,
              "runbook"
            );
          const ownedOnly = await permissionsProvider.listAccessibleResources(
            user.id,
            "runbook",
            ["owner"]
          );
          accessibleRunbookIds = allAccessible.filter(
            (id) => !ownedOnly.includes(id)
          );
        } else {
          // All accessible runbooks (default case and when both owned and shared are true)
          accessibleRunbookIds =
            await permissionsProvider.listAccessibleResources(
              user.id,
              "runbook"
            );
        }

        if (accessibleRunbookIds.length === 0) {
          return [];
        }

        const placeholders = accessibleRunbookIds.map(() => "?").join(",");
        const query = `
          SELECT ulid, owner_id, title, created_at, updated_at
          FROM runbooks
          WHERE ulid IN (${placeholders})
          ORDER BY updated_at DESC
          LIMIT ? OFFSET ?
        `;

        const result = await DB.prepare(query)
          .bind(...accessibleRunbookIds, limit, offset)
          .all<RunbookRow>();

        return result.results;
      } catch (error) {
        throw new GraphQLError(
          `Failed to fetch runbooks: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    },

    async runbook(
      _parent: unknown,
      args: RunbookArgs,
      context: GraphQLContext
    ) {
      const { user, DB, permissionsProvider } = context;
      const { ulid: runbookUlid } = args;

      if (!user) {
        throw new GraphQLError("Authentication required");
      }

      try {
        const permissionResult = await permissionsProvider.checkPermission(
          user.id,
          runbookUlid
        );
        if (!permissionResult.hasAccess) {
          throw new GraphQLError("Runbook not found or access denied");
        }

        const runbook = await DB.prepare(
          "SELECT * FROM runbooks WHERE ulid = ?"
        )
          .bind(runbookUlid)
          .first<RunbookRow>();

        if (!runbook) {
          throw new GraphQLError("Runbook not found");
        }

        return runbook;
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError(
          `Failed to fetch runbook: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    },

    me(_parent: unknown, _args: unknown, context: GraphQLContext) {
      if (!context.user) {
        throw new GraphQLError("Authentication required");
      }
      return context.user;
    },

    async userByEmail(
      _parent: unknown,
      args: { email: string },
      context: GraphQLContext
    ) {
      const { user, DB } = context;
      const { email } = args;

      if (!user) {
        throw new GraphQLError("Authentication required");
      }

      try {
        const userRecord = await getUserByEmail(DB, email);
        if (userRecord) {
          return toPublicFacingUser(userRecord);
        }
        return null;
      } catch (error) {
        console.error("Failed to fetch user by email:", error);
        return null;
      }
    },
  },

  Mutation: {
    async createRunbook(
      _parent: unknown,
      args: { input: CreateRunbookInput },
      context: GraphQLContext
    ) {
      const { user, DB } = context;
      const { input } = args;

      if (!user) {
        throw new GraphQLError("Authentication required");
      }

      try {
        const runbookUlid = ulid();
        const now = new Date().toISOString();

        const result = await DB.prepare(
          `
          INSERT INTO runbooks (ulid, owner_id, title, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `
        )
          .bind(runbookUlid, user.id, input.title, now, now)
          .run();

        if (!result.success) {
          throw new GraphQLError("Failed to create runbook");
        }

        const runbook = await DB.prepare(
          "SELECT * FROM runbooks WHERE ulid = ?"
        )
          .bind(runbookUlid)
          .first<RunbookRow>();

        return runbook;
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError(
          `Failed to create runbook: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    },

    async updateRunbook(
      _parent: unknown,
      args: UpdateRunbookArgs,
      context: GraphQLContext
    ) {
      const { user, DB, permissionsProvider } = context;
      const { ulid: runbookUlid, input } = args;

      if (!user) {
        throw new GraphQLError("Authentication required");
      }

      try {
        const isOwner = await permissionsProvider.isOwner(user.id, runbookUlid);
        if (!isOwner) {
          throw new GraphQLError("Only the owner can update runbook metadata");
        }

        const updates: string[] = [];
        const bindings: unknown[] = [];

        if (input.title !== undefined) {
          updates.push("title = ?");
          bindings.push(input.title);
        }

        if (updates.length === 0) {
          throw new GraphQLError("No updates provided");
        }

        updates.push("updated_at = ?");
        bindings.push(new Date().toISOString());
        bindings.push(runbookUlid);

        const result = await DB.prepare(
          `
          UPDATE runbooks
          SET ${updates.join(", ")}
          WHERE ulid = ?
        `
        )
          .bind(...bindings)
          .run();

        if (result.meta.changes === 0) {
          throw new GraphQLError("Runbook not found or no changes made");
        }

        // Return updated runbook
        const runbook = await DB.prepare(
          "SELECT * FROM runbooks WHERE ulid = ?"
        )
          .bind(runbookUlid)
          .first<RunbookRow>();

        return runbook;
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError(
          `Failed to update runbook: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    },

    async deleteRunbook(
      _parent: unknown,
      args: DeleteRunbookArgs,
      context: GraphQLContext
    ) {
      const { user, DB, permissionsProvider } = context;
      const { ulid: runbookUlid } = args;

      if (!user) {
        throw new GraphQLError("Authentication required");
      }

      try {
        // Check if user is owner
        const isOwner = await permissionsProvider.isOwner(user.id, runbookUlid);
        if (!isOwner) {
          throw new GraphQLError("Only the owner can delete a runbook");
        }

        // Delete runbook (CASCADE will handle permissions)
        const result = await DB.prepare("DELETE FROM runbooks WHERE ulid = ?")
          .bind(runbookUlid)
          .run();

        if (result.meta.changes === 0) {
          throw new GraphQLError("Runbook not found");
        }

        return true;
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError(
          `Failed to delete runbook: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    },

    async shareRunbook(
      _parent: unknown,
      args: { input: ShareRunbookInput },
      context: GraphQLContext
    ) {
      const { user, permissionsProvider } = context;
      const { input } = args;

      if (!user) {
        throw new GraphQLError("Authentication required");
      }

      try {
        await permissionsProvider.grantPermission({
          runbookId: input.runbookUlid,
          userId: input.userId,
          grantedBy: user.id,
        });

        return true;
      } catch (error) {
        throw new GraphQLError(
          `Failed to share runbook: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    },

    async unshareRunbook(
      _parent: unknown,
      args: { input: UnshareRunbookInput },
      context: GraphQLContext
    ) {
      const { user, permissionsProvider } = context;
      const { input } = args;

      if (!user) {
        throw new GraphQLError("Authentication required");
      }

      try {
        await permissionsProvider.revokePermission({
          runbookId: input.runbookUlid,
          userId: input.userId,
          revokedBy: user.id,
        });

        return true;
      } catch (error) {
        throw new GraphQLError(
          `Failed to unshare runbook: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    },
  },

  Runbook: {
    async owner(parent: RunbookRow, _args: unknown, context: GraphQLContext) {
      const { DB } = context;

      try {
        const userRecord = await getUserById(DB, parent.owner_id);
        if (userRecord) {
          return toPublicFacingUser(userRecord);
        } else {
          return createFallbackUser(parent.owner_id);
        }
      } catch (error) {
        console.error("Failed to fetch owner:", error);
        return createFallbackUser(parent.owner_id);
      }
    },

    async collaborators(
      parent: RunbookRow,
      _args: unknown,
      context: GraphQLContext
    ) {
      const { DB } = context;

      try {
        const writers = await DB.prepare(
          `
          SELECT user_id FROM runbook_permissions
          WHERE runbook_ulid = ? AND permission = 'writer'
        `
        )
          .bind(parent.ulid)
          .all<{ user_id: string }>();

        if (writers.results.length === 0) {
          return [];
        }

        // Get user data for all writers
        const userIds = writers.results.map((w) => w.user_id);
        const userMap = await getUsersByIds(DB, userIds);

        // Convert to GraphQL User objects (public data only)
        return userIds.map((userId) => {
          const userRecord = userMap.get(userId);
          if (userRecord) {
            return toPublicFacingUser(userRecord);
          } else {
            return createFallbackUser(userId);
          }
        });
      } catch (error) {
        console.error("Failed to fetch collaborators:", error);
        return [];
      }
    },

    async myPermission(
      parent: RunbookRow,
      _args: unknown,
      context: GraphQLContext
    ) {
      const { user, permissionsProvider } = context;

      if (!user) {
        return "NONE"; // No user context
      }

      try {
        const result = await permissionsProvider.checkPermission(
          user.id,
          parent.ulid
        );
        if (!result.hasAccess) {
          return "NONE"; // No access to this runbook
        }

        return result.level?.toUpperCase() || "WRITER";
      } catch (error) {
        console.error("Failed to check permission:", error);
        return "NONE"; // Permission check failed
      }
    },

    // Map database snake_case to GraphQL camelCase
    createdAt: (parent: RunbookRow) => parent.created_at,
    updatedAt: (parent: RunbookRow) => parent.updated_at,
  },

  // Public User field resolvers (no email)
  User: {
    id: (parent: any) => parent.id,
    givenName: (parent: any) => parent.givenName || null,
    familyName: (parent: any) => parent.familyName || null,
  },

  // Private User field resolvers (includes email for own profile)
  PrivateUser: {
    id: (parent: ValidatedUser) => parent.id,
    email: (parent: ValidatedUser) => parent.email,
    givenName: (parent: ValidatedUser) => parent.givenName || null,
    familyName: (parent: ValidatedUser) => parent.familyName || null,
  },
};
