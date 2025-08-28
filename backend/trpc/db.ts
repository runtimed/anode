import type { D1Database } from "@cloudflare/workers-types";
import { NotebookPermissionRow, NotebookRow, TagRow } from "./types";
import { PermissionsProvider } from "backend/notebook-permissions/types";
import { ValidatedUser } from "backend/auth";
import {
  createFallbackUser,
  getUsersByIds,
  toPublicFacingUser,
  getUserById,
} from "backend/users/utils";
import { nanoid } from "nanoid";

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

  // Add collaborators and tags to each notebook
  const notebooksWithCollaborators = await Promise.all(
    finalResults.map(async (notebook) => ({
      ...notebook,
      collaborators: await getNotebookCollaborators(DB, notebook.id),
      tags: await getNotebookTags(DB, notebook.id),
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
  }
): Promise<boolean> {
  const { id, ownerId, title } = params;

  const result = await db
    .prepare(
      `
      INSERT INTO notebooks (id, owner_id, title)
      VALUES (?, ?, ?)
    `
    )
    .bind(id, ownerId, title)
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

// Tag-related functions

// Create a new tag
export async function createTag(
  db: D1Database,
  params: {
    name: string;
  }
): Promise<TagRow | null> {
  const { name } = params;
  const id = nanoid();
  const now = new Date().toISOString();

  try {
    const result = await db
      .prepare(
        `
        INSERT INTO tags (id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `
      )
      .bind(id, name, now, now)
      .run();

    if (result.success) {
      return {
        id,
        name,
        created_at: now,
        updated_at: now,
      };
    }
    return null;
  } catch (error) {
    // Handle unique constraint violation
    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed")
    ) {
      return null;
    }
    throw error;
  }
}

// Update tag name
export async function updateTag(
  db: D1Database,
  tagId: string,
  params: {
    name: string;
  }
): Promise<boolean> {
  const { name } = params;
  const now = new Date().toISOString();

  try {
    const result = await db
      .prepare(
        `
        UPDATE tags
        SET name = ?, updated_at = ?
        WHERE id = ?
      `
      )
      .bind(name, now, tagId)
      .run();

    return result.meta.changes > 0;
  } catch (error) {
    // Handle unique constraint violation
    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed")
    ) {
      return false;
    }
    throw error;
  }
}

// Delete tag
export async function deleteTag(
  db: D1Database,
  tagId: string
): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM tags WHERE id = ?")
    .bind(tagId)
    .run();

  return result.meta.changes > 0;
}

// Get tag by ID
export async function getTagById(
  db: D1Database,
  tagId: string
): Promise<TagRow | null> {
  const tag = await db
    .prepare("SELECT * FROM tags WHERE id = ?")
    .bind(tagId)
    .first<TagRow>();

  return tag || null;
}

// Get tag by name
export async function getTagByName(
  db: D1Database,
  name: string
): Promise<TagRow | null> {
  const tag = await db
    .prepare("SELECT * FROM tags WHERE name = ?")
    .bind(name)
    .first<TagRow>();

  return tag || null;
}

// Get all tags
export async function getAllTags(db: D1Database): Promise<TagRow[]> {
  const result = await db
    .prepare("SELECT * FROM tags ORDER BY name ASC")
    .all<TagRow>();

  return result.results;
}

// Assign tag to notebook
export async function assignTagToNotebook(
  db: D1Database,
  notebookId: string,
  tagId: string
): Promise<boolean> {
  const now = new Date().toISOString();

  try {
    const result = await db
      .prepare(
        `
        INSERT INTO notebook_tags (notebook_id, tag_id, created_at)
        VALUES (?, ?, ?)
      `
      )
      .bind(notebookId, tagId, now)
      .run();

    return result.success;
  } catch (error) {
    // Handle unique constraint violation (tag already assigned)
    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed")
    ) {
      return true; // Already assigned, consider it successful
    }
    throw error;
  }
}

// Remove tag from notebook
export async function removeTagFromNotebook(
  db: D1Database,
  notebookId: string,
  tagId: string
): Promise<boolean> {
  const result = await db
    .prepare(
      `
        DELETE FROM notebook_tags
        WHERE notebook_id = ? AND tag_id = ?
      `
    )
    .bind(notebookId, tagId)
    .run();

  return result.meta.changes > 0;
}

// Get all tags for a notebook
export async function getNotebookTags(
  db: D1Database,
  notebookId: string
): Promise<TagRow[]> {
  const query = `
    SELECT t.id, t.name, t.created_at, t.updated_at
    FROM tags t
    INNER JOIN notebook_tags nt ON t.id = nt.tag_id
    WHERE nt.notebook_id = ?
    ORDER BY t.name ASC
  `;

  const result = await db.prepare(query).bind(notebookId).all<TagRow>();

  return result.results;
}
