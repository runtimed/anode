# SpiceDB Authorization Integration

## Overview

This proposal outlines the integration of SpiceDB for relationship-based access control (ReBAC) in Anode, moving beyond the current binary authenticated/not-authenticated model to support fine-grained permissions for notebooks, API keys, and runtime agents.

## Current State

### Authentication

- OIDC provider (Anaconda) for user authentication
- Shared `AUTH_TOKEN` for runtime agents (development/prototype)
- Binary access model: authenticated users can access any notebook they know the URL for

### Pain Points

- No ownership model for notebooks
- No access control for shared notebooks
- Runtime agents use shared tokens with full access
- No audit trail for access patterns

## Proposed Architecture

### SpiceDB Schema

```zed
definition user {}

definition system {
    relation admin: user
    permission admin_access = admin
}

definition notebook {
    relation owner: user
    relation collaborator: user

    permission access = owner + collaborator + system->admin_access
    permission manage = owner + system->admin_access
}

definition api_key {
    relation owner: user
    relation notebook: notebook  // Scoped to specific notebook

    // API key can only access its assigned notebook if owner has access
    permission use = owner & notebook->access
}

definition runtime {
    relation api_key: api_key | system
    relation notebook: notebook
    relation session_id: string

    // Runtime can execute if using valid API key OR system admin
    permission execute = (api_key->use & notebook) + system->admin_access
}
```

### Key Design Decisions

1. **Simplified Permissions**: Given LiveStore's write/no-write constraint, we only model `access` (read+write) and `manage` permissions.

2. **API Key Scoping**: API keys are scoped to single notebooks for security isolation.

3. **Explicit Admin Access**: System admin access is explicitly modeled for transparency and easier removal in production.

4. **Ephemeral Runtimes**: Runtime entities are created on-demand and cleaned up when runtimes terminate.

## Data Model

### D1 Schema

```sql
-- API Keys table
CREATE TABLE api_keys (
    id TEXT PRIMARY KEY,              -- UUID
    key_hash TEXT NOT NULL UNIQUE,    -- SHA-256 of the actual key
    user_id TEXT NOT NULL,            -- Owner's user ID
    notebook_id TEXT NOT NULL,        -- Scoped to single notebook
    name TEXT,                        -- Optional friendly name
    created_at INTEGER NOT NULL,      -- Unix timestamp
    last_used_at INTEGER,             -- Track usage
    expires_at INTEGER,               -- Optional expiration
    is_active INTEGER DEFAULT 1       -- Soft delete
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_notebook ON api_keys(notebook_id);

-- Notebooks table
CREATE TABLE notebooks (
    id TEXT PRIMARY KEY,              -- Also the LiveStore storeId
    title TEXT NOT NULL,
    created_by TEXT NOT NULL,         -- User ID
    created_at INTEGER NOT NULL
);

CREATE INDEX idx_notebooks_created_by ON notebooks(created_by);
```

## API Endpoints

### Notebook Management

```typescript
POST /api/notebooks
  -> Create notebook in D1
  -> Write owner relationship to SpiceDB
  -> Return notebook ID

GET /api/notebooks
  -> Query all notebooks from D1
  -> Bulk check SpiceDB permissions
  -> Return filtered list

DELETE /api/notebooks/:id
  -> Check manage permission in SpiceDB
  -> Delete from D1 and SpiceDB
```

### API Key Management

```typescript
POST /api/notebooks/:notebookId/api-keys
  -> Validate user has notebook access
  -> Generate key, store hash in D1
  -> Create SpiceDB relationships
  -> Return key (only shown once)

GET /api/notebooks/:notebookId/api-keys
  -> List user's API keys for notebook

DELETE /api/api-keys/:id
  -> Soft delete in D1
  -> Remove SpiceDB relationships
```

## Integration Points

### Sync Backend (sync.ts)

```typescript
async function validateWithSpiceDB(
  validatedUser: ValidatedUser,
  notebookId: string,
  isRuntime: boolean
) {
  if (isRuntime) {
    // Validate API key has access to this notebook
    const hasAccess = await spicedb.checkPermission({
      resource: {
        objectType: "api_key",
        objectId: extractApiKeyId(validatedUser.id),
      },
      permission: "use",
      subject: { object: { objectType: "notebook", objectId: notebookId } },
    });

    if (!hasAccess) {
      throw new Error("API_KEY_ACCESS_DENIED");
    }
  } else {
    // Regular user - check notebook access
    const hasAccess = await spicedb.checkPermission({
      resource: { objectType: "notebook", objectId: notebookId },
      permission: "access",
      subject: { object: { objectType: "user", objectId: validatedUser.id } },
    });

    if (!hasAccess) {
      throw new Error("NOTEBOOK_ACCESS_DENIED");
    }
  }
}
```

### Local Development

```yaml
# docker-compose.yml
version: "3.8"

services:
  spicedb:
    image: authzed/spicedb
    command: serve-devtools --grpc-preshared-key "local-dev-token"
    ports:
      - "50051:50051" # gRPC
      - "8443:8443" # Dashboard
    environment:
      - SPICEDB_DATASTORE_ENGINE=memory
```

## Security Considerations

### System Admin Access

- Explicitly modeled as `system->admin_access`
- All admin access creates audit trails in SpiceDB
- Environment check prevents AUTH_TOKEN in production:
  ```typescript
  if (env.DEPLOYMENT_ENV === "production" && env.AUTH_TOKEN) {
    throw new Error("System admin token enabled in production!");
  }
  ```

### API Key Security

- Keys are hashed before storage (SHA-256)
- Keys shown only once at creation
- Scoped to single notebooks
- Optional expiration
- Soft delete for revocation

## Migration Plan

### Phase 1: Foundation (Current)

1. Deploy SpiceDB locally
2. Implement basic schema
3. Add permission checks alongside existing auth

### Phase 2: API Keys

1. Implement API key generation/validation
2. Update runtime agents to use API keys
3. Deprecate shared AUTH_TOKEN

### Phase 3: Production

1. Remove system admin definition
2. Deploy SpiceDB to production
3. Migrate existing notebooks with owner relationships
4. Enable strict permission checking

### Phase 4: Advanced Features

1. Notebook sharing/collaboration
2. Organization support
3. Audit logging
4. Resource quotas per API key

## Future Considerations

1. **Read-Only Access**: When LiveStore supports read-only mode, add viewer permissions
2. **Organizations**: Add organization ownership for team notebooks
3. **Sharing**: Implement invite flows and temporary access
4. **Audit**: Use SpiceDB's Watch API for comprehensive audit logs

## Implementation Checklist

- [ ] Set up local SpiceDB instance
- [ ] Create D1 schema migrations
- [ ] Implement SpiceDB client wrapper
- [ ] Add notebook creation with ownership
- [ ] Implement notebook listing with permissions
- [ ] Create API key generation endpoint
- [ ] Update sync backend validation
- [ ] Add admin user management
- [ ] Write integration tests
- [ ] Document API changes
- [ ] Plan production deployment

## References

- [SpiceDB Documentation](https://authzed.com/docs)
- [Google Zanzibar Paper](https://research.google/pubs/pub48190/)
- [LiveStore Sync Documentation](https://docs.livestore.dev/reference/syncing/)
