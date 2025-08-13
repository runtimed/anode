interface Env {
  DB: D1Database
  WORKER_TO_WORKER_TOKEN: string
}

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

// Database schema initialization
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS interaction_logs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    vanity_url TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_interaction_logs_created_by ON interaction_logs(created_by);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_created_at ON interaction_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_vanity_url ON interaction_logs(vanity_url);

CREATE TABLE IF NOT EXISTS log_permissions (
    id TEXT PRIMARY KEY,
    log_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    permission TEXT NOT NULL CHECK (permission IN ('owner', 'writer')),
    granted_by TEXT NOT NULL,
    granted_at INTEGER NOT NULL,

    FOREIGN KEY (log_id) REFERENCES interaction_logs(id) ON DELETE CASCADE,
    UNIQUE(log_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_log_permissions_user_id ON log_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_log_permissions_log_id ON log_permissions(log_id);
CREATE INDEX IF NOT EXISTS idx_log_permissions_granted_at ON log_permissions(granted_at);
`

class PermissionsService {
  constructor(private db: D1Database) {}

  async initializeSchema(): Promise<void> {
    await this.db.exec(SCHEMA_SQL)
  }

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

    // Create owner permission
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
}

function authenticateWorker(request: Request, env: Env): boolean {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.substring(7)
  return token === env.WORKER_TO_WORKER_TOKEN
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  }
}

async function handlePermissionCheck(request: Request, service: PermissionsService): Promise<Response> {
  try {
    const body = await request.json() as PermissionCheckRequest
    const result = await service.checkPermission(body.logId, body.userId, body.requiredPermission)

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders()
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({
      allowed: false,
      reason: 'Invalid request format'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders()
      }
    })
  }
}

async function handleCreateLog(request: Request, service: PermissionsService): Promise<Response> {
  try {
    const body = await request.json() as CreateLogRequest
    await service.createLog(body)

    return new Response(JSON.stringify({ success: true }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders()
      }
    })
  } catch (error) {
    console.error('Failed to create log:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create log'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders()
      }
    })
  }
}

async function handleListUserLogs(request: Request, service: PermissionsService): Promise<Response> {
  try {
    const url = new URL(request.url)
    const userId = url.pathname.split('/').pop()

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders()
        }
      })
    }

    const logs = await service.listUserLogs(userId)

    return new Response(JSON.stringify(logs), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders()
      }
    })
  } catch (error) {
    console.error('Failed to list user logs:', error)
    return new Response(JSON.stringify({
      error: 'Failed to list logs'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders()
      }
    })
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders()
      })
    }

    // Authenticate worker-to-worker requests
    if (!authenticateWorker(request, env)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders()
        }
      })
    }

    const service = new PermissionsService(env.DB)
    await service.initializeSchema()

    const url = new URL(request.url)

    switch (true) {
      case url.pathname === '/check' && request.method === 'POST':
        return handlePermissionCheck(request, service)

      case url.pathname === '/logs' && request.method === 'POST':
        return handleCreateLog(request, service)

      case url.pathname.startsWith('/logs/') && request.method === 'GET':
        return handleListUserLogs(request, service)

      default:
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders()
          }
        })
    }
  }
}
