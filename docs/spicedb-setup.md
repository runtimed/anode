# SpiceDB Local Development Setup

This guide explains how to set up SpiceDB locally for Anode development after migrating from the D1-based RBAC system.

## Quick Start

1. **Start SpiceDB locally**:
   ```bash
   docker run --rm -p 50051:50051 authzed/spicedb serve \
     --grpc-preshared-key "somerandomkeyhere" \
     --http-enabled=false
   ```

2. **Set environment variables** (already configured in `.dev.vars.example`):
   ```
   SPICEDB_ENDPOINT="localhost:50051"
   SPICEDB_TOKEN="somerandomkeyhere"
   ```

3. **Start Anode development server**:
   ```bash
   pnpm dev
   ```

## Architecture Overview

### What Changed from D1 to SpiceDB

**Before (D1-based RBAC)**:
- SQLite database table: `notebook_permissions`
- Simple role storage: owner, editor
- Custom permission checking logic

**After (SpiceDB-based RBAC)**:
- Relationship-based authorization (Google Zanzibar model)
- Schema-defined permissions with inheritance
- Scalable, standards-based authorization service

### SpiceDB Schema

The authorization model is defined in `schema.zed`:

```
definition user {}

definition notebook {
    relation owner: user
    relation editor: user
    
    permission read = owner + editor
    permission write = owner + editor  
    permission manage = owner
}
```

This creates relationships like:
- `notebook:ABC#owner@user:123` - User 123 owns notebook ABC
- `notebook:ABC#editor@user:456` - User 456 can edit notebook ABC

### Permission Model

| Role | Can Read | Can Write | Can Manage |
|------|----------|-----------|------------|
| Owner | ✅ | ✅ | ✅ |
| Editor | ✅ | ✅ | ❌ |
| None | ❌ | ❌ | ❌ |

- **manage**: Add/remove users, change permissions (owners only)
- **write**: Edit notebook content (owners + editors)  
- **read**: View notebook content (owners + editors)

## Development Workflows

### Testing Locally

1. **Run SpiceDB in Docker**:
   ```bash
   docker run --rm -p 50051:50051 authzed/spicedb serve \
     --grpc-preshared-key "somerandomkeyhere" \
     --http-enabled=false
   ```

2. **Run tests**:
   ```bash
   pnpm test test/permissions.test.ts
   ```

### Manual Testing

The schema is automatically written when SpiceDB initializes. You can test permissions using the UI:

1. Create a new notebook (auto-grants ownership)
2. Click the Share button (🔗) in the header
3. Add users by Google ID or email
4. Test different permission levels

### Production Deployment

For production, SpiceDB runs as a hosted service:

1. **Set production environment variables**:
   - `SPICEDB_ENDPOINT`: Your hosted SpiceDB endpoint
   - `SPICEDB_TOKEN`: Production API token (set as secret)

2. **Deploy**:
   ```bash
   pnpm wrangler secret put SPICEDB_TOKEN --env production
   pnpm deploy:production
   ```

## API Compatibility

The API endpoints remain the same, but now use SpiceDB backend:

- `GET /api/permissions/check?notebookId={id}` - Check user permission
- `GET /api/permissions/list?notebookId={id}` - List all permissions (owners only)
- `POST /api/permissions/grant` - Grant permission (owners only)
- `DELETE /api/permissions/revoke` - Revoke permission (owners only)

## Troubleshooting

### SpiceDB Connection Issues

1. **Check if SpiceDB is running**:
   ```bash
   docker ps | grep spicedb
   ```

2. **Check logs**:
   ```bash
   docker logs <container-id>
   ```

3. **Test connection**:
   ```bash
   grpcurl -plaintext localhost:50051 list
   ```

### Schema Issues

The schema is automatically written on initialization. If you need to update it:

1. Edit `schema.zed`
2. Restart the development server
3. The new schema will be written automatically

### Migration from D1

The migration removes:
- `notebook_permissions` table
- D1 database dependencies for permissions
- Custom SQL permission queries

No data migration is needed since the PR is fresh and there's no auth system on main.

## Advanced Usage

### Custom SpiceDB Configuration

For advanced local development, you can run SpiceDB with persistent storage:

```bash
docker run --rm -p 50051:50051 -v spicedb-data:/var/lib/spicedb \
  authzed/spicedb serve \
  --grpc-preshared-key "somerandomkeyhere" \
  --datastore-engine postgres \
  --datastore-conn-uri "postgres://user:pass@localhost/spicedb"
```

### Schema Development

To experiment with schema changes:

1. Edit `schema.zed`
2. Test with `spicedb serve --schema-file schema.zed`
3. Validate with SpiceDB tooling

## Resources

- [SpiceDB Documentation](https://docs.authzed.com/)
- [Google Zanzibar Paper](https://research.google/pubs/pub48190/)
- [SpiceDB Playground](https://play.authzed.com/)
- [Anode RBAC Documentation](./rbac.md)