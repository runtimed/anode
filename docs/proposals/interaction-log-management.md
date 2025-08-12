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

### Dual-Worker Architecture

**Main Worker (existing)**: Handles sync, auth, frontend serving, and API key management
**Permissions Worker (new)**: Dedicated authorization service for interaction logs

This separation provides:
- Independent scaling of permission checks
- Clear security boundary
- Reusable authorization service for future features
- Simplified main worker logic

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

### Main Database (D1)
Existing tables remain unchanged. API key system (recently merged) continues to work.

### Permissions Database (separate D1 for permissions worker)

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

### Permissions Worker Endpoints

```
POST /check
- Validate user permission for specific interaction log
- Used internally by main worker before allowing access

POST /logs  
- Create new interaction log with owner permission
- Returns ULID and vanity URL for immediate use

GET /logs/{userId}
- List interaction logs accessible to user
- Returns permission level for each log
```

### Main Worker Extensions

```
POST /api/logs
- Create interaction log (proxies to permissions worker)
- Returns full URL for immediate navigation

GET /api/logs
- List user's accessible interaction logs
- Powers dashboard interface
```

## Integration Points

### LiveStore Sync
Current sync endpoint `/api/livestore/{storeId}/...` continues working. Permission validation happens before sync operations using the permissions worker.

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
1. Deploy permissions worker with schema
2. Add ULID generation to main worker
3. Create interaction log creation endpoints

### Phase 2: Frontend
1. Build dashboard component
2. Implement new URL routing
3. Add creation flow

### Phase 3: Permission Enforcement
1. Add permission checks to sync operations
2. Implement sharing UI for owners
3. Add log-scoped API key creation

### Phase 4: Migration & Cleanup
1. Migrate existing notebooks to interaction logs (all become owned by system admin initially)
2. Add owner assignment UI for migrated logs
3. Remove legacy notebook endpoints

## Key Design Decisions

### ULID over UUID
- **Time-sortable**: Natural chronological ordering
- **URL-safe**: Case-insensitive, no special characters
- **Collision-resistant**: 128-bit entropy like UUID

### Separate Permissions Worker
- **Security**: Clear authorization boundary
- **Performance**: Independent scaling of permission checks
- **Reusability**: Other services can use same permission system
- **Development**: Cleaner separation of concerns

### Vanity URLs
- **User Experience**: Shareable URLs that hint at content
- **Flexible**: Can be regenerated if title changes

### Owner-Centric Model
- **Simplicity**: Clear responsibility model
- **API Key Management**: Only owners create programmatic access
- **Sharing Control**: Owners decide collaboration level

## Environment Configuration

```bash
# Development
PERMISSIONS_WORKER_URL=http://localhost:8788
WORKER_TO_WORKER_TOKEN=dev-token

# Production  
PERMISSIONS_WORKER_URL=https://permissions.your-domain.workers.dev
WORKER_TO_WORKER_TOKEN=secure-production-token
```

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