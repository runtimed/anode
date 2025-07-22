import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  initializeSpiceDB,
  checkNotebookPermission,
  grantNotebookPermission,
  revokeNotebookPermission,
  getNotebookPermissions,
  createNotebookWithOwnership,
  isNotebookOwner,
  canManagePermissions,
} from "../backend/permissions";

// Mock SpiceDB client for testing
const mockSpiceDBClient = {
  writeSchema: vi.fn(),
  checkPermission: vi.fn(),
  writeRelationships: vi.fn(),
  lookupSubjects: vi.fn(),
  lookupResources: vi.fn(),
  close: vi.fn(),
  promises: {}
};

// Mock the SpiceDB module
vi.mock('@authzed/authzed-node', () => ({
  v1: {
    NewClient: vi.fn(() => mockSpiceDBClient),
    ClientSecurity: {
      SECURE: 'secure',
      INSECURE_LOCALHOST_ALLOWED: 'insecure'
    },
    WriteSchemaRequest: {
      create: vi.fn((req) => req)
    },
    CheckPermissionRequest: {
      create: vi.fn((req) => req)
    },
    CheckPermissionResponse_Permissionship: {
      HAS_PERMISSION: 'HAS_PERMISSION',
      NO_PERMISSION: 'NO_PERMISSION'
    },
    WriteRelationshipsRequest: {
      create: vi.fn((req) => req)
    },
    RelationshipUpdate: {
      create: vi.fn((req) => req)
    },
    RelationshipUpdate_Operation: {
      CREATE: 'CREATE',
      DELETE: 'DELETE'
    },
    Relationship: {
      create: vi.fn((req) => req)
    },
    ObjectReference: {
      create: vi.fn((req) => req)
    },
    SubjectReference: {
      create: vi.fn((req) => req)
    },
    Consistency: {
      create: vi.fn((req) => req)
    },
    LookupSubjectsRequest: {
      create: vi.fn((req) => req)
    },
    LookupResourcesRequest: {
      create: vi.fn((req) => req)
    }
  }
}));

// Test data store to simulate SpiceDB state
interface TestRelation {
  resource: { objectType: string; objectId: string };
  relation: string;
  subject: { objectType: string; objectId: string };
}

class TestSpiceDBStore {
  private relations: TestRelation[] = [];

  reset() {
    this.relations = [];
  }

  addRelation(resource: any, relation: string, subject: any) {
    this.relations.push({ resource, relation, subject });
  }

  removeRelation(resource: any, relation: string, subject: any) {
    this.relations = this.relations.filter(
      r => !(
        r.resource.objectType === resource.objectType &&
        r.resource.objectId === resource.objectId &&
        r.relation === relation &&
        r.subject.objectType === subject.objectType &&
        r.subject.objectId === subject.objectId
      )
    );
  }

  hasPermission(resource: any, permission: string, subject: any): boolean {
    // Simple permission logic for testing
    const directRelation = this.relations.find(
      r => 
        r.resource.objectType === resource.objectType &&
        r.resource.objectId === resource.objectId &&
        r.subject.objectType === subject.objectType &&
        r.subject.objectId === subject.objectId
    );

    if (!directRelation) return false;

    // Permission logic based on our schema
    if (permission === 'manage') {
      return directRelation.relation === 'owner';
    }
    if (permission === 'write' || permission === 'read') {
      return directRelation.relation === 'owner' || directRelation.relation === 'editor';
    }

    return false;
  }

  getSubjectsForPermission(resource: any, permission: string): any[] {
    const subjects: any[] = [];
    
    for (const relation of this.relations) {
      if (
        relation.resource.objectType === resource.objectType &&
        relation.resource.objectId === resource.objectId
      ) {
        // Check if this relation grants the permission
        if (permission === 'manage' && relation.relation === 'owner') {
          subjects.push({
            subjectObjectId: relation.subject.objectId,
            permissionship: 'HAS_PERMISSION'
          });
        } else if ((permission === 'write' || permission === 'read') && 
                   (relation.relation === 'owner' || relation.relation === 'editor')) {
          subjects.push({
            subjectObjectId: relation.subject.objectId,
            permissionship: 'HAS_PERMISSION'
          });
        }
      }
    }
    
    return subjects;
  }

  getResourcesForSubject(subject: any, permission: string): string[] {
    const resourceIds: string[] = [];
    
    for (const relation of this.relations) {
      if (
        relation.subject.objectType === subject.objectType &&
        relation.subject.objectId === subject.objectId
      ) {
        // Check if this relation grants the permission
        if (permission === 'manage' && relation.relation === 'owner') {
          resourceIds.push(relation.resource.objectId);
        } else if ((permission === 'write' || permission === 'read') && 
                   (relation.relation === 'owner' || relation.relation === 'editor')) {
          resourceIds.push(relation.resource.objectId);
        }
      }
    }
    
    return resourceIds;
  }
}

const testStore = new TestSpiceDBStore();

describe("SpiceDB RBAC Permissions", () => {
  const testEndpoint = "localhost:50051";
  const testToken = "test-token";
  const testNotebookId = "notebook-123";
  const testUserId = "user-456";
  const testOwnerId = "owner-789";

  beforeEach(() => {
    vi.clearAllMocks();
    testStore.reset();

    // Setup mock behaviors
    mockSpiceDBClient.writeSchema.mockImplementation((req, callback) => {
      callback(null, { success: true });
    });

    mockSpiceDBClient.checkPermission.mockImplementation((req, callback) => {
      const hasPermission = testStore.hasPermission(
        req.resource,
        req.permission,
        req.subject.object
      );
      
      callback(null, {
        permissionship: hasPermission ? 'HAS_PERMISSION' : 'NO_PERMISSION'
      });
    });

    mockSpiceDBClient.writeRelationships.mockImplementation((req, callback) => {
      for (const update of req.updates) {
        if (update.operation === 'CREATE') {
          testStore.addRelation(
            update.relationship.resource,
            update.relationship.relation,
            update.relationship.subject.object
          );
        } else if (update.operation === 'DELETE') {
          testStore.removeRelation(
            update.relationship.resource,
            update.relationship.relation,
            update.relationship.subject.object
          );
        }
      }
      callback(null, { success: true });
    });

    mockSpiceDBClient.lookupSubjects.mockImplementation((req) => {
      const subjects = testStore.getSubjectsForPermission(req.resource, req.permission);
      
      return {
        on: (event: string, handler: Function) => {
          if (event === 'data') {
            subjects.forEach(subject => {
              // The response should have the shape LookupSubjectsResponse
              handler({ subject: subject });
            });
          } else if (event === 'end') {
            setTimeout(() => handler(), 0); // Use setTimeout to ensure async behavior
          }
        }
      };
    });

    mockSpiceDBClient.lookupResources.mockImplementation((req) => {
      const resourceIds = testStore.getResourcesForSubject(req.subject.object, req.permission);
      
      return {
        on: (event: string, handler: Function) => {
          if (event === 'data') {
            resourceIds.forEach(resourceId => handler({ resourceObjectId: resourceId }));
          } else if (event === 'end') {
            setTimeout(() => handler(), 0); // Use setTimeout to ensure async behavior
          }
        }
      };
    });
  });

  describe("initializeSpiceDB", () => {
    it("should initialize SpiceDB client and write schema", async () => {
      await initializeSpiceDB(testEndpoint, testToken);
      
      expect(mockSpiceDBClient.writeSchema).toHaveBeenCalled();
    });
  });

  describe("checkNotebookPermission", () => {
    it("should return 'none' for user with no permissions", async () => {
      const result = await checkNotebookPermission(testEndpoint, testToken, testNotebookId, testUserId);
      expect(result).toBe("none");
    });

    it("should return 'owner' for notebook owner", async () => {
      // First grant ownership
      await grantNotebookPermission(testEndpoint, testToken, testNotebookId, testUserId, "owner", testOwnerId);
      
      const result = await checkNotebookPermission(testEndpoint, testToken, testNotebookId, testUserId);
      expect(result).toBe("owner");
    });

    it("should return 'editor' for notebook editor", async () => {
      // First grant editor permission
      await grantNotebookPermission(testEndpoint, testToken, testNotebookId, testUserId, "editor", testOwnerId);
      
      const result = await checkNotebookPermission(testEndpoint, testToken, testNotebookId, testUserId);
      expect(result).toBe("editor");
    });
  });

  describe("grantNotebookPermission", () => {
    it("should successfully grant owner permission", async () => {
      const result = await grantNotebookPermission(testEndpoint, testToken, testNotebookId, testUserId, "owner", testOwnerId);
      expect(result).toBe(true);
      
      // Verify permission was granted
      const permission = await checkNotebookPermission(testEndpoint, testToken, testNotebookId, testUserId);
      expect(permission).toBe("owner");
    });

    it("should successfully grant editor permission", async () => {
      const result = await grantNotebookPermission(testEndpoint, testToken, testNotebookId, testUserId, "editor", testOwnerId);
      expect(result).toBe(true);
      
      // Verify permission was granted
      const permission = await checkNotebookPermission(testEndpoint, testToken, testNotebookId, testUserId);
      expect(permission).toBe("editor");
    });
  });

  describe("revokeNotebookPermission", () => {
    it("should successfully revoke permissions", async () => {
      // First grant permission
      await grantNotebookPermission(testEndpoint, testToken, testNotebookId, testUserId, "editor", testOwnerId);
      
      // Verify permission exists
      let permission = await checkNotebookPermission(testEndpoint, testToken, testNotebookId, testUserId);
      expect(permission).toBe("editor");
      
      // Revoke permission
      const result = await revokeNotebookPermission(testEndpoint, testToken, testNotebookId, testUserId);
      expect(result).toBe(true);
      
      // Verify permission was revoked
      permission = await checkNotebookPermission(testEndpoint, testToken, testNotebookId, testUserId);
      expect(permission).toBe("none");
    });
  });

  describe("getNotebookPermissions", () => {
    it("should return all permissions for a notebook", async () => {
      // Grant permissions to multiple users
      await grantNotebookPermission(testEndpoint, testToken, testNotebookId, "user1", "owner", "system");
      await grantNotebookPermission(testEndpoint, testToken, testNotebookId, "user2", "editor", "user1");
      
      const permissions = await getNotebookPermissions(testEndpoint, testToken, testNotebookId);
      
      expect(permissions).toHaveLength(2);
      expect(permissions.find(p => p.userId === "user1")?.role).toBe("owner");
      expect(permissions.find(p => p.userId === "user2")?.role).toBe("editor");
    });

    it("should return empty array for notebook with no permissions", async () => {
      const permissions = await getNotebookPermissions(testEndpoint, testToken, "nonexistent-notebook");
      expect(permissions).toEqual([]);
    });
  });

  describe("createNotebookWithOwnership", () => {
    it("should create notebook and grant ownership", async () => {
      const result = await createNotebookWithOwnership(testEndpoint, testToken, testNotebookId, testUserId);
      expect(result).toBe(true);
      
      // Verify ownership was granted
      const permission = await checkNotebookPermission(testEndpoint, testToken, testNotebookId, testUserId);
      expect(permission).toBe("owner");
    });
  });

  describe("isNotebookOwner", () => {
    it("should return true for notebook owner", async () => {
      await grantNotebookPermission(testEndpoint, testToken, testNotebookId, testUserId, "owner", "system");
      
      const result = await isNotebookOwner(testEndpoint, testToken, testNotebookId, testUserId);
      expect(result).toBe(true);
    });

    it("should return false for non-owner", async () => {
      await grantNotebookPermission(testEndpoint, testToken, testNotebookId, testUserId, "editor", "owner");
      
      const result = await isNotebookOwner(testEndpoint, testToken, testNotebookId, testUserId);
      expect(result).toBe(false);
    });

    it("should return false for user with no permissions", async () => {
      const result = await isNotebookOwner(testEndpoint, testToken, testNotebookId, testUserId);
      expect(result).toBe(false);
    });
  });

  describe("canManagePermissions", () => {
    it("should return true for notebook owner", async () => {
      await grantNotebookPermission(testEndpoint, testToken, testNotebookId, testUserId, "owner", "system");
      
      const result = await canManagePermissions(testEndpoint, testToken, testNotebookId, testUserId);
      expect(result).toBe(true);
    });

    it("should return false for editor", async () => {
      await grantNotebookPermission(testEndpoint, testToken, testNotebookId, testUserId, "editor", "owner");
      
      const result = await canManagePermissions(testEndpoint, testToken, testNotebookId, testUserId);
      expect(result).toBe(false);
    });

    it("should return false for user with no permissions", async () => {
      const result = await canManagePermissions(testEndpoint, testToken, testNotebookId, testUserId);
      expect(result).toBe(false);
    });
  });
});