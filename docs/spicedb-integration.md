# SpiceDB Integration

## Overview

Minimal SpiceDB integration for notebook permissions using the `store` terminology to align with LiveStore concepts.

## Local Setup

1. Start SpiceDB:
```bash
docker-compose up -d
```

2. Initialize schema:
```bash
pnpm tsx scripts/init-spicedb.ts
```

3. View SpiceDB dashboard:
```bash
open http://localhost:8443
```

## Current Implementation

### Schema

```zed
definition user {}

definition store {
    relation owner: user
    permission access = owner
}
```

### API Endpoints

- `POST /api/notebooks` - Create notebook (sets owner relationship)
- `GET /api/notebooks` - List user's accessible notebooks
- `GET /api/notebooks/:id` - Get notebook details (checks access)

### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  Notebooks  │────▶│   SpiceDB   │
│             │     │     API     │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
                            │
                            ▼
                    ┌─────────────┐
                    │      D1     │
                    │  (metadata) │
                    └─────────────┘
```

- **D1**: Stores notebook metadata (title, slug, timestamps)
- **SpiceDB**: Manages ownership and access relationships
- **Mock Client**: Falls back to permissive mode when SpiceDB unavailable

## Key Design Decisions

1. **`store` not `notebook`**: Aligns with LiveStore terminology where each notebook is a store
2. **Hybrid approach**: D1 for data, SpiceDB for permissions
3. **Mock fallback**: Development works without SpiceDB running
4. **Simple permissions**: Only `owner` → `access` for now

## Usage

### Creating a notebook
```typescript
// Creates notebook in D1 and ownership in SpiceDB
const notebook = await createNotebook(userId, title, env);
```

### Checking access
```typescript
// Uses SpiceDB to verify user can access store
const hasAccess = await checkStoreAccess(spicedb, storeId, userId);
```

## Environment Variables

```bash
# .dev.vars
SPICEDB_ENDPOINT="localhost:50051"
SPICEDB_TOKEN="somerandomkeyhere"
SPICEDB_INSECURE="true"
```

## Production Considerations

- Use SpiceDB Cloud or self-host with persistent storage
- Remove mock client fallback
- Use secure gRPC connections
- Monitor permission check latency

## Next Steps

1. **Organizations**: Add org ownership and member relationships
2. **Sharing**: Implement viewer/collaborator permissions
3. **API Keys**: Scope runtime access to specific notebooks
4. **Caching**: Denormalize common queries to D1 for performance
5. **Audit**: Use SpiceDB Watch API for permission change logs

## Troubleshooting

### SpiceDB not configured
If you see "SpiceDB not configured, using permissive mock", ensure:
- Docker container is running: `docker-compose ps`
- Environment variables are set in `.dev.vars`
- Restart dev server after changing env vars

### Permission denied errors
- Check SpiceDB dashboard for relationships
- Verify user ID matches between auth and SpiceDB
- Use `checkStoreAccess` helper for debugging