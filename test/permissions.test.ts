import { describe, expect, it, beforeEach } from "vitest";
import {
  initializePermissionsTable,
  checkNotebookPermission,
  grantNotebookPermission,
  revokeNotebookPermission,
  getNotebookPermissions,
  createNotebookWithOwnership,
  isNotebookOwner,
  canManagePermissions,
} from "../backend/permissions";

// Mock D1 Database for testing
class MockD1Database {
  private tables: Map<string, any[]> = new Map();

  async exec(sql: string): Promise<any> {
    // Simple mock - just acknowledge table creation
    return Promise.resolve({ success: true });
  }

  prepare(sql: string) {
    return {
      bind: (...params: any[]) => ({
        first: async <T>(): Promise<T | null> => {
          // Mock permission checking
          if (sql.includes("SELECT role FROM notebook_permissions")) {
            const [notebookId, userId] = params;
            const permissions = this.tables.get("notebook_permissions") || [];
            const permission = permissions.find(
              (p) => p.notebook_id === notebookId && p.user_id === userId
            );
            return permission ? { role: permission.role } as T : null;
          }
          return null;
        },
        run: async (): Promise<any> => {
          // Mock INSERT/DELETE operations
          if (sql.includes("INSERT OR REPLACE INTO notebook_permissions")) {
            const [notebookId, userId, role, grantedBy] = params;
            const permissions = this.tables.get("notebook_permissions") || [];
            const existingIndex = permissions.findIndex(
              (p) => p.notebook_id === notebookId && p.user_id === userId
            );
            
            const permission = {
              notebook_id: notebookId,
              user_id: userId,
              role,
              granted_by: grantedBy,
              granted_at: new Date().toISOString(),
            };

            if (existingIndex >= 0) {
              permissions[existingIndex] = permission;
            } else {
              permissions.push(permission);
            }
            
            this.tables.set("notebook_permissions", permissions);
            return { success: true };
          }
          
          if (sql.includes("DELETE FROM notebook_permissions")) {
            const [notebookId, userId] = params;
            const permissions = this.tables.get("notebook_permissions") || [];
            const filtered = permissions.filter(
              (p) => !(p.notebook_id === notebookId && p.user_id === userId)
            );
            this.tables.set("notebook_permissions", filtered);
            return { success: true };
          }
          
          return { success: true };
        },
        all: async <T>(): Promise<{ results: T[] }> => {
          // Mock SELECT operations
          if (sql.includes("SELECT notebook_id as notebookId")) {
            const [notebookId] = params;
            const permissions = this.tables.get("notebook_permissions") || [];
            const results = permissions
              .filter((p) => p.notebook_id === notebookId)
              .map((p) => ({
                notebookId: p.notebook_id,
                userId: p.user_id,
                role: p.role,
                grantedBy: p.granted_by,
                grantedAt: p.granted_at,
              }));
            return { results: results as T[] };
          }
          return { results: [] };
        },
      }),
    };
  }

  reset() {
    this.tables.clear();
  }
}

describe("RBAC Permissions System", () => {
  let mockDb: MockD1Database;

  beforeEach(() => {
    mockDb = new MockD1Database();
  });

  describe("Permission Management", () => {
    it("should initialize permissions table", async () => {
      await expect(initializePermissionsTable(mockDb as any)).resolves.not.toThrow();
    });

    it("should return 'none' for users with no permissions", async () => {
      const permission = await checkNotebookPermission(mockDb as any, "notebook-1", "user-1");
      expect(permission).toBe("none");
    });

    it("should grant and check owner permissions", async () => {
      const success = await grantNotebookPermission(
        mockDb as any,
        "notebook-1",
        "user-1",
        "owner",
        "user-1"
      );
      expect(success).toBe(true);

      const permission = await checkNotebookPermission(mockDb as any, "notebook-1", "user-1");
      expect(permission).toBe("owner");
    });

    it("should grant and check editor permissions", async () => {
      // First create an owner
      await grantNotebookPermission(mockDb as any, "notebook-1", "owner-1", "owner", "owner-1");
      
      // Then grant editor permission
      const success = await grantNotebookPermission(
        mockDb as any,
        "notebook-1",
        "user-2",
        "editor",
        "owner-1"
      );
      expect(success).toBe(true);

      const permission = await checkNotebookPermission(mockDb as any, "notebook-1", "user-2");
      expect(permission).toBe("editor");
    });

    it("should revoke permissions", async () => {
      // Grant permission first
      await grantNotebookPermission(mockDb as any, "notebook-1", "user-1", "editor", "owner-1");
      
      // Verify it was granted
      let permission = await checkNotebookPermission(mockDb as any, "notebook-1", "user-1");
      expect(permission).toBe("editor");

      // Revoke permission
      const success = await revokeNotebookPermission(mockDb as any, "notebook-1", "user-1");
      expect(success).toBe(true);

      // Verify it was revoked
      permission = await checkNotebookPermission(mockDb as any, "notebook-1", "user-1");
      expect(permission).toBe("none");
    });

    it("should list notebook permissions", async () => {
      // Add multiple permissions
      await grantNotebookPermission(mockDb as any, "notebook-1", "owner-1", "owner", "owner-1");
      await grantNotebookPermission(mockDb as any, "notebook-1", "editor-1", "editor", "owner-1");
      await grantNotebookPermission(mockDb as any, "notebook-1", "editor-2", "editor", "owner-1");

      const permissions = await getNotebookPermissions(mockDb as any, "notebook-1");
      expect(permissions).toHaveLength(3);
      expect(permissions.find(p => p.userId === "owner-1")?.role).toBe("owner");
      expect(permissions.find(p => p.userId === "editor-1")?.role).toBe("editor");
      expect(permissions.find(p => p.userId === "editor-2")?.role).toBe("editor");
    });
  });

  describe("Notebook Ownership", () => {
    it("should create notebook with ownership", async () => {
      const success = await createNotebookWithOwnership(mockDb as any, "notebook-1", "user-1");
      expect(success).toBe(true);

      const isOwner = await isNotebookOwner(mockDb as any, "notebook-1", "user-1");
      expect(isOwner).toBe(true);
    });

    it("should verify ownership correctly", async () => {
      await grantNotebookPermission(mockDb as any, "notebook-1", "owner-1", "owner", "owner-1");
      await grantNotebookPermission(mockDb as any, "notebook-1", "editor-1", "editor", "owner-1");

      const ownerCheck = await isNotebookOwner(mockDb as any, "notebook-1", "owner-1");
      const editorCheck = await isNotebookOwner(mockDb as any, "notebook-1", "editor-1");
      const noAccessCheck = await isNotebookOwner(mockDb as any, "notebook-1", "random-user");

      expect(ownerCheck).toBe(true);
      expect(editorCheck).toBe(false);
      expect(noAccessCheck).toBe(false);
    });

    it("should verify permission management rights", async () => {
      await grantNotebookPermission(mockDb as any, "notebook-1", "owner-1", "owner", "owner-1");
      await grantNotebookPermission(mockDb as any, "notebook-1", "editor-1", "editor", "owner-1");

      const ownerCanManage = await canManagePermissions(mockDb as any, "notebook-1", "owner-1");
      const editorCanManage = await canManagePermissions(mockDb as any, "notebook-1", "editor-1");
      const noAccessCanManage = await canManagePermissions(mockDb as any, "notebook-1", "random-user");

      expect(ownerCanManage).toBe(true);
      expect(editorCanManage).toBe(false);
      expect(noAccessCanManage).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle database errors gracefully", async () => {
      // Create a mock database that throws errors
      const errorDb = {
        prepare: () => ({
          bind: () => ({
            first: async () => { throw new Error("Database error"); },
            run: async () => { throw new Error("Database error"); },
            all: async () => { throw new Error("Database error"); },
          }),
        }),
      };

      // Should return 'none' on error, not throw
      const permission = await checkNotebookPermission(errorDb as any, "notebook-1", "user-1");
      expect(permission).toBe("none");

      // Should return false on error, not throw
      const grantSuccess = await grantNotebookPermission(errorDb as any, "notebook-1", "user-1", "owner", "user-1");
      expect(grantSuccess).toBe(false);
    });

    it("should handle empty notebook IDs", async () => {
      const permission = await checkNotebookPermission(mockDb as any, "", "user-1");
      expect(permission).toBe("none");
    });

    it("should handle empty user IDs", async () => {
      const permission = await checkNotebookPermission(mockDb as any, "notebook-1", "");
      expect(permission).toBe("none");
    });
  });
});