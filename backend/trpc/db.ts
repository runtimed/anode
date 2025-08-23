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

  const placeholders = accessibleNotebookIds.map(() => "?").join(",");
  const query = `
          SELECT id, owner_id, title, created_at, updated_at
          FROM notebooks
          WHERE id IN (${placeholders})
          ORDER BY updated_at DESC
          LIMIT ? OFFSET ?
        `;

  const result = await DB.prepare(query)
    .bind(...accessibleNotebookIds, limit, offset)
    .all<NotebookRow>();

  return result.results;
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
