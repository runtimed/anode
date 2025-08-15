import { ulid } from "ulid";
import { GraphQLError } from "graphql";
import type { ValidatedUser } from "../auth.ts";
import type { PermissionsProvider } from "../permissions/types.ts";

import type { Env } from "../types.ts";

export interface GraphQLContext extends Env {
  user: ValidatedUser;
  permissionsProvider: PermissionsProvider;
}

interface RunbookRow {
  ulid: string;
  owner_id: string;
  vanity_name: string | null;
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

      // Permissions-first approach: Query permissions provider first, then D1
      // This pattern works with both local D1 permissions and remote SpiceDB
      // because we can't JOIN across different data stores

      try {
        // Step 1: Get accessible runbook IDs from permissions provider
        let accessibleRunbookIds: string[];

        if (owned && !shared) {
          // Only owned runbooks
          accessibleRunbookIds =
            await permissionsProvider.listAccessibleResources(
              user.id,
              "runbook",
              ["owner"]
            );
        } else if (shared && !owned) {
          // Only shared runbooks (not owned)
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

        // Step 2: Query D1 for those specific runbooks
        const placeholders = accessibleRunbookIds.map(() => "?").join(",");
        const query = `
          SELECT ulid, owner_id, vanity_name, title, created_at, updated_at
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

      try {
        // Check if user has access to this runbook
        const permissionResult = await permissionsProvider.checkPermission(
          user.id,
          runbookUlid
        );
        if (!permissionResult.hasAccess) {
          throw new GraphQLError("Runbook not found or access denied");
        }

        // Fetch runbook data
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
      return context.user;
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

        // Return the created runbook
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

      try {
        // Check if user is owner (only owners can update metadata)
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

  // Field resolvers for Runbook type
  Runbook: {
    async owner(parent: RunbookRow, _args: unknown, _context: GraphQLContext) {
      // For now, we'll construct a minimal user object from the owner_id
      // In the future, this could query a users table or external service
      return {
        id: parent.owner_id,
        email: `${parent.owner_id}@example.com`, // Placeholder
        name: `User ${parent.owner_id}`, // Placeholder
      };
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

        // Convert to User objects (placeholder implementation)
        return writers.results.map((writer) => ({
          id: writer.user_id,
          email: `${writer.user_id}@example.com`, // Placeholder
          name: `User ${writer.user_id}`, // Placeholder
        }));
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

      try {
        const result = await permissionsProvider.checkPermission(
          user.id,
          parent.ulid
        );
        if (!result.hasAccess) {
          throw new GraphQLError("Access denied");
        }

        return result.level?.toUpperCase() || "WRITER";
      } catch (error) {
        console.error("Failed to check permission:", error);
        return "WRITER"; // Safe fallback
      }
    },

    // Map database snake_case to GraphQL camelCase
    createdAt: (parent: RunbookRow) => parent.created_at,
    updatedAt: (parent: RunbookRow) => parent.updated_at,
  },

  // User field resolvers
  User: {
    id: (parent: ValidatedUser) => parent.id,
    email: (parent: ValidatedUser) => parent.email,
    name: (parent: ValidatedUser) => parent.name || null,
    givenName: (parent: ValidatedUser) => parent.givenName || null,
    familyName: (parent: ValidatedUser) => parent.familyName || null,
  },
};
