# RBAC (Role-Based Access Control) for Anode Notebooks

This document describes the rudimentary RBAC system implemented for Anode notebooks, providing simple read/write permissions per user and notebook.

## Overview

The RBAC system implements simple permission control with three access levels:
- **Owner**: Full access (creator of notebook) - can manage permissions and notebook content
- **Editor**: Read/write access (granted by owner) - can view and edit notebook content  
- **No Access**: Cannot see or access notebook

## Architecture

### Permission Storage
- Permissions are stored in D1 database (not LiveStore events)
- Database table: `notebook_permissions`
- Schema: `notebook_id`, `user_id`, `role`, `granted_by`, `granted_at`

### Permission Checks
- Access control happens in `backend/sync.ts` before allowing LiveStore connection
- Runtime agents bypass permission checks (trusted system components)
- Anonymous users bypass permission checks (local development)

### API Endpoints
- `GET /api/permissions/check?notebookId={id}` - Check user's permission for a notebook
- `GET /api/permissions/list?notebookId={id}` - List all permissions for a notebook (owners only)
- `POST /api/permissions/grant` - Grant permission to a user (owners only)
- `DELETE /api/permissions/revoke` - Revoke permission from a user (owners only)

## Usage

### Frontend Components
- **Share Button**: Located in notebook header (Share2 icon)
- **Permission Manager**: Modal dialog for managing notebook access
- **Permission Hook**: `usePermissions()` for permission operations

### Creating New Notebooks
- New notebooks auto-grant ownership to the creator
- Pattern recognition: `notebook-{timestamp}-{random}` (e.g., `notebook-1642345678901-abc123`)
- Only authenticated users can create owned notebooks

### Sharing Notebooks
1. Click the Share button in the notebook header
2. Add users by their Google user ID or email
3. Choose role: Owner or Editor
4. Users receive immediate access upon granting

### Permission Management
- Only owners can grant/revoke permissions
- Owners cannot revoke their own ownership
- Multiple owners are allowed

## Security Features

### Access Control Points
1. **Backend Validation**: Permission check before LiveStore connection
2. **API Authentication**: All permission APIs require valid auth token
3. **Ownership Verification**: Only owners can manage permissions
4. **Pattern Matching**: Strict regex for new notebook detection

### Error Handling
- Graceful degradation on database errors
- User-friendly error messages
- Prevention of self-ownership revocation

## Implementation Files

### Backend
- `backend/permissions.ts` - Core permission functions
- `backend/permission-api.ts` - REST API endpoints
- `backend/sync.ts` - LiveStore validation integration
- `backend/entry.ts` - API routing

### Frontend
- `src/hooks/usePermissions.ts` - Permission management hook
- `src/components/notebook/PermissionManager.tsx` - UI for managing permissions
- `src/components/notebook/NotebookViewer.tsx` - Share button integration

### Testing
- `test/permissions.test.ts` - Comprehensive permission system tests

## Migration Notes

### Existing Notebooks
- Existing notebooks without permissions remain accessible
- First authenticated user to access becomes owner
- Anonymous access continues to work for local development

### Database Setup
- Permission table auto-created on first use
- No migration scripts required
- Backward compatible with existing installations

## Future Enhancements

### Planned Features
- **Viewer Role**: Read-only access
- **Group Permissions**: Share with groups/teams
- **Public Notebooks**: Share with anonymous users
- **Permission Inheritance**: Folder-based permissions
- **Audit Log**: Track permission changes

### API Key Integration
- API keys inherit user permissions
- Runtime agents can be scoped to specific notebooks
- "Bring Your Own Compute" with permission inheritance

## Example Usage

```typescript
// Check user permission
const permission = await usePermissions().checkPermission('notebook-123');

// Grant editor access
await usePermissions().grantPermission('notebook-123', 'user@example.com', 'editor');

// List all permissions (owners only)
await usePermissions().listPermissions('notebook-123');

// Revoke access
await usePermissions().revokePermission('notebook-123', 'user@example.com');
```

## Troubleshooting

### Common Issues
1. **Permission Denied**: User needs to be granted access by notebook owner
2. **Cannot Manage Permissions**: Only owners can grant/revoke access
3. **New Notebook Access**: Auto-ownership only works for authenticated users

### Debug Information
- Check browser console for permission validation logs
- Backend logs include detailed permission check results
- Use `/api/permissions/check` endpoint to verify user access