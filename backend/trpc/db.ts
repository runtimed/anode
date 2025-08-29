import type { D1Database } from "@cloudflare/workers-types";
import { NotebookPermissionRow, NotebookRow } from "./types";
import { PermissionsProvider } from "backend/notebook-permissions/types";
import { ValidatedUser } from "backend/auth";
import {
  createFallbackUser,
  getUsersByIds,
  toPublicFacingUser,
  getUserById,
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
    .all<Pick<NotebookPermissionRow, "user_id">>();

  if (writers.results.length === 0) {
    return [];
  }

  const userIds = writers.results.map((w) => w.user_id);
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

// Get single notebook by ID
export async function getNotebookById(
  db: D1Database,
  notebookId: string
): Promise<NotebookRow | null> {
  const notebook = await db
    .prepare("SELECT * FROM notebooks WHERE id = ?")
    .bind(notebookId)
    .first<NotebookRow>();

  return notebook || null;
}

// Create a new notebook
export async function createNotebook(
  db: D1Database,
  params: {
    id: string;
    ownerId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  }
): Promise<boolean> {
  const { id, ownerId, title, createdAt, updatedAt } = params;

  const result = await db
    .prepare(
      `
      INSERT INTO notebooks (id, owner_id, title, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `
    )
    .bind(id, ownerId, title, createdAt, updatedAt)
    .run();

  return result.success;
}

// Update notebook metadata
export async function updateNotebook(
  db: D1Database,
  notebookId: string,
  updates: {
    title?: string;
  }
): Promise<boolean> {
  const { title } = updates;
  const updateFields: string[] = [];
  const bindings: unknown[] = [];

  if (title !== undefined) {
    updateFields.push("title = ?");
    bindings.push(title);
  }

  updateFields.push("updated_at = datetime('now')");
  bindings.push(notebookId);

  const result = await db
    .prepare(
      `
      UPDATE notebooks
      SET ${updateFields.join(", ")}
      WHERE id = ?
    `
    )
    .bind(...bindings)
    .run();

  return result.meta.changes > 0;
}

// Delete notebook
export async function deleteNotebook(
  db: D1Database,
  notebookId: string
): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM notebooks WHERE id = ?")
    .bind(notebookId)
    .run();

  return result.meta.changes > 0;
}

// Get notebook owner ID
export async function getNotebookOwnerId(
  db: D1Database,
  notebookId: string
): Promise<string | null> {
  const notebook = await db
    .prepare("SELECT owner_id FROM notebooks WHERE id = ?")
    .bind(notebookId)
    .first<{ owner_id: string }>();

  return notebook?.owner_id || null;
}

// Get notebook owner user data
export async function getNotebookOwner(db: D1Database, notebookId: string) {
  const ownerId = await getNotebookOwnerId(db, notebookId);
  if (!ownerId) {
    return null;
  }

  const userRecord = await getUserById(db, ownerId);
  if (userRecord) {
    return toPublicFacingUser(userRecord);
  } else {
    return createFallbackUser(ownerId);
  }
}
