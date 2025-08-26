import type { D1Database as DB } from "@cloudflare/workers-types";
import { NotebookRow, NotebookPermissionRow } from "./types";
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
    env: { DB: DB };
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

  if (accessibleNotebookIds.length === 0) {
    return [];
  }

  // SQLite has a limit on the number of parameters in a query (999), so chunk if needed
  // We use a chunk size of 98 to be safe (each chunk adds 2 extra parameters for LIMIT/OFFSET)
  const CHUNK_SIZE = 98;
  const notebookIdChunks: string[][] = [];
  for (let i = 0; i < accessibleNotebookIds.length; i += CHUNK_SIZE) {
    notebookIdChunks.push(accessibleNotebookIds.slice(i, i + CHUNK_SIZE));
  }

  let allResults: NotebookRow[] = [];
  let remainingLimit = limit;
  let remainingOffset = offset;

  for (const chunk of notebookIdChunks) {
    if (remainingLimit <= 0) break;

    const placeholders = chunk.map(() => "?").join(",");
    const query = `
      SELECT id, owner_id, title, created_at, updated_at
      FROM notebooks
      WHERE id IN (${placeholders})
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `;

    // Only apply offset to the first chunk, then set to 0 for subsequent chunks
    const chunkOffset = remainingOffset;
    const chunkLimit = remainingLimit;

    const result = await DB.prepare(query)
      .bind(...chunk, chunkLimit, chunkOffset)
      .all<NotebookRow>();

    allResults = allResults.concat(result.results);

    // After the first chunk, offset is 0
    remainingOffset = 0;
    // Decrease limit by the number of results fetched
    remainingLimit = limit - allResults.length;
  }

  // In case we fetched more than needed (due to chunking), slice to the requested limit
  return allResults.slice(0, limit);
}

export async function getNotebookCollaborators(db: DB, notebookId: string) {
  const query = `
    SELECT user_id FROM notebook_permissions
    WHERE notebook_id = ?
    AND permission = 'writer'
  `;

  const writers = await db
    .prepare(query)
    .bind(notebookId)
    .all<Pick<NotebookPermissionRow, "user_id">>();

  if (writers.results.length === 0) {
    return [];
  }

  const userIds = writers.results.map((w) => w.user_id);
  const userMap = await getUsersByIds(db, userIds);

  return userIds.map((userId) => {
    const userRecord = userMap.get(userId);
    if (userRecord) {
      return toPublicFacingUser(userRecord);
    } else {
      return createFallbackUser(userId);
    }
  });
}
