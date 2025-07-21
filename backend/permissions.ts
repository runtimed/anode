/**
 * RBAC (Role-Based Access Control) for Anode notebooks
 * 
 * Implements simple permission management with:
 * - Owner: Full access (creator of notebook)
 * - Editor: Read/write access (granted by owner)
 * - No Access: Cannot see or access notebook
 */

export interface NotebookPermission {
  notebookId: string;
  userId: string;
  role: 'owner' | 'editor';
  grantedBy: string;
  grantedAt: string;
}

export type PermissionRole = 'owner' | 'editor' | 'none';

/**
 * Initialize the permissions table in D1 database
 */
export async function initializePermissionsTable(db: D1Database): Promise<void> {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS notebook_permissions (
      notebook_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('owner', 'editor')),
      granted_by TEXT NOT NULL,
      granted_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (notebook_id, user_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_notebook_permissions_notebook 
    ON notebook_permissions(notebook_id);
    
    CREATE INDEX IF NOT EXISTS idx_notebook_permissions_user 
    ON notebook_permissions(user_id);
  `;

  await db.exec(createTableSQL);
}

/**
 * Check if a user has permission to access a notebook
 */
export async function checkNotebookPermission(
  db: D1Database,
  notebookId: string,
  userId: string
): Promise<PermissionRole> {
  try {
    const stmt = db.prepare(`
      SELECT role FROM notebook_permissions 
      WHERE notebook_id = ? AND user_id = ?
    `);
    
    const result = await stmt.bind(notebookId, userId).first<{ role: string }>();
    
    if (!result) {
      return 'none';
    }
    
    return result.role as PermissionRole;
  } catch (error) {
    console.error('Error checking notebook permission:', error);
    return 'none';
  }
}

/**
 * Grant permission to a user for a notebook
 */
export async function grantNotebookPermission(
  db: D1Database,
  notebookId: string,
  userId: string,
  role: 'owner' | 'editor',
  grantedBy: string
): Promise<boolean> {
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO notebook_permissions 
      (notebook_id, user_id, role, granted_by, granted_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);
    
    await stmt.bind(notebookId, userId, role, grantedBy).run();
    return true;
  } catch (error) {
    console.error('Error granting notebook permission:', error);
    return false;
  }
}

/**
 * Revoke permission from a user for a notebook
 */
export async function revokeNotebookPermission(
  db: D1Database,
  notebookId: string,
  userId: string
): Promise<boolean> {
  try {
    const stmt = db.prepare(`
      DELETE FROM notebook_permissions 
      WHERE notebook_id = ? AND user_id = ?
    `);
    
    await stmt.bind(notebookId, userId).run();
    return true;
  } catch (error) {
    console.error('Error revoking notebook permission:', error);
    return false;
  }
}

/**
 * Get all permissions for a notebook
 */
export async function getNotebookPermissions(
  db: D1Database,
  notebookId: string
): Promise<NotebookPermission[]> {
  try {
    const stmt = db.prepare(`
      SELECT notebook_id as notebookId, user_id as userId, role, granted_by as grantedBy, granted_at as grantedAt
      FROM notebook_permissions 
      WHERE notebook_id = ?
      ORDER BY granted_at DESC
    `);
    
    const results = await stmt.bind(notebookId).all<NotebookPermission>();
    return results.results || [];
  } catch (error) {
    console.error('Error getting notebook permissions:', error);
    return [];
  }
}

/**
 * Get all notebooks a user has access to
 */
export async function getUserNotebooks(
  db: D1Database,
  userId: string
): Promise<{ notebookId: string; role: PermissionRole }[]> {
  try {
    const stmt = db.prepare(`
      SELECT notebook_id as notebookId, role
      FROM notebook_permissions 
      WHERE user_id = ?
      ORDER BY granted_at DESC
    `);
    
    const results = await stmt.bind(userId).all<{ notebookId: string; role: PermissionRole }>();
    return results.results || [];
  } catch (error) {
    console.error('Error getting user notebooks:', error);
    return [];
  }
}

/**
 * Create a new notebook and set the creator as owner
 */
export async function createNotebookWithOwnership(
  db: D1Database,
  notebookId: string,
  creatorUserId: string
): Promise<boolean> {
  return await grantNotebookPermission(db, notebookId, creatorUserId, 'owner', creatorUserId);
}

/**
 * Check if a user is the owner of a notebook
 */
export async function isNotebookOwner(
  db: D1Database,
  notebookId: string,
  userId: string
): Promise<boolean> {
  const permission = await checkNotebookPermission(db, notebookId, userId);
  return permission === 'owner';
}

/**
 * Validate that the requesting user has permission to grant/revoke access
 * Only owners can manage permissions
 */
export async function canManagePermissions(
  db: D1Database,
  notebookId: string,
  requestingUserId: string
): Promise<boolean> {
  return await isNotebookOwner(db, notebookId, requestingUserId);
}