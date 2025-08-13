interface InteractionLog {
  id: string
  title: string
  vanityUrl: string
  createdBy: string
  createdAt: number
  updatedAt: number
}

interface LogPermission {
  id: string
  logId: string
  userId: string
  permission: 'owner' | 'writer'
  grantedBy: string
  grantedAt: number
}

interface PermissionCheckRequest {
  logId: string
  userId: string
  requiredPermission?: 'owner' | 'writer'
}

interface PermissionCheckResponse {
  allowed: boolean
  permission?: 'owner' | 'writer'
  reason?: string
}

interface CreateLogRequest {
  id: string
  title: string
  vanityUrl: string
  createdBy: string
}

interface LogSummary {
  ulid: string
  title: string
  vanityUrl: string
  permission: 'owner' | 'writer'
  createdAt: number
  updatedAt: number
}

export class PermissionsService {
  constructor(private db: D1Database) {}

  async checkPermission(logId: string, userId: string, required?: 'owner' | 'writer'): Promise<PermissionCheckResponse> {
    // First check if the log exists
    const log = await this.db
      .prepare('SELECT * FROM interaction_logs WHERE id = ?')
      .bind(logId)
      .first<InteractionLog>()

    if (!log) {
      return { allowed: false, reason: 'Log not found' }
    }

    // Check if user is the creator (automatic owner)
    if (log.createdBy === userId) {
      const hasRequiredPermission = !required || required === 'owner' || required === 'writer'
      return {
        allowed: hasRequiredPermission,
        permission: 'owner',
        reason: hasRequiredPermission ? undefined : 'Insufficient permission level'
      }
    }

    // Check explicit permissions
    const permission = await this.db
      .prepare('SELECT * FROM log_permissions WHERE log_id = ? AND user_id = ?')
      .bind(logId, userId)
      .first<LogPermission>()

    if (!permission) {
      return { allowed: false, reason: 'No permission found' }
    }

    // Check if user has required permission level
    if (required) {
      const hasRequiredPermission =
        (required === 'writer' && (permission.permission === 'writer' || permission.permission === 'owner')) ||
        (required === 'owner' && permission.permission === 'owner')

      return {
        allowed: hasRequiredPermission,
        permission: permission.permission,
        reason: hasRequiredPermission ? undefined : 'Insufficient permission level'
      }
    }

    return { allowed: true, permission: permission.permission }
  }

  async createLog(request: CreateLogRequest): Promise<void> {
    const now = Date.now()

    // Create the log
    await this.db
      .prepare('INSERT INTO interaction_logs (id, title, vanity_url, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(request.id, request.title, request.vanityUrl, request.createdBy, now, now)
      .run()

    // Creator automatically gets owner permission (stored explicitly for consistency)
    const permissionId = crypto.randomUUID()
    await this.db
      .prepare('INSERT INTO log_permissions (id, log_id, user_id, permission, granted_by, granted_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(permissionId, request.id, request.createdBy, 'owner', request.createdBy, now)
      .run()
  }

  async listUserLogs(userId: string): Promise<LogSummary[]> {
    // Get logs where user is creator or has explicit permission
    const results = await this.db
      .prepare(`
        SELECT DISTINCT
          l.id as ulid,
          l.title,
          l.vanity_url as vanityUrl,
          l.created_at as createdAt,
          l.updated_at as updatedAt,
          CASE
            WHEN l.created_by = ? THEN 'owner'
            ELSE COALESCE(p.permission, 'none')
          END as permission
        FROM interaction_logs l
        LEFT JOIN log_permissions p ON l.id = p.log_id AND p.user_id = ?
        WHERE l.created_by = ? OR p.user_id = ?
        ORDER BY l.created_at DESC
      `)
      .bind(userId, userId, userId, userId)
      .all<LogSummary>()

    return results.results || []
  }

  async grantPermission(logId: string, granteeUserId: string, permission: 'writer', grantedBy: string): Promise<void> {
    // Verify the granter has owner permission
    const granterCheck = await this.checkPermission(logId, grantedBy, 'owner')
    if (!granterCheck.allowed) {
      throw new Error('Only owners can grant permissions')
    }

    // Check if permission already exists
    const existing = await this.db
      .prepare('SELECT id FROM log_permissions WHERE log_id = ? AND user_id = ?')
      .bind(logId, granteeUserId)
      .first<{ id: string }>()

    const now = Date.now()

    if (existing) {
      // Update existing permission
      await this.db
        .prepare('UPDATE log_permissions SET permission = ?, granted_by = ?, granted_at = ? WHERE log_id = ? AND user_id = ?')
        .bind(permission, grantedBy, now, logId, granteeUserId)
        .run()
    } else {
      // Create new permission
      const permissionId = crypto.randomUUID()
      await this.db
        .prepare('INSERT INTO log_permissions (id, log_id, user_id, permission, granted_by, granted_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(permissionId, logId, granteeUserId, permission, grantedBy, now)
        .run()
    }
  }

  async revokePermission(logId: string, userId: string, revokedBy: string): Promise<void> {
    // Verify the revoker has owner permission
    const revokerCheck = await this.checkPermission(logId, revokedBy, 'owner')
    if (!revokerCheck.allowed) {
      throw new Error('Only owners can revoke permissions')
    }

    // Cannot revoke owner's own permission (would orphan the log)
    if (userId === revokedBy) {
      throw new Error('Cannot revoke your own owner permission')
    }

    await this.db
      .prepare('DELETE FROM log_permissions WHERE log_id = ? AND user_id = ?')
      .bind(logId, userId)
      .run()
  }

  async deleteLog(logId: string, userId: string): Promise<void> {
    // Verify user has owner permission
    const permissionCheck = await this.checkPermission(logId, userId, 'owner')
    if (!permissionCheck.allowed) {
      throw new Error('Only owners can delete logs')
    }

    // Delete permissions first (foreign key constraint)
    await this.db
      .prepare('DELETE FROM log_permissions WHERE log_id = ?')
      .bind(logId)
      .run()

    // Delete the log
    await this.db
      .prepare('DELETE FROM interaction_logs WHERE id = ?')
      .bind(logId)
      .run()
  }

  async updateLogTitle(logId: string, newTitle: string, newVanityUrl: string, userId: string): Promise<void> {
    // Verify user has writer permission
    const permissionCheck = await this.checkPermission(logId, userId, 'writer')
    if (!permissionCheck.allowed) {
      throw new Error('Insufficient permissions to update log')
    }

    const now = Date.now()
    await this.db
      .prepare('UPDATE interaction_logs SET title = ?, vanity_url = ?, updated_at = ? WHERE id = ?')
      .bind(newTitle, newVanityUrl, now, logId)
      .run()
  }

  async getLogCollaborators(logId: string, userId: string): Promise<Array<{ userId: string; permission: 'owner' | 'writer'; grantedAt: number }>> {
    // Verify user has at least writer permission to see collaborators
    const permissionCheck = await this.checkPermission(logId, userId, 'writer')
    if (!permissionCheck.allowed) {
      throw new Error('Insufficient permissions to view collaborators')
    }

    const results = await this.db
      .prepare(`
        SELECT
          user_id as userId,
          permission,
          granted_at as grantedAt
        FROM log_permissions
        WHERE log_id = ?
        ORDER BY granted_at ASC
      `)
      .bind(logId)
      .all<{ userId: string; permission: 'owner' | 'writer'; grantedAt: number }>()

    return results.results || []
  }
}

export type {
  InteractionLog,
  LogPermission,
  PermissionCheckRequest,
  PermissionCheckResponse,
  CreateLogRequest,
  LogSummary
}
