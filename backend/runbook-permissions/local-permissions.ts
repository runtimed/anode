import type { D1Database } from "@cloudflare/workers-types";
import type {
  PermissionsProvider,
  PermissionResult,
  GrantPermissionInput,
  RevokePermissionInput,
  UserPermission,
} from "./types.ts";

interface RunbookRow {
  ulid: string;
  owner_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Local permissions provider using D1 database
 */
export class LocalPermissionsProvider implements PermissionsProvider {
  constructor(private db: D1Database) {}

  async checkPermission(
    userId: string,
    runbookId: string
  ): Promise<PermissionResult> {
    try {
      // First check if user is the owner
      const ownerCheck = await this.db
        .prepare("SELECT owner_id FROM runbooks WHERE ulid = ?")
        .bind(runbookId)
        .first<{ owner_id: string }>();

      if (!ownerCheck) {
        return {
          hasAccess: false,
          error: "Runbook not found",
        };
      }

      if (ownerCheck.owner_id === userId) {
        return {
          hasAccess: true,
          level: "owner",
        };
      }

      // Check if user has writer permission
      const writerCheck = await this.db
        .prepare(
          "SELECT permission FROM runbook_permissions WHERE runbook_ulid = ? AND user_id = ?"
        )
        .bind(runbookId, userId)
        .first<{ permission: string }>();

      if (writerCheck && writerCheck.permission === "writer") {
        return {
          hasAccess: true,
          level: "writer",
        };
      }

      return {
        hasAccess: false,
      };
    } catch (error) {
      return {
        hasAccess: false,
        error: `Permission check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  async grantPermission(input: GrantPermissionInput): Promise<void> {
    const { runbookId, userId, grantedBy } = input;

    // Verify that grantedBy is the owner
    const isGranterOwner = await this.isOwner(grantedBy, runbookId);
    if (!isGranterOwner) {
      throw new Error("Only the owner can grant permissions");
    }

    // Check if user is already the owner
    const isAlreadyOwner = await this.isOwner(userId, runbookId);
    if (isAlreadyOwner) {
      throw new Error("Cannot grant permission to owner");
    }

    // Insert or update permission
    try {
      await this.db
        .prepare(
          `
          INSERT INTO runbook_permissions (runbook_ulid, user_id, permission)
          VALUES (?, ?, 'writer')
          ON CONFLICT (runbook_ulid, user_id)
          DO UPDATE SET granted_at = CURRENT_TIMESTAMP
        `
        )
        .bind(runbookId, userId)
        .run();
    } catch (error) {
      throw new Error(
        `Failed to grant permission: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async revokePermission(input: RevokePermissionInput): Promise<void> {
    const { runbookId, userId, revokedBy } = input;

    // Verify that revokedBy is the owner
    const isRevokerOwner = await this.isOwner(revokedBy, runbookId);
    if (!isRevokerOwner) {
      throw new Error("Only the owner can revoke permissions");
    }

    // Cannot revoke owner's permissions
    const isTargetOwner = await this.isOwner(userId, runbookId);
    if (isTargetOwner) {
      throw new Error("Cannot revoke owner's permissions");
    }

    try {
      const result = await this.db
        .prepare(
          "DELETE FROM runbook_permissions WHERE runbook_ulid = ? AND user_id = ?"
        )
        .bind(runbookId, userId)
        .run();

      if (result.meta.changes === 0) {
        throw new Error("Permission not found or already revoked");
      }
    } catch (error) {
      throw new Error(
        `Failed to revoke permission: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async listPermissions(runbookId: string): Promise<UserPermission[]> {
    try {
      const permissions: UserPermission[] = [];

      // Get owner
      const owner = await this.db
        .prepare("SELECT owner_id, created_at FROM runbooks WHERE ulid = ?")
        .bind(runbookId)
        .first<{ owner_id: string; created_at: string }>();

      if (!owner) {
        throw new Error("Runbook not found");
      }

      permissions.push({
        userId: owner.owner_id,
        level: "owner",
        grantedAt: owner.created_at,
      });

      // Get writers
      const writers = await this.db
        .prepare(
          "SELECT user_id, granted_at FROM runbook_permissions WHERE runbook_ulid = ?"
        )
        .bind(runbookId)
        .all<{ user_id: string; granted_at: string }>();

      for (const writer of writers.results) {
        permissions.push({
          userId: writer.user_id,
          level: "writer",
          grantedAt: writer.granted_at,
        });
      }

      return permissions;
    } catch (error) {
      throw new Error(
        `Failed to list permissions: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async isOwner(userId: string, runbookId: string): Promise<boolean> {
    try {
      const result = await this.db
        .prepare("SELECT 1 FROM runbooks WHERE ulid = ? AND owner_id = ?")
        .bind(runbookId, userId)
        .first();

      return !!result;
    } catch {
      return false;
    }
  }

  async listAccessibleResources(
    userId: string,
    resourceType: "runbook",
    permissions?: ("owner" | "writer")[]
  ): Promise<string[]> {
    // Currently only supports runbook resources
    if (resourceType !== "runbook") {
      throw new Error(`Unsupported resource type: ${resourceType}`);
    }

    try {
      const accessibleIds: string[] = [];

      // Always include owned runbooks (owner implies all permissions)
      if (!permissions || permissions.includes("owner")) {
        const ownedRunbooks = await this.db
          .prepare("SELECT ulid FROM runbooks WHERE owner_id = ?")
          .bind(userId)
          .all<{ ulid: string }>();

        accessibleIds.push(...ownedRunbooks.results.map((r) => r.ulid));
      }

      // Include runbooks with writer permissions if requested
      if (!permissions || permissions.includes("writer")) {
        const sharedRunbooks = await this.db
          .prepare(
            "SELECT runbook_ulid FROM runbook_permissions WHERE user_id = ? AND permission = 'writer'"
          )
          .bind(userId)
          .all<{ runbook_ulid: string }>();

        accessibleIds.push(
          ...sharedRunbooks.results.map((r) => r.runbook_ulid)
        );
      }

      // Remove duplicates (user could be owner and have explicit writer permission)
      return [...new Set(accessibleIds)];
    } catch (error) {
      throw new Error(
        `Failed to list accessible resources: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async filterAccessibleResources(
    userId: string,
    resourceIds: string[]
  ): Promise<string[]> {
    if (resourceIds.length === 0) {
      return [];
    }

    try {
      const accessibleIds: string[] = [];

      // Check owned runbooks
      const placeholders = resourceIds.map(() => "?").join(",");
      const ownedRunbooks = await this.db
        .prepare(
          `SELECT ulid FROM runbooks WHERE owner_id = ? AND ulid IN (${placeholders})`
        )
        .bind(userId, ...resourceIds)
        .all<{ ulid: string }>();

      accessibleIds.push(...ownedRunbooks.results.map((r) => r.ulid));

      // Check runbooks with writer permissions
      const sharedRunbooks = await this.db
        .prepare(
          `SELECT runbook_ulid FROM runbook_permissions
           WHERE user_id = ? AND permission = 'writer' AND runbook_ulid IN (${placeholders})`
        )
        .bind(userId, ...resourceIds)
        .all<{ runbook_ulid: string }>();

      accessibleIds.push(...sharedRunbooks.results.map((r) => r.runbook_ulid));

      // Remove duplicates and maintain original order
      const uniqueAccessibleIds = [...new Set(accessibleIds)];
      return resourceIds.filter((id) => uniqueAccessibleIds.includes(id));
    } catch (error) {
      throw new Error(
        `Failed to filter accessible resources: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async fetchAccessibleResourcesWithData(
    userId: string,
    resourceType: "runbook",
    options: {
      owned?: boolean;
      shared?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<RunbookRow[] | null> {
    if (resourceType !== "runbook") {
      return null;
    }

    const { owned, shared, limit = 50, offset = 0 } = options;

    try {
      let query: string;
      let bindings: any[];

      if (owned && !shared) {
        // Only owned runbooks
        query = `
          SELECT ulid, owner_id, title, created_at, updated_at
          FROM runbooks
          WHERE owner_id = ?
          ORDER BY updated_at DESC
          LIMIT ? OFFSET ?
        `;
        bindings = [userId, limit, offset];
      } else if (shared && !owned) {
        // Only shared runbooks (writer permissions)
        query = `
          SELECT r.ulid, r.owner_id, r.title, r.created_at, r.updated_at
          FROM runbooks r
          INNER JOIN runbook_permissions rp ON r.ulid = rp.runbook_ulid
          WHERE rp.user_id = ? AND rp.permission = 'writer'
          ORDER BY r.updated_at DESC
          LIMIT ? OFFSET ?
        `;
        bindings = [userId, limit, offset];
      } else {
        // All accessible runbooks (owned + shared)
        query = `
          SELECT DISTINCT r.ulid, r.owner_id, r.title, r.created_at, r.updated_at
          FROM runbooks r
          LEFT JOIN runbook_permissions rp ON r.ulid = rp.runbook_ulid
          WHERE r.owner_id = ? OR (rp.user_id = ? AND rp.permission = 'writer')
          ORDER BY r.updated_at DESC
          LIMIT ? OFFSET ?
        `;
        bindings = [userId, userId, limit, offset];
      }

      const result = await this.db
        .prepare(query)
        .bind(...bindings)
        .all<RunbookRow>();

      return result.results;
    } catch (error) {
      // Fall back to null to indicate the two-step approach should be used
      console.error("Failed to fetch accessible resources with data:", error);
      return null;
    }
  }
}
