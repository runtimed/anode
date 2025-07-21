import { useState, useCallback } from 'react';
import { getCurrentAuthToken } from '../auth/google-auth.js';

export interface NotebookPermission {
  notebookId: string;
  userId: string;
  role: 'owner' | 'editor';
  grantedBy: string;
  grantedAt: string;
}

export type PermissionRole = 'owner' | 'editor' | 'none';

interface UsePermissionsResult {
  permissions: NotebookPermission[];
  loading: boolean;
  error: string | null;
  checkPermission: (notebookId: string) => Promise<PermissionRole>;
  listPermissions: (notebookId: string) => Promise<void>;
  grantPermission: (notebookId: string, userId: string, role: 'owner' | 'editor') => Promise<boolean>;
  revokePermission: (notebookId: string, userId: string) => Promise<boolean>;
}

/**
 * Hook for managing notebook permissions
 */
export const usePermissions = (): UsePermissionsResult => {
  const [permissions, setPermissions] = useState<NotebookPermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const makeApiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const authToken = getCurrentAuthToken();
    const baseUrl = import.meta.env.PROD ? '' : 'http://localhost:8787';
    
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }, []);

  const checkPermission = useCallback(async (notebookId: string): Promise<PermissionRole> => {
    try {
      setError(null);
      const data = await makeApiCall(`/api/permissions/check?notebookId=${encodeURIComponent(notebookId)}`);
      return data.permission || 'none';
    } catch (err: any) {
      console.error('Error checking permission:', err);
      setError(err.message);
      return 'none';
    }
  }, [makeApiCall]);

  const listPermissions = useCallback(async (notebookId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await makeApiCall(`/api/permissions/list?notebookId=${encodeURIComponent(notebookId)}`);
      setPermissions(data.permissions || []);
    } catch (err: any) {
      console.error('Error listing permissions:', err);
      setError(err.message);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [makeApiCall]);

  const grantPermission = useCallback(async (
    notebookId: string, 
    userId: string, 
    role: 'owner' | 'editor'
  ): Promise<boolean> => {
    try {
      setError(null);
      await makeApiCall('/api/permissions/grant', {
        method: 'POST',
        body: JSON.stringify({ notebookId, userId, role }),
      });
      
      // Refresh permissions list
      await listPermissions(notebookId);
      return true;
    } catch (err: any) {
      console.error('Error granting permission:', err);
      setError(err.message);
      return false;
    }
  }, [makeApiCall, listPermissions]);

  const revokePermission = useCallback(async (
    notebookId: string, 
    userId: string
  ): Promise<boolean> => {
    try {
      setError(null);
      await makeApiCall('/api/permissions/revoke', {
        method: 'DELETE',
        body: JSON.stringify({ notebookId, userId }),
      });
      
      // Refresh permissions list
      await listPermissions(notebookId);
      return true;
    } catch (err: any) {
      console.error('Error revoking permission:', err);
      setError(err.message);
      return false;
    }
  }, [makeApiCall, listPermissions]);

  return {
    permissions,
    loading,
    error,
    checkPermission,
    listPermissions,
    grantPermission,
    revokePermission,
  };
};