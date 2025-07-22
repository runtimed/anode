import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions.js';
import { useCurrentUser } from '@/hooks/useCurrentUser.js';
import { getCurrentNotebookId } from '@/util/store-id.js';
import { Users, Plus, Trash2, UserCheck, Crown, Edit, AlertCircle } from 'lucide-react';

interface PermissionManagerProps {
  onClose?: () => void;
}

export const PermissionManager: React.FC<PermissionManagerProps> = ({ onClose }) => {
  const notebookId = getCurrentNotebookId();
  const currentUser = useCurrentUser();
  const { 
    permissions, 
    loading, 
    error, 
    listPermissions, 
    grantPermission, 
    revokePermission 
  } = usePermissions();

  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'editor' | 'owner'>('editor');
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (notebookId) {
      listPermissions(notebookId);
    }
  }, [notebookId, listPermissions]);

  useEffect(() => {
    // Check if current user is owner
    const userPermission = permissions.find(p => p.userId === currentUser.id);
    setIsOwner(userPermission?.role === 'owner');
  }, [permissions, currentUser.id]);

  const handleGrantPermission = async () => {
    if (!newUserEmail.trim()) return;
    
    const success = await grantPermission(notebookId, newUserEmail.trim(), newUserRole);
    if (success) {
      setNewUserEmail('');
      setShowAddUser(false);
    }
  };

  const handleRevokePermission = async (userId: string) => {
    if (window.confirm('Are you sure you want to revoke access for this user?')) {
      await revokePermission(notebookId, userId);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'editor':
        return <Edit className="h-4 w-4 text-blue-500" />;
      default:
        return <UserCheck className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'editor':
        return 'Editor';
      default:
        return 'Unknown';
    }
  };

  if (!isOwner) {
    return (
      <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-sm border">
        <div className="flex items-center gap-2 text-gray-600 mb-4">
          <AlertCircle className="h-5 w-5" />
          <h3 className="font-medium">Access Denied</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Only notebook owners can manage permissions.
        </p>
        {onClose && (
          <Button onClick={onClose} variant="outline" size="sm">
            Close
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-medium">Notebook Permissions</h3>
        </div>
        {onClose && (
          <Button onClick={onClose} variant="outline" size="sm">
            Close
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading permissions...</p>
        </div>
      ) : (
        <>
          {/* Current Permissions */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Current Access</h4>
            <div className="space-y-2">
              {permissions.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No permissions found.</p>
              ) : (
                permissions.map((permission) => (
                  <div
                    key={permission.userId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      {getRoleIcon(permission.role)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {permission.userId}
                          {permission.userId === currentUser.id && (
                            <span className="ml-2 text-xs text-gray-500">(You)</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {getRoleLabel(permission.role)} • Added {new Date(permission.grantedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    {permission.userId !== currentUser.id && (
                      <Button
                        onClick={() => handleRevokePermission(permission.userId)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add New User */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700">Add User</h4>
              {!showAddUser && (
                <Button
                  onClick={() => setShowAddUser(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add User
                </Button>
              )}
            </div>

            {showAddUser && (
              <div className="p-4 bg-gray-50 rounded-md space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    User ID or Email
                  </label>
                  <input
                    type="text"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="Enter user ID or email"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the Google user ID or email address
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as 'editor' | 'owner')}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="editor">Editor - Can read and edit</option>
                    <option value="owner">Owner - Full control</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleGrantPermission}
                    size="sm"
                    disabled={!newUserEmail.trim()}
                  >
                    Grant Access
                  </Button>
                  <Button
                    onClick={() => {
                      setShowAddUser(false);
                      setNewUserEmail('');
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};