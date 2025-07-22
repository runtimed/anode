/**
 * RBAC (Role-Based Access Control) for Anode notebooks using SpiceDB
 * 
 * Implements relationship-based permission management with:
 * - Owner: Full access (creator of notebook) - can manage permissions
 * - Editor: Read/write access (granted by owner) - can view and edit
 * - No Access: Cannot see or access notebook
 */

import { v1 } from '@authzed/authzed-node';

export interface NotebookPermission {
  notebookId: string;
  userId: string;
  role: 'owner' | 'editor';
  grantedBy: string;
  grantedAt: string;
}

export type PermissionRole = 'owner' | 'editor' | 'none';

// Track initialization state to avoid redundant calls
let isInitialized = false;
let spicedbClient: v1.ZedClientInterface | null = null;

/**
 * Initialize SpiceDB client connection
 * Uses singleton pattern to avoid redundant initialization
 */
export async function initializeSpiceDB(spicedbEndpoint: string, spicedbToken: string): Promise<void> {
  if (isInitialized && spicedbClient) {
    return;
  }

  try {
    // Create SpiceDB client
    const security = spicedbEndpoint.includes('localhost') 
      ? v1.ClientSecurity.INSECURE_LOCALHOST_ALLOWED
      : v1.ClientSecurity.SECURE;
    
    spicedbClient = v1.NewClient(spicedbToken, spicedbEndpoint, security);
    
    // Write the schema on initialization
    await writeSchema();
    
    isInitialized = true;
    console.log('✅ SpiceDB client initialized');
  } catch (error) {
    console.error('❌ Failed to initialize SpiceDB client:', error);
    throw error;
  }
}

/**
 * Write the Anode schema to SpiceDB
 */
async function writeSchema(): Promise<void> {
  if (!spicedbClient) {
    throw new Error('SpiceDB client not initialized');
  }

  const schema = `
definition user {}

definition notebook {
    relation owner: user
    relation editor: user
    
    permission read = owner + editor
    permission write = owner + editor  
    permission manage = owner
}`;

  const writeRequest = v1.WriteSchemaRequest.create({ schema });
  
  return new Promise((resolve, reject) => {
    spicedbClient!.writeSchema(writeRequest, (err) => {
      if (err) {
        console.error('Failed to write SpiceDB schema:', err);
        reject(err);
      } else {
        console.log('✅ SpiceDB schema written successfully');
        resolve();
      }
    });
  });
}

/**
 * Get SpiceDB client instance
 */
function getSpiceDBClient(): v1.ZedClientInterface {
  if (!spicedbClient) {
    throw new Error('SpiceDB client not initialized. Call initializeSpiceDB first.');
  }
  return spicedbClient;
}

/**
 * Check if a user has permission to access a notebook
 */
export async function checkNotebookPermission(
  spicedbEndpoint: string,
  spicedbToken: string,
  notebookId: string,
  userId: string
): Promise<PermissionRole> {
  try {
    await initializeSpiceDB(spicedbEndpoint, spicedbToken);
    const client = getSpiceDBClient();

    // Check if user is owner
    const ownerCheckRequest = v1.CheckPermissionRequest.create({
      resource: v1.ObjectReference.create({
        objectType: 'notebook',
        objectId: notebookId,
      }),
      permission: 'manage',
      subject: v1.SubjectReference.create({
        object: v1.ObjectReference.create({
          objectType: 'user',
          objectId: userId,
        }),
      }),
      consistency: v1.Consistency.create({
        requirement: {
          oneofKind: 'fullyConsistent',
          fullyConsistent: true,
        },
      }),
    });

    const ownerResult = await new Promise<v1.CheckPermissionResponse>((resolve, reject) => {
      client.checkPermission(ownerCheckRequest, (err, response) => {
        if (err) reject(err);
        else resolve(response!);
      });
    });

    if (ownerResult.permissionship === v1.CheckPermissionResponse_Permissionship.HAS_PERMISSION) {
      return 'owner';
    }

    // Check if user is editor
    const editorCheckRequest = v1.CheckPermissionRequest.create({
      resource: v1.ObjectReference.create({
        objectType: 'notebook',
        objectId: notebookId,
      }),
      permission: 'write',
      subject: v1.SubjectReference.create({
        object: v1.ObjectReference.create({
          objectType: 'user',
          objectId: userId,
        }),
      }),
      consistency: v1.Consistency.create({
        requirement: {
          oneofKind: 'fullyConsistent',
          fullyConsistent: true,
        },
      }),
    });

    const editorResult = await new Promise<v1.CheckPermissionResponse>((resolve, reject) => {
      client.checkPermission(editorCheckRequest, (err, response) => {
        if (err) reject(err);
        else resolve(response!);
      });
    });

    if (editorResult.permissionship === v1.CheckPermissionResponse_Permissionship.HAS_PERMISSION) {
      return 'editor';
    }

    return 'none';
  } catch (error) {
    console.error('Error checking notebook permission:', error);
    return 'none';
  }
}

/**
 * Grant permission to a user for a notebook
 */
export async function grantNotebookPermission(
  spicedbEndpoint: string,
  spicedbToken: string,
  notebookId: string,
  userId: string,
  role: 'owner' | 'editor',
  _grantedBy: string
): Promise<boolean> {
  try {
    await initializeSpiceDB(spicedbEndpoint, spicedbToken);
    const client = getSpiceDBClient();

    const writeRequest = v1.WriteRelationshipsRequest.create({
      updates: [
        v1.RelationshipUpdate.create({
          relationship: v1.Relationship.create({
            resource: v1.ObjectReference.create({
              objectType: 'notebook',
              objectId: notebookId,
            }),
            relation: role, // 'owner' or 'editor'
            subject: v1.SubjectReference.create({
              object: v1.ObjectReference.create({
                objectType: 'user',
                objectId: userId,
              }),
            }),
          }),
          operation: v1.RelationshipUpdate_Operation.CREATE,
        }),
      ],
    });

    await new Promise<v1.WriteRelationshipsResponse>((resolve, reject) => {
      client.writeRelationships(writeRequest, (err, response) => {
        if (err) reject(err);
        else resolve(response!);
      });
    });

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
  spicedbEndpoint: string,
  spicedbToken: string,
  notebookId: string,
  userId: string
): Promise<boolean> {
  try {
    await initializeSpiceDB(spicedbEndpoint, spicedbToken);
    const client = getSpiceDBClient();

    // Delete both owner and editor relationships
    const writeRequest = v1.WriteRelationshipsRequest.create({
      updates: [
        v1.RelationshipUpdate.create({
          relationship: v1.Relationship.create({
            resource: v1.ObjectReference.create({
              objectType: 'notebook',
              objectId: notebookId,
            }),
            relation: 'owner',
            subject: v1.SubjectReference.create({
              object: v1.ObjectReference.create({
                objectType: 'user',
                objectId: userId,
              }),
            }),
          }),
          operation: v1.RelationshipUpdate_Operation.DELETE,
        }),
        v1.RelationshipUpdate.create({
          relationship: v1.Relationship.create({
            resource: v1.ObjectReference.create({
              objectType: 'notebook',
              objectId: notebookId,
            }),
            relation: 'editor',
            subject: v1.SubjectReference.create({
              object: v1.ObjectReference.create({
                objectType: 'user',
                objectId: userId,
              }),
            }),
          }),
          operation: v1.RelationshipUpdate_Operation.DELETE,
        }),
      ],
    });

    await new Promise<v1.WriteRelationshipsResponse>((resolve, reject) => {
      client.writeRelationships(writeRequest, (err, response) => {
        if (err) reject(err);
        else resolve(response!);
      });
    });

    return true;
  } catch (error) {
    console.error('Error revoking notebook permission:', error);
    return false;
  }
}

/**
 * Get all permissions for a notebook using SpiceDB LookupSubjects
 */
export async function getNotebookPermissions(
  spicedbEndpoint: string,
  spicedbToken: string,
  notebookId: string
): Promise<NotebookPermission[]> {
  try {
    await initializeSpiceDB(spicedbEndpoint, spicedbToken);
    const client = getSpiceDBClient();

    const permissions: NotebookPermission[] = [];

    // Lookup owners
    const ownerRequest = v1.LookupSubjectsRequest.create({
      resource: v1.ObjectReference.create({
        objectType: 'notebook',
        objectId: notebookId,
      }),
      permission: 'manage',
      subjectObjectType: 'user',
      consistency: v1.Consistency.create({
        requirement: {
          oneofKind: 'fullyConsistent',
          fullyConsistent: true,
        },
      }),
    });

    const ownerResults = await new Promise<v1.ResolvedSubject[]>((resolve, reject) => {
      const subjects: v1.ResolvedSubject[] = [];
      const stream = client.lookupSubjects(ownerRequest);
      
      stream.on('data', (response: v1.LookupSubjectsResponse) => {
        subjects.push(response.subject!);
      });
      
      stream.on('end', () => resolve(subjects));
      stream.on('error', reject);
    });

    for (const subject of ownerResults) {
      permissions.push({
        notebookId,
        userId: subject.subjectObjectId,
        role: 'owner',
        grantedBy: 'system', // SpiceDB doesn't track who granted permissions
        grantedAt: new Date().toISOString(),
      });
    }

    // Lookup editors (exclude owners to avoid duplicates)
    const editorRequest = v1.LookupSubjectsRequest.create({
      resource: v1.ObjectReference.create({
        objectType: 'notebook',
        objectId: notebookId,
      }),
      permission: 'write',
      subjectObjectType: 'user',
      consistency: v1.Consistency.create({
        requirement: {
          oneofKind: 'fullyConsistent',
          fullyConsistent: true,
        },
      }),
    });

    const editorResults = await new Promise<v1.ResolvedSubject[]>((resolve, reject) => {
      const subjects: v1.ResolvedSubject[] = [];
      const stream = client.lookupSubjects(editorRequest);
      
      stream.on('data', (response: v1.LookupSubjectsResponse) => {
        subjects.push(response.subject!);
      });
      
      stream.on('end', () => resolve(subjects));
      stream.on('error', reject);
    });

    const ownerIds = new Set(permissions.map(p => p.userId));
    for (const subject of editorResults) {
      const userId = subject.subjectObjectId;
      if (!ownerIds.has(userId)) {
        permissions.push({
          notebookId,
          userId,
          role: 'editor',
          grantedBy: 'system',
          grantedAt: new Date().toISOString(),
        });
      }
    }

    return permissions;
  } catch (error) {
    console.error('Error getting notebook permissions:', error);
    return [];
  }
}

/**
 * Get all notebooks a user has access to
 */
export async function getUserNotebooks(
  spicedbEndpoint: string,
  spicedbToken: string,
  userId: string
): Promise<{ notebookId: string; role: PermissionRole }[]> {
  try {
    await initializeSpiceDB(spicedbEndpoint, spicedbToken);
    const client = getSpiceDBClient();

    const notebooks: { notebookId: string; role: PermissionRole }[] = [];

    // Lookup resources user can manage (owner)
    const ownerRequest = v1.LookupResourcesRequest.create({
      consistency: v1.Consistency.create({
        requirement: {
          oneofKind: 'fullyConsistent',
          fullyConsistent: true,
        },
      }),
      resourceObjectType: 'notebook',
      permission: 'manage',
      subject: v1.SubjectReference.create({
        object: v1.ObjectReference.create({
          objectType: 'user',
          objectId: userId,
        }),
      }),
    });

    const ownerResults = await new Promise<string[]>((resolve, reject) => {
      const resourceIds: string[] = [];
      const stream = client.lookupResources(ownerRequest);
      
      stream.on('data', (response: v1.LookupResourcesResponse) => {
        resourceIds.push(response.resourceObjectId);
      });
      
      stream.on('end', () => resolve(resourceIds));
      stream.on('error', reject);
    });

    for (const notebookId of ownerResults) {
      notebooks.push({ notebookId, role: 'owner' });
    }

    // Lookup resources user can write (editor)
    const editorRequest = v1.LookupResourcesRequest.create({
      consistency: v1.Consistency.create({
        requirement: {
          oneofKind: 'fullyConsistent',
          fullyConsistent: true,
        },
      }),
      resourceObjectType: 'notebook',
      permission: 'write',
      subject: v1.SubjectReference.create({
        object: v1.ObjectReference.create({
          objectType: 'user',
          objectId: userId,
        }),
      }),
    });

    const editorResults = await new Promise<string[]>((resolve, reject) => {
      const resourceIds: string[] = [];
      const stream = client.lookupResources(editorRequest);
      
      stream.on('data', (response: v1.LookupResourcesResponse) => {
        resourceIds.push(response.resourceObjectId);
      });
      
      stream.on('end', () => resolve(resourceIds));
      stream.on('error', reject);
    });

    const ownerIds = new Set(notebooks.map(n => n.notebookId));
    for (const notebookId of editorResults) {
      if (!ownerIds.has(notebookId)) {
        notebooks.push({ notebookId, role: 'editor' });
      }
    }

    return notebooks;
  } catch (error) {
    console.error('Error getting user notebooks:', error);
    return [];
  }
}

/**
 * Create a new notebook and set the creator as owner
 */
export async function createNotebookWithOwnership(
  spicedbEndpoint: string,
  spicedbToken: string,
  notebookId: string,
  creatorUserId: string
): Promise<boolean> {
  return await grantNotebookPermission(spicedbEndpoint, spicedbToken, notebookId, creatorUserId, 'owner', creatorUserId);
}

/**
 * Check if a user is the owner of a notebook
 */
export async function isNotebookOwner(
  spicedbEndpoint: string,
  spicedbToken: string,
  notebookId: string,
  userId: string
): Promise<boolean> {
  const permission = await checkNotebookPermission(spicedbEndpoint, spicedbToken, notebookId, userId);
  return permission === 'owner';
}

/**
 * Validate that the requesting user has permission to grant/revoke access
 * Only owners can manage permissions
 */
export async function canManagePermissions(
  spicedbEndpoint: string,
  spicedbToken: string,
  notebookId: string,
  requestingUserId: string
): Promise<boolean> {
  return await isNotebookOwner(spicedbEndpoint, spicedbToken, notebookId, requestingUserId);
}

