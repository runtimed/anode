import type { D1Database } from "@cloudflare/workers-types";
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
import { createNotebookId } from "../utils/notebook-id.ts";
import { NotebookPermission, NotebookRow } from "./types.ts";

// Helper function to get notebook collaborators
async function getNotebookCollaborators(db: D1Database, notebookId: string) {
  const query = `
    SELECT user_id FROM notebook_permissions
    WHERE notebook_id = ?
    AND permission = 'writer'
  `;

  const writers = await db
    .prepare(query)
    .bind(notebookId)
    .all<{ user_id: string }>();

  if (writers.results.length === 0) {
    return [];
  }

  const userIds = writers.results.map((w: { user_id: string }) => w.user_id);
  const userMap = await getUsersByIds(db, userIds);

  return userIds.map((userId: string) => {
    const userRecord = userMap.get(userId);
    if (userRecord) {
      return toPublicFacingUser(userRecord);
    } else {
      return createFallbackUser(userId);
    }
  });
}

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

  // Get notebooks with filtering
  notebooks: authedProcedure
    .input(
      z.object({
        owned: z.boolean().optional(),
        shared: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(5000),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async (opts) => {
      const { ctx, input } = opts;
      const { owned, shared, limit, offset } = input;
      const {
        user,
        env: { DB },
        permissionsProvider,
      } = ctx;

      try {
        let accessibleNotebookIds: string[];

        if (owned && !shared) {
          accessibleNotebookIds =
            await permissionsProvider.listAccessibleResources(
              user.id,
              "notebook",
              ["owner"]
            );
        } else if (shared && !owned) {
          const allAccessible =
            await permissionsProvider.listAccessibleResources(
              user.id,
              "notebook"
            );
          const ownedOnly = await permissionsProvider.listAccessibleResources(
            user.id,
            "notebook",
            ["owner"]
          );
          accessibleNotebookIds = allAccessible.filter(
            (id) => !ownedOnly.includes(id)
          );
        } else {
          // All accessible notebooks (default case and when both owned and shared are true)
          accessibleNotebookIds =
            await permissionsProvider.listAccessibleResources(
              user.id,
              "notebook"
            );
        }

        // Try efficient single-query approach first (works for local provider)
        if (permissionsProvider.fetchAccessibleResourcesWithData) {
          const efficientResult =
            await permissionsProvider.fetchAccessibleResourcesWithData(
              user.id,
              "notebook",
              { owned, shared, limit, offset }
            );

          if (efficientResult !== null) {
            return efficientResult;
          }
        }

        // Fall back to two-step approach for external providers
        if (accessibleNotebookIds.length === 0) {
          return [];
        }

        // Use chunked queries to avoid SQL parameter limits
        // SQLite has a limit around 999 parameters. Using 900 is well under the limit
        // and more efficient than smaller chunks like 100.
        const CHUNK_SIZE = 900;
        const allResults: NotebookRow[] = [];

        for (let i = 0; i < accessibleNotebookIds.length; i += CHUNK_SIZE) {
          const chunk = accessibleNotebookIds.slice(i, i + CHUNK_SIZE);
          const placeholders = chunk.map(() => "?").join(",");
          const query = `
            SELECT id, owner_id, title, created_at, updated_at
            FROM notebooks
            WHERE id IN (${placeholders})
            ORDER BY updated_at DESC
          `;

          const result = await DB.prepare(query)
            .bind(...chunk)
            .all<NotebookRow>();

          allResults.push(...result.results);
        }

        // Sort all results by updated_at DESC and apply pagination
        allResults.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );

        const finalResults = allResults.slice(offset, offset + limit);

        // Add collaborators to each notebook
        const notebooksWithCollaborators = await Promise.all(
          finalResults.map(async (notebook) => ({
            ...notebook,
            collaborators: await getNotebookCollaborators(DB, notebook.id),
          }))
        );

        return notebooksWithCollaborators;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch notebooks: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // Get single notebook
  notebook: authedProcedure
    .input(z.object({ id: z.string() }))
    .query(async (opts) => {
      const { ctx, input } = opts;
      const { id: nbId } = input;
      const {
        user,
        env: { DB },
        permissionsProvider,
      } = ctx;

      try {
        const permissionResult = await permissionsProvider.checkPermission(
          user.id,
          nbId
        );
        if (!permissionResult.hasAccess) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Notebook not found or access denied",
          });
        }

        const notebook = await DB.prepare(
          "SELECT * FROM notebooks WHERE id = ?"
        )
          .bind(nbId)
          .first<NotebookRow>();

        if (!notebook) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Notebook not found",
          });
        }

        return notebook;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch notebook: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // Create notebook
  createNotebook: authedProcedure
    .input(
      z.object({
        title: z.string(),
      })
    )
    .mutation(async (opts) => {
      const { ctx, input } = opts;
      const {
        user,
        env: { DB },
      } = ctx;

      try {
        const nbId = createNotebookId();
        const now = new Date().toISOString();

        const result = await DB.prepare(
          `
          INSERT INTO notebooks (id, owner_id, title, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `
        )
          .bind(nbId, user.id, input.title, now, now)
          .run();

        if (!result.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create notebook",
          });
        }

        const notebook = await DB.prepare(
          "SELECT * FROM notebooks WHERE id = ?"
        )
          .bind(nbId)
          .first<NotebookRow>();

        return notebook;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create notebook: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // Update notebook
  updateNotebook: authedProcedure
    .input(
      z.object({
        id: z.string(),
        input: z.object({
          title: z.string().optional(),
        }),
      })
    )
    .mutation(async (opts) => {
      const { ctx, input } = opts;
      const { id: nbId, input: updateInput } = input;
      const {
        user,
        env: { DB },
        permissionsProvider,
      } = ctx;

      try {
        const isOwner = await permissionsProvider.isOwner(user.id, nbId);
        if (!isOwner) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the owner can update notebook metadata",
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
        bindings.push(nbId);

        const result = await DB.prepare(
          `
          UPDATE notebooks
          SET ${updates.join(", ")}
          WHERE id = ?
        `
        )
          .bind(...bindings)
          .run();

        if (result.meta.changes === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Notebook not found or no changes made",
          });
        }

        // Return updated notebook
        const notebook = await DB.prepare(
          "SELECT * FROM notebooks WHERE id = ?"
        )
          .bind(nbId)
          .first<NotebookRow>();

        return notebook;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update notebook: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // Delete notebook
  deleteNotebook: authedProcedure
    .input(z.object({ nbId: z.string() }))
    .mutation(async (opts) => {
      const { ctx, input } = opts;
      const { nbId } = input;
      const {
        user,
        env: { DB },
        permissionsProvider,
      } = ctx;

      try {
        // Check if user is owner
        const isOwner = await permissionsProvider.isOwner(user.id, nbId);
        if (!isOwner) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the owner can delete a notebook",
          });
        }

        // Delete notebook (CASCADE will handle permissions)
        const result = await DB.prepare("DELETE FROM notebooks WHERE id = ?")
          .bind(nbId)
          .run();

        if (result.meta.changes === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Notebook not found",
          });
        }

        return true;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete notebook: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // Share notebook
  shareNotebook: authedProcedure
    .input(
      z.object({
        nbId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async (opts) => {
      const { ctx, input } = opts;
      const { user, permissionsProvider } = ctx;

      try {
        await permissionsProvider.grantPermission({
          notebookId: input.nbId,
          userId: input.userId,
          grantedBy: user.id,
        });

        return true;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to share notebook: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // Unshare notebook
  unshareNotebook: authedProcedure
    .input(
      z.object({
        nbId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async (opts) => {
      const { ctx, input } = opts;
      const { user, permissionsProvider } = ctx;

      try {
        await permissionsProvider.revokePermission({
          notebookId: input.nbId,
          userId: input.userId,
          revokedBy: user.id,
        });

        return true;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to unshare notebook: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // Get notebook owner
  notebookOwner: authedProcedure
    .input(z.object({ nbId: z.string() }))
    .query(async (opts) => {
      const { ctx, input } = opts;
      const { nbId } = input;
      const {
        env: { DB },
      } = ctx;

      try {
        const notebook = await DB.prepare(
          "SELECT owner_id FROM notebooks WHERE id = ?"
        )
          .bind(nbId)
          .first<{ owner_id: string }>();

        if (!notebook) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Notebook not found",
          });
        }

        const userRecord = await getUserById(DB, notebook.owner_id);
        if (userRecord) {
          return toPublicFacingUser(userRecord);
        } else {
          return createFallbackUser(notebook.owner_id);
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to fetch owner:", error);
        return null;
      }
    }),

  // Get notebook collaborators
  notebookCollaborators: authedProcedure
    .input(z.object({ nbId: z.string() }))
    .query(async (opts) => {
      const { ctx, input } = opts;
      const { nbId } = input;
      const {
        env: { DB },
        permissionsProvider,
      } = ctx;

      try {
        // Use the permissions provider to list all users with "writer" permission for this notebook
        const writers = (
          await permissionsProvider.listPermissions(nbId)
        ).filter((u) => u.level === "writer");

        if (writers.length === 0) {
          return [];
        }

        const userIds = writers.map((w) => w.userId);

        // Get user data for all writers
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

  // Get user's permission level for a notebook
  myNotebookPermission: authedProcedure
    .input(z.object({ nbId: z.string() }))
    .query(async (opts): Promise<NotebookPermission> => {
      const { ctx, input } = opts;
      const { nbId } = input;
      const { user, permissionsProvider } = ctx;

      try {
        const result = await permissionsProvider.checkPermission(user.id, nbId);
        if (!result.hasAccess) return "NONE";
        if (!result.level) return "NONE";
        return result.level?.toUpperCase() as Uppercase<typeof result.level>;
      } catch (error) {
        console.error("Failed to check permission:", error);
        return "NONE";
      }
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
