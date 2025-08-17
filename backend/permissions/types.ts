/**
 * Permission levels for runbook access
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
  runbookId: string;
  userId: string;
  grantedBy: string;
  level?: "writer"; // Only writer can be granted, owner is implicit
};

/**
 * Input for revoking permissions
 */
export type RevokePermissionInput = {
  runbookId: string;
  userId: string;
  revokedBy: string;
};

/**
 * Interface that all permissions providers must implement
 */
export interface PermissionsProvider {
  /**
   * Check if a user has access to a runbook and at what level
   */
  checkPermission(userId: string, runbookId: string): Promise<PermissionResult>;

  /**
   * Grant writer permission to a user for a runbook
   * Only owners can grant permissions
   */
  grantPermission(input: GrantPermissionInput): Promise<void>;

  /**
   * Revoke permission from a user for a runbook
   * Only owners can revoke permissions
   */
  revokePermission(input: RevokePermissionInput): Promise<void>;

  /**
   * List all users with permissions to a runbook
   * Returns owner + any writers
   */
  listPermissions(runbookId: string): Promise<UserPermission[]>;

  /**
   * Check if a user is the owner of a runbook
   */
  isOwner(userId: string, runbookId: string): Promise<boolean>;

  /**
   * List all resource IDs the user has access to
   * Useful for permission-first queries to avoid N+1 problems
   */
  listAccessibleResources(
    userId: string,
    resourceType: "runbook",
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
}
