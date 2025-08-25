import type {
  PermissionsProvider,
  PermissionResult,
  GrantPermissionInput,
  RevokePermissionInput,
  UserPermission,
  PermissionLevel,
} from "./types.ts";

/**
 * No-op permissions provider for introspection queries
 * Denies all access and throws errors for mutation operations
 */
export class NoPermissionsProvider implements PermissionsProvider {
  async checkPermission(
    _userId: string,
    _runbookId: string
  ): Promise<PermissionResult> {
    return {
      hasAccess: false,
      error: "No permissions available in introspection context",
    };
  }

  async grantPermission(_input: GrantPermissionInput): Promise<void> {
    throw new Error(
      "Permission operations not allowed in introspection context"
    );
  }

  async revokePermission(_input: RevokePermissionInput): Promise<void> {
    throw new Error(
      "Permission operations not allowed in introspection context"
    );
  }

  async listPermissions(_runbookId: string): Promise<UserPermission[]> {
    return [];
  }

  async isOwner(_userId: string, _runbookId: string): Promise<boolean> {
    return false;
  }

  async listAccessibleResources(
    _userId: string,
    _resourceType: "runbook",
    _permissions?: PermissionLevel[]
  ): Promise<string[]> {
    return [];
  }

  async filterAccessibleResources(
    _userId: string,
    _resourceIds: string[]
  ): Promise<string[]> {
    return [];
  }

  async fetchAccessibleResourcesWithData(
    _userId: string,
    _resourceType: "runbook",
    _options: {
      owned?: boolean;
      shared?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<any[] | null> {
    return null; // Not supported in introspection context
  }
}
