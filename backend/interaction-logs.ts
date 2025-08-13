import {
  type WorkerRequest,
  type WorkerResponse,
  type Env,
  type ExecutionContext,
  workerGlobals,
} from "./types.js";
import { PermissionsService, type LogSummary, type CreateLogRequest } from "./permissions.js";
import { generateUlid, createVanityUrl, createInteractionLogUrl, isValidUlid } from "../src/lib/ulid.js";
import type { ValidatedUser } from "./auth.js";

interface CreateLogApiRequest {
  title: string;
}

interface UpdateLogApiRequest {
  title?: string;
}

interface GrantPermissionApiRequest {
  userId: string;
  permission: 'writer';
}

interface LogDetailsResponse extends LogSummary {
  collaborators?: Array<{
    userId: string;
    permission: 'owner' | 'writer';
    grantedAt: number;
  }>;
}

export class InteractionLogsService {
  private permissions: PermissionsService;

  constructor(db: D1Database) {
    this.permissions = new PermissionsService(db);
  }

  async createLog(title: string, userId: string): Promise<{ ulid: string; vanityUrl: string; url: string }> {
    if (!title?.trim()) {
      throw new Error('Title is required');
    }

    const ulid = generateUlid();
    const vanityUrl = createVanityUrl(title.trim());

    const createRequest: CreateLogRequest = {
      id: ulid,
      title: title.trim(),
      vanityUrl,
      createdBy: userId,
    };

    await this.permissions.createLog(createRequest);

    return {
      ulid,
      vanityUrl,
      url: createInteractionLogUrl(ulid, title.trim())
    };
  }

  async listUserLogs(userId: string): Promise<LogSummary[]> {
    return await this.permissions.listUserLogs(userId);
  }

  async getLogDetails(logId: string, userId: string, includeCollaborators = false): Promise<LogDetailsResponse> {
    // Check if user has access to the log
    const permissionCheck = await this.permissions.checkPermission(logId, userId, 'writer');
    if (!permissionCheck.allowed) {
      throw new Error('Access denied');
    }

    // Get the log from the list (this gives us the LogSummary format)
    const userLogs = await this.permissions.listUserLogs(userId);
    const log = userLogs.find(l => l.ulid === logId);

    if (!log) {
      throw new Error('Log not found');
    }

    const details: LogDetailsResponse = { ...log };

    if (includeCollaborators) {
      details.collaborators = await this.permissions.getLogCollaborators(logId, userId);
    }

    return details;
  }

  async updateLog(logId: string, updates: UpdateLogApiRequest, userId: string): Promise<void> {
    if (updates.title !== undefined) {
      if (!updates.title?.trim()) {
        throw new Error('Title cannot be empty');
      }

      const newVanityUrl = createVanityUrl(updates.title.trim());
      await this.permissions.updateLogTitle(logId, updates.title.trim(), newVanityUrl, userId);
    }
  }

  async deleteLog(logId: string, userId: string): Promise<void> {
    await this.permissions.deleteLog(logId, userId);
  }

  async grantPermission(logId: string, granteeUserId: string, permission: 'writer', grantedBy: string): Promise<void> {
    if (granteeUserId === grantedBy) {
      throw new Error('Cannot grant permission to yourself');
    }

    await this.permissions.grantPermission(logId, granteeUserId, permission, grantedBy);
  }

  async revokePermission(logId: string, userId: string, revokedBy: string): Promise<void> {
    await this.permissions.revokePermission(logId, userId, revokedBy);
  }

  async requirePermission(logId: string, userId: string, required: 'owner' | 'writer' = 'writer'): Promise<void> {
    const check = await this.permissions.checkPermission(logId, userId, required);
    if (!check.allowed) {
      throw new Error(check.reason || 'Access denied');
    }
  }
}

async function handleCreateLog(
  request: WorkerRequest,
  service: InteractionLogsService,
  user: ValidatedUser
): Promise<WorkerResponse> {
  try {
    const body = await request.json() as CreateLogApiRequest;
    const result = await service.createLog(body.title, user.id);

    return new workerGlobals.Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create log';
    return new workerGlobals.Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleListLogs(
  service: InteractionLogsService,
  user: ValidatedUser
): Promise<WorkerResponse> {
  try {
    const logs = await service.listUserLogs(user.id);
    return new workerGlobals.Response(JSON.stringify(logs), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new workerGlobals.Response(JSON.stringify({ error: 'Failed to list logs' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleGetLog(
  logId: string,
  service: InteractionLogsService,
  user: ValidatedUser,
  includeCollaborators = false
): Promise<WorkerResponse> {
  try {
    if (!isValidUlid(logId)) {
      return new workerGlobals.Response(JSON.stringify({ error: 'Invalid log ID format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const log = await service.getLogDetails(logId, user.id, includeCollaborators);
    return new workerGlobals.Response(JSON.stringify(log), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get log';
    const status = message === 'Access denied' ? 403 : message === 'Log not found' ? 404 : 500;

    return new workerGlobals.Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleUpdateLog(
  request: WorkerRequest,
  logId: string,
  service: InteractionLogsService,
  user: ValidatedUser
): Promise<WorkerResponse> {
  try {
    if (!isValidUlid(logId)) {
      return new workerGlobals.Response(JSON.stringify({ error: 'Invalid log ID format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json() as UpdateLogApiRequest;
    await service.updateLog(logId, body, user.id);

    return new workerGlobals.Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update log';
    const status = message.includes('permission') ? 403 : 400;

    return new workerGlobals.Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleDeleteLog(
  logId: string,
  service: InteractionLogsService,
  user: ValidatedUser
): Promise<WorkerResponse> {
  try {
    if (!isValidUlid(logId)) {
      return new workerGlobals.Response(JSON.stringify({ error: 'Invalid log ID format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await service.deleteLog(logId, user.id);
    return new workerGlobals.Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete log';
    const status = message.includes('owners') ? 403 : 500;

    return new workerGlobals.Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleGrantPermission(
  request: WorkerRequest,
  logId: string,
  service: InteractionLogsService,
  user: ValidatedUser
): Promise<WorkerResponse> {
  try {
    if (!isValidUlid(logId)) {
      return new workerGlobals.Response(JSON.stringify({ error: 'Invalid log ID format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json() as GrantPermissionApiRequest;

    if (!body.userId || !body.permission) {
      return new workerGlobals.Response(JSON.stringify({ error: 'userId and permission are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (body.permission !== 'writer') {
      return new workerGlobals.Response(JSON.stringify({ error: 'Only writer permission can be granted' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await service.grantPermission(logId, body.userId, body.permission, user.id);
    return new workerGlobals.Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to grant permission';
    const status = message.includes('owners') ? 403 : 400;

    return new workerGlobals.Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleRevokePermission(
  logId: string,
  targetUserId: string,
  service: InteractionLogsService,
  user: ValidatedUser
): Promise<WorkerResponse> {
  try {
    if (!isValidUlid(logId)) {
      return new workerGlobals.Response(JSON.stringify({ error: 'Invalid log ID format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await service.revokePermission(logId, targetUserId, user.id);
    return new workerGlobals.Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to revoke permission';
    const status = message.includes('owners') ? 403 : 400;

    return new workerGlobals.Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function handleInteractionLogRoutes(
  request: WorkerRequest,
  env: Env,
  ctx: ExecutionContext,
  validatedUser: ValidatedUser
): Promise<WorkerResponse | null> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  // Only handle /api/logs routes
  if (!pathname.startsWith('/api/logs')) {
    return null;
  }

  const service = new InteractionLogsService(env.DB);

  // Parse route patterns
  const logIdMatch = pathname.match(/^\/api\/logs\/([^\/]+)$/);
  const permissionsMatch = pathname.match(/^\/api\/logs\/([^\/]+)\/permissions$/);
  const revokePermissionMatch = pathname.match(/^\/api\/logs\/([^\/]+)\/permissions\/([^\/]+)$/);

  try {
    switch (true) {
      // POST /api/logs - Create new log
      case pathname === '/api/logs' && method === 'POST':
        return await handleCreateLog(request, service, validatedUser);

      // GET /api/logs - List user's logs
      case pathname === '/api/logs' && method === 'GET':
        return await handleListLogs(service, validatedUser);

      // GET /api/logs/:id - Get log details
      case logIdMatch && method === 'GET':
        const includeCollaborators = url.searchParams.get('include') === 'collaborators';
        return await handleGetLog(logIdMatch[1], service, validatedUser, includeCollaborators);

      // PUT /api/logs/:id - Update log
      case logIdMatch && method === 'PUT':
        return await handleUpdateLog(request, logIdMatch[1], service, validatedUser);

      // DELETE /api/logs/:id - Delete log
      case logIdMatch && method === 'DELETE':
        return await handleDeleteLog(logIdMatch[1], service, validatedUser);

      // POST /api/logs/:id/permissions - Grant permission
      case permissionsMatch && method === 'POST':
        return await handleGrantPermission(request, permissionsMatch[1], service, validatedUser);

      // DELETE /api/logs/:id/permissions/:userId - Revoke permission
      case revokePermissionMatch && method === 'DELETE':
        return await handleRevokePermission(revokePermissionMatch[1], revokePermissionMatch[2], service, validatedUser);

      default:
        return new workerGlobals.Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Error in interaction logs handler:', error);
    return new workerGlobals.Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export { InteractionLogsService };
