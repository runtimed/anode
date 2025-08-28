import type { D1Database } from "@cloudflare/workers-types";
import { NotebookRow } from "./types";
import { PermissionsProvider } from "backend/notebook-permissions/types";
import { ValidatedUser } from "backend/auth";
import {
  createFallbackUser,
  getUsersByIds,
  toPublicFacingUser,
} from "backend/users/utils";

export async function getNotebooks(
  ctx: {
    user: ValidatedUser;
    env: { DB: D1Database };
    permissionsProvider: PermissionsProvider;
  },
  options: {
    owned?: boolean;
    shared?: boolean;
    limit: number;
    offset: number;
  }
) {
  const { owned, shared, limit, offset } = options;
  const {
    user,
    env: { DB },
    permissionsProvider,
  } = ctx;

  let accessibleNotebookIds: string[];

  if (owned && !shared) {
    accessibleNotebookIds = await permissionsProvider.listAccessibleResources(
      user.id,
      "notebook",
      ["owner"]
    );
  } else if (shared && !owned) {
    const allAccessible = await permissionsProvider.listAccessibleResources(
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
    accessibleNotebookIds = await permissionsProvider.listAccessibleResources(
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
}

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
