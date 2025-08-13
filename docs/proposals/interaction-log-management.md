# Interaction Log Management System

## Overview

This proposal outlines the transition from the current ephemeral notebook system to a managed "Interaction Log" system with proper ownership, permissions, and sharing capabilities. The system introduces user-friendly URLs, a separate permissions service, and integrates with the existing API key infrastructure.

## Terminology

**Interaction Log**: What we currently call "notebooks" - a collaborative computational document containing cells, outputs, and AI interactions.

**ULID**: Universally Unique Lexicographically Sortable Identifier - provides global uniqueness with time-ordering properties, replacing random UUIDs for better user experience.

## Current State vs. Proposed State

### Current State
- Notebooks are ephemeral - anyone with URL can access
- No ownership model or access control
- URLs are bare notebook IDs: `/notebook/some-uuid`
- Binary auth: authenticated users have full access

### Proposed State
- Interaction logs have explicit ownership and permissions
- User-friendly URLs: `/i/{ulid}/{vanity-url}`
- Granular permission system (owner, writer)
- Integration with existing API key system for programmatic access

## Architecture

### Single-Worker Architecture

**Main Worker (enhanced)**: Handles sync, auth, frontend serving, API key management, and permissions

The permissions system is implemented as internal modules:
- `backend/permissions.ts` - Core permission checking and management logic
- `backend/interaction-logs.ts` - HTTP API endpoints and business logic
- Integrated with existing D1 database and authentication flow

### URL Structure

```
/i/{ulid}/{vanity-url}

Examples:
- /i/01ARZ3NDEKTSV4RRFFQ69G5FAV/sales-analysis-2024
- /i/01ARZ3NDEKTSV4RRFFQ69G5FAV/machine-learning-tutorial
```

**Benefits:**
- **ULID**: Time-sortable, URL-safe, globally unique identifiers
- **Vanity URL**: Human-readable sharing, derived from interaction log title
- **Backwards compatible**: Current `/notebook/{id}` URLs can redirect

### Permission Model

**Owner**: Full control - can edit, share, delete, manage API keys
**Writer**: Can edit content and execute code

Permission hierarchy: `Writer < Owner`

## Database Schema

### Enhanced Database Schema

Existing tables remain unchanged. API key system continues to work. New tables added for interaction log management:

```sql
-- migrations/0001_create_interaction_logs.sql
CREATE TABLE interaction_logs (
    id TEXT PRIMARY KEY,              -- ULID
    title TEXT NOT NULL,
    vanity_url TEXT NOT NULL,         -- URL-friendly version of title
    created_by TEXT NOT NULL,         -- User ID from auth
    created_at INTEGER NOT NULL,      -- Unix timestamp
    updated_at INTEGER NOT NULL
);

-- migrations/0002_create_log_permissions.sql  
CREATE TABLE log_permissions (
    id TEXT PRIMARY KEY,              -- ULID
    log_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    permission TEXT NOT NULL CHECK (permission IN ('owner', 'writer')),
    granted_by TEXT NOT NULL,
    granted_at INTEGER NOT NULL,
    
    FOREIGN KEY (log_id) REFERENCES interaction_logs(id) ON DELETE CASCADE,
    UNIQUE(log_id, user_id)
);
```

## API Design

### New API Endpoints

```
POST /api/i
- Create new interaction log with owner permission
- Returns ULID, vanity URL, and full URL for navigation

GET /api/i
- List user's accessible interaction logs  
- Powers dashboard interface

GET /api/i/:id
- Get interaction log details
- Optional ?include=collaborators for owner view

PUT /api/i/:id  
- Update interaction log title/metadata
- Requires writer permission

DELETE /api/i/:id
- Delete interaction log and all permissions
- Requires owner permission

POST /api/i/:id/permissions
- Grant writer permission to another user
- Requires owner permission

DELETE /api/i/:id/permissions/:userId
- Revoke user's permission
- Requires owner permission
```

## Integration Points

### LiveStore Sync
Current sync endpoint `/api/livestore/{storeId}/...` continues working. Permission validation happens before sync operations using the internal permissions service.

### API Key System
Extends recently merged API key work:
- API keys can be scoped to specific interaction logs
- Only log owners can create log-scoped API keys
- Maintains existing user-scoped API keys for backwards compatibility

### Frontend Routing
- Dashboard at `/` shows user's interaction logs
- Creation flow at `/create` 
- Interaction logs at `/i/{ulid}/{vanity}`
- Legacy URLs redirect to new format

## Migration Strategy

### Phase 1: Infrastructure
1. Apply database migrations for new tables
2. Add ULID utilities and permissions modules
3. Create interaction log API endpoints

### Phase 2: Frontend
1. Build dashboard component
2. Implement new URL routing
3. Add creation flow

### Phase 3: Permission Enforcement
1. Add permission checks to sync operations
2. Implement sharing UI for owners
3. Add log-scoped API key creation

### Phase 4: Migration & Cleanup
1. Existing notebooks remain as-is (development artifacts, no migration needed)
2. Remove legacy notebook endpoints and redirect to new interaction log creation
3. Add banner encouraging users to create new interaction logs for important work

## Key Design Decisions

### ULID over UUID
- **Time-sortable**: Natural chronological ordering
- **URL-safe**: Case-insensitive, no special characters
- **Collision-resistant**: 128-bit entropy like UUID

### Modular Permissions System
- **Security**: Clear authorization logic separate from sync/auth concerns
- **Performance**: Direct database queries without HTTP overhead
- **Maintainability**: Well-defined interfaces and responsibilities
- **Development**: Easier testing and debugging within single service

### Vanity URLs
- **User Experience**: Shareable URLs that hint at content
- **Flexible**: Can be regenerated if title changes

### Owner-Centric Model
- **Simplicity**: Clear responsibility model
- **API Key Management**: Only owners create programmatic access
- **Sharing Control**: Owners decide collaboration level

## Database Migrations

```sql
-- migrations/0002_create_interaction_logs.sql
-- migrations/0003_create_log_permissions.sql
```

Apply with existing migration workflow: `pnpm db:migrate`

## Success Metrics

- **User Experience**: Reduced friction in finding and sharing interaction logs
- **Security**: Zero unauthorized access incidents
- **Performance**: Permission checks complete in <50ms p95
- **Adoption**: 90%+ of active users create owned interaction logs within 30 days

## Future Considerations

- **Public Sharing**: Read-only access, sandboxing, published snapshots
- **Organization Support**: Multi-user teams with role-based access  
- **Advanced Sharing**: Time-limited access, view-only links
- **Audit Logging**: Track access patterns and permission changes
- **API Rate Limiting**: Per-log and per-user quotas
- **SpiceDB Migration**: When ready for more sophisticated ReBAC

This proposal provides a foundation for user-controlled interaction logs while maintaining compatibility with existing infrastructure and preparing for future collaborative features.