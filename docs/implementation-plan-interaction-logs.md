# Interaction Log Management Implementation Plan

## Overview

This document outlines the implementation plan for transitioning from ephemeral notebooks to managed "Interaction Logs" with proper ownership, permissions, and user-friendly URLs in Anode.

## Current Status: WIP Branch

**Branch**: `feature/interaction-log-management`

**Phase 1 Status**: Infrastructure partially complete
- ✅ Database migrations created (`0002_create_interaction_logs.sql`, `0003_create_log_permissions.sql`)
- ✅ ULID utilities implemented (`src/lib/ulid.ts`)
- ✅ Permissions service module (`backend/permissions.ts`)
- ✅ Interaction logs API endpoints (`backend/interaction-logs.ts`)
- ✅ Basic routing integration in main worker
- ❌ API key authentication integration (blocked on JWKS complexity)
- ✅ Test script for end-to-end testing

## Key Findings & Lessons Learned

### Authentication Complexity

The current authentication system has multiple layers:
1. **OIDC JWT tokens** (5-minute expiration, good for web UI)
2. **API keys** (long-lived, good for testing/automation)  
3. **AUTH_TOKEN** (development fallback)

**Issue Discovered**: API key validation requires JWKS endpoint that's not properly integrated with our routing system. The complexity of JWT validation across different token types is significant.

### Architecture Decisions Made

1. **Single-Worker Architecture**: Chose to keep permissions logic in main worker rather than separate service (simpler deployment)
2. **ULID-based URLs**: `/i/{ulid}/{vanity-url}` format for user-friendly sharing
3. **Owner/Writer Permission Model**: Simplified from original owner/writer/public to just owner/writer
4. **Interaction Logs Terminology**: Moved away from "notebooks" to "interaction logs" for better semantic clarity

### Technical Debt Identified

- Manual URL routing and middleware is complex and error-prone
- Authentication handling scattered across multiple modules
- HTTP response patterns inconsistent
- Error handling not standardized

## Recommended Implementation Path

### Step 1: Refactor to Hono (Priority)

**Why Hono First**:
- Standardizes routing, middleware, and HTTP handling
- Built-in authentication middleware support
- Cleaner separation of concerns
- Better error handling patterns
- Will make interaction logs implementation much simpler

**Scope**:
- Migrate existing API endpoints to Hono
- Implement authentication as middleware
- Standardize error responses
- Clean up routing logic

### Step 2: Complete Interaction Logs (After Hono)

With Hono in place, complete the interaction logs implementation:

1. **Fix Authentication**:
   - Use Hono middleware for auth validation
   - Support all token types (OIDC, API keys, AUTH_TOKEN)
   - Clean up JWKS endpoint handling

2. **Complete API Implementation**:
   - Ensure all CRUD operations work
   - Add permission management endpoints
   - Implement sharing functionality

3. **Frontend Dashboard**:
   - Build React dashboard for listing interaction logs
   - Implement creation/management UI
   - Add routing for new URL format

4. **Migration Strategy**:
   - Leave existing notebooks as-is (development artifacts)
   - Add banner encouraging users to create interaction logs
   - Redirect legacy URLs to new format where possible

## Technical Specifications

### Database Schema

```sql
-- Already implemented in migrations/
CREATE TABLE interaction_logs (
    id TEXT PRIMARY KEY,              -- ULID
    title TEXT NOT NULL,
    vanity_url TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

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

### API Endpoints (Target)

```
POST /api/i                           - Create interaction log
GET /api/i                            - List user's logs
GET /api/i/:id                        - Get log details  
PUT /api/i/:id                        - Update log metadata
DELETE /api/i/:id                     - Delete log (owner only)
POST /api/i/:id/permissions           - Grant writer permission
DELETE /api/i/:id/permissions/:userId - Revoke permission
```

### URL Structure

```
/i/{ulid}/{vanity-url}

Examples:
- /i/01ARZ3NDEKTSV4RRFFQ69G5FAV/sales-analysis-2024
- /i/01ARZ3NDEKTSV4RRFFQ69G5FAV/machine-learning-tutorial
```

## Code Artifacts Created

### Completed Modules

1. **`src/lib/ulid.ts`**: ULID generation, validation, URL creation/parsing utilities
2. **`backend/permissions.ts`**: Core permission checking and management logic  
3. **`backend/interaction-logs.ts`**: HTTP API layer with full CRUD operations
4. **`migrations/0002_*.sql`, `migrations/0003_*.sql`**: Database schema
5. **`scripts/test-interaction-logs.sh`**: End-to-end testing script

### Integration Points

- **`backend/entry.ts`**: Routing integration (partially complete)
- **LiveStore sync**: Permission checks before sync operations (planned)
- **Frontend**: Dashboard and routing (not started)

## Testing Strategy

The test script (`scripts/test-interaction-logs.sh`) demonstrates the full workflow:
1. Generate OIDC token
2. Create API key (for stable testing)
3. Test all CRUD operations on interaction logs

**Current Issue**: Script fails due to API key JWKS authentication complexity.

**Workaround for Testing**: Use `AUTH_TOKEN` from `.dev.vars` directly:

```bash
export DEV_TOKEN="your-auth-token-from-dev-vars"
curl -X POST http://localhost:8787/api/i \
  -H "Authorization: Bearer $DEV_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Log"}'
```

## Next Steps

1. **Create WIP Pull Request** with current work for visibility and discussion
2. **Plan Hono Migration**: Research integration approach, plan endpoint migration strategy  
3. **Complete Hono Refactor**: Implement cleaner architecture foundation
4. **Resume Interaction Logs**: With Hono in place, authentication and routing will be much simpler
5. **Build Frontend Dashboard**: Implement React UI for interaction log management
6. **Production Testing**: Validate full user workflow end-to-end

## Success Metrics

- **Developer Experience**: Cleaner, more maintainable codebase with Hono
- **User Experience**: Intuitive dashboard for managing interaction logs
- **Functionality**: Full CRUD operations with proper permission enforcement
- **URLs**: User-friendly sharing with `/i/{ulid}/{vanity}` format
- **Authentication**: Support for all token types without complexity

## Risk Mitigation

- **Backwards Compatibility**: Keep existing notebook URLs working during transition
- **Migration Path**: No forced migration of existing development notebooks  
- **Incremental Deployment**: Can deploy Hono refactor independently of interaction logs
- **Rollback Plan**: Feature flag or branch-based deployment allows easy rollback

This implementation plan provides a clear path forward while addressing the technical debt that made the initial implementation complex.