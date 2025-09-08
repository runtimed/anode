/**
 * Permission levels for notebook access
 */
export type PermissionLevel = "owner" | "writer";

/**
 * Result of a permission check operation
 */
export type PermissionResult = {
  hasAccess: boolean;
  level?: PermissionLevel;
  error?: string;
};

/**
 * User permission entry for listing permissions
 */
export type UserPermission = {
  userId: string;
  level: PermissionLevel;
  grantedAt?: string;
};

/**
 * Input for granting permissions
 */
export type GrantPermissionInput = {
  notebookId: string;
  userId: string;
  grantedBy: string;
  level?: "writer"; // Only writer can be granted, owner is implicit
};

/**
 * Input for revoking permissions
 */
export type RevokePermissionInput = {
  notebookId: string;
  userId: string;
  revokedBy: string;
};

/**
 * Interface that all permissions providers must implement
 *
 * Design Philosophy:
 * This interface separates authorization concerns from data concerns, following
 * patterns from AuthZed's approach to protecting list endpoints.
 * See: https://authzed.com/docs/spicedb/modeling/protecting-a-list-endpoint
 *
 * We use a two-step approach:
 * 1. Query permissions provider first (listAccessibleResources/checkPermission)
 * 2. Then query D1 database with filtered resource IDs
 *
 * While it would be faster to do this in one query for the local provider,
 * we maintain consistency with the deployed service where permissions and data
 * are in separate stores and cannot be JOINed.
 *
 * Currently using the LookupResources filtering approach. We may need to
 * switch to CheckBulkPermissions for filtering results in the future.
 */
export interface PermissionsProvider {
  /**
   * Check if a user has access to a notebook and at what level
   */
  checkPermission(
    userId: string,
    notebookId: string
  ): Promise<PermissionResult>;

  /**
   * Grant writer permission to a user for a notebook
   * Only owners can grant permissions
   */
  grantPermission(input: GrantPermissionInput): Promise<void>;

  /**
   * Revoke permission from a user for a notebook
   * Only owners can revoke permissions
   */
  revokePermission(input: RevokePermissionInput): Promise<void>;

  /**
   * List all users with permissions to a notebook
   * Returns owner + any writers
   */
  listPermissions(notebookId: string): Promise<UserPermission[]>;

  /**
   * Check if a user is the owner of a notebook
   */
  isOwner(userId: string, notebookId: string): Promise<boolean>;

  /**
   * List all resource IDs the user has access to
   * Useful for permission-first queries to avoid N+1 problems
   */
  listAccessibleResources(
    userId: string,
    resourceType: "notebook",
    permissions?: PermissionLevel[]
  ): Promise<string[]>;

  /**
   * Filter a list of resource IDs to only those the user can access
   * More efficient than checking each resource individually
   */
  filterAccessibleResources(
    userId: string,
    resourceIds: string[]
  ): Promise<string[]>;

  /**
   * Fetch accessible resources with their data in one operation when possible
   * Falls back to two-step approach for external providers
   * Returns null if provider doesn't support efficient fetching
   */
  fetchAccessibleResourcesWithData?(
    userId: string,
    resourceType: "notebook",
    options: {
      owned?: boolean;
      shared?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<any[] | null>;
}
