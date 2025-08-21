import { ulid } from "ulid";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, authedProcedure, router } from "./trpc";
import {
  getUserById,
  getUsersByIds,
  getUserByEmail,
  toPublicFacingUser,
  createFallbackUser,
  getPrivateUserById,
} from "../users/utils.ts";

interface RunbookRow {
  ulid: string;
  owner_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

// Input schemas
const CreateRunbookInput = z.object({
  title: z.string(),
});

const UpdateRunbookInput = z.object({
  title: z.string().optional(),
});

const ShareRunbookInput = z.object({
  runbookUlid: z.string(),
  userId: z.string(),
});

const UnshareRunbookInput = z.object({
  runbookUlid: z.string(),
  userId: z.string(),
});

const RunbooksArgs = z.object({
  owned: z.boolean().optional(),
  shared: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

// Create the tRPC router
export const appRouter = router({
  // Debug endpoint
  debug: publicProcedure.query(async () => {
    return "Hello, world!";
  }),

  // Context endpoint
  context: publicProcedure.query(async (opts) => {
    const { ctx } = opts;
    return ctx;
  }),

  // Get current user (private data)
  me: authedProcedure.query(async (opts) => {
    const { ctx } = opts;
    return ctx.user;
  }),

  // Get user by email (public data only)
  userByEmail: authedProcedure
    .input(z.object({ email: z.string() }))
    .query(async (opts) => {
      const { ctx, input } = opts;
      const { email } = input;

      try {
        const userRecord = await getUserByEmail(ctx.env.DB, email);
        if (userRecord) {
          return toPublicFacingUser(userRecord);
        }
        return null;
      } catch (error) {
        console.error("Failed to fetch user by email:", error);
        return null;
      }
    }),

  // Get runbooks with filtering
  runbooks: authedProcedure.input(RunbooksArgs).query(async (opts) => {
    const { ctx, input } = opts;
    const { owned, shared, limit, offset } = input;
    const {
      user,
      env: { DB },
      permissionsProvider,
    } = ctx;

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
        const allAccessible = await permissionsProvider.listAccessibleResources(
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
          await permissionsProvider.listAccessibleResources(user.id, "runbook");
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
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to fetch runbooks: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }),

  // Get single runbook
  runbook: authedProcedure
    .input(z.object({ ulid: z.string() }))
    .query(async (opts) => {
      const { ctx, input } = opts;
      const { ulid: runbookUlid } = input;
      const {
        user,
        env: { DB },
        permissionsProvider,
      } = ctx;

      try {
        const permissionResult = await permissionsProvider.checkPermission(
          user.id,
          runbookUlid
        );
        if (!permissionResult.hasAccess) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Runbook not found or access denied",
          });
        }

        const runbook = await DB.prepare(
          "SELECT * FROM runbooks WHERE ulid = ?"
        )
          .bind(runbookUlid)
          .first<RunbookRow>();

        if (!runbook) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Runbook not found",
          });
        }

        return runbook;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch runbook: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // Create runbook
  createRunbook: authedProcedure
    .input(CreateRunbookInput)
    .mutation(async (opts) => {
      const { ctx, input } = opts;
      const {
        user,
        env: { DB },
      } = ctx;

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
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create runbook",
          });
        }

        const runbook = await DB.prepare(
          "SELECT * FROM runbooks WHERE ulid = ?"
        )
          .bind(runbookUlid)
          .first<RunbookRow>();

        return runbook;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create runbook: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // Update runbook
  updateRunbook: authedProcedure
    .input(
      z.object({
        ulid: z.string(),
        input: UpdateRunbookInput,
      })
    )
    .mutation(async (opts) => {
      const { ctx, input } = opts;
      const { ulid: runbookUlid, input: updateInput } = input;
      const {
        user,
        env: { DB },
        permissionsProvider,
      } = ctx;

      try {
        const isOwner = await permissionsProvider.isOwner(user.id, runbookUlid);
        if (!isOwner) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the owner can update runbook metadata",
          });
        }

        const updates: string[] = [];
        const bindings: unknown[] = [];

        if (updateInput.title !== undefined) {
          updates.push("title = ?");
          bindings.push(updateInput.title);
        }

        if (updates.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No updates provided",
          });
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
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Runbook not found or no changes made",
          });
        }

        // Return updated runbook
        const runbook = await DB.prepare(
          "SELECT * FROM runbooks WHERE ulid = ?"
        )
          .bind(runbookUlid)
          .first<RunbookRow>();

        return runbook;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update runbook: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // Delete runbook
  deleteRunbook: authedProcedure
    .input(z.object({ ulid: z.string() }))
    .mutation(async (opts) => {
      const { ctx, input } = opts;
      const { ulid: runbookUlid } = input;
      const {
        user,
        env: { DB },
        permissionsProvider,
      } = ctx;

      try {
        // Check if user is owner
        const isOwner = await permissionsProvider.isOwner(user.id, runbookUlid);
        if (!isOwner) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the owner can delete a runbook",
          });
        }

        // Delete runbook (CASCADE will handle permissions)
        const result = await DB.prepare("DELETE FROM runbooks WHERE ulid = ?")
          .bind(runbookUlid)
          .run();

        if (result.meta.changes === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Runbook not found",
          });
        }

        return true;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete runbook: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // Share runbook
  shareRunbook: authedProcedure
    .input(ShareRunbookInput)
    .mutation(async (opts) => {
      const { ctx, input } = opts;
      const { user, permissionsProvider } = ctx;

      try {
        await permissionsProvider.grantPermission({
          runbookId: input.runbookUlid,
          userId: input.userId,
          grantedBy: user.id,
        });

        return true;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to share runbook: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // Unshare runbook
  unshareRunbook: authedProcedure
    .input(UnshareRunbookInput)
    .mutation(async (opts) => {
      const { ctx, input } = opts;
      const { user, permissionsProvider } = ctx;

      try {
        await permissionsProvider.revokePermission({
          runbookId: input.runbookUlid,
          userId: input.userId,
          revokedBy: user.id,
        });

        return true;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to unshare runbook: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // Get runbook owner
  runbookOwner: authedProcedure
    .input(z.object({ runbookUlid: z.string() }))
    .query(async (opts) => {
      const { ctx, input } = opts;
      const { runbookUlid } = input;
      const {
        env: { DB },
      } = ctx;

      try {
        const runbook = await DB.prepare(
          "SELECT owner_id FROM runbooks WHERE ulid = ?"
        )
          .bind(runbookUlid)
          .first<{ owner_id: string }>();

        if (!runbook) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Runbook not found",
          });
        }

        const userRecord = await getUserById(DB, runbook.owner_id);
        if (userRecord) {
          return toPublicFacingUser(userRecord);
        } else {
          return createFallbackUser(runbook.owner_id);
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to fetch owner:", error);
        return null;
      }
    }),

  // Get runbook collaborators
  runbookCollaborators: authedProcedure
    .input(z.object({ runbookUlid: z.string() }))
    .query(async (opts) => {
      const { ctx, input } = opts;
      const { runbookUlid } = input;
      const {
        env: { DB },
      } = ctx;

      try {
        const writers = await DB.prepare(
          `
          SELECT user_id FROM runbook_permissions
          WHERE runbook_ulid = ? AND permission = 'writer'
        `
        )
          .bind(runbookUlid)
          .all<{ user_id: string }>();

        if (writers.results.length === 0) {
          return [];
        }

        // Get user data for all writers
        const userIds = writers.results.map((w) => w.user_id);
        const userMap = await getUsersByIds(DB, userIds);

        // Convert to public User objects
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
    }),

  // Get user's permission level for a runbook
  myRunbookPermission: authedProcedure
    .input(z.object({ runbookUlid: z.string() }))
    .query(async (opts) => {
      const { ctx, input } = opts;
      const { runbookUlid } = input;
      const { user, permissionsProvider } = ctx;

      try {
        const result = await permissionsProvider.checkPermission(
          user.id,
          runbookUlid
        );
        if (!result.hasAccess) {
          return "NONE";
        }

        return result.level?.toUpperCase() || "WRITER";
      } catch (error) {
        console.error("Failed to check permission:", error);
        return "NONE";
      }
    }),

  // Legacy endpoint for backward compatibility
  notebooks: authedProcedure.query(async (opts) => {
    const { ctx } = opts;
    const {
      user,
      env: { DB },
    } = ctx;

    const query = `
      SELECT ulid, owner_id, title, created_at, updated_at
      FROM runbooks
      WHERE owner_id = ?
      ORDER BY updated_at DESC
    `;

    const result = await DB.prepare(query).bind(user.id).all<RunbookRow>();

    return result.results;
  }),

  // Legacy endpoint for backward compatibility
  user: authedProcedure.query(async (opts) => {
    const { ctx } = opts;
    const {
      user,
      env: { DB },
    } = ctx;

    console.log("🚨", { ctx });

    const userRecord = await getPrivateUserById(DB, user.id);
    return userRecord;
  }),
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
