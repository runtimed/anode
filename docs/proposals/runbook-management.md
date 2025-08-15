# Runbook Management System

## Overview

Originally I was going to make `/api/r` endpoints and realized it would be far easier, given that we will likely have complex queries for "Unnamed notebooks", "Named notebooks", "Notebooks with X tag", "Notebooks shared with me", etc. that we should just start GraphQL first. Yoga actually integrates so well with CloudFlare's bare `fetch` interface that it made me wonder if we should just toss all the `/api` endpoints.

## API Examples

```graphql
# Create runbook
mutation {
  createRunbook(input: { title: "Analysis Notebook" }) {
    ulid title createdAt
  }
}

# List my runbooks
query {
  runbooks(owned: true) {
    ulid title myPermission
  }
}

# Get specific runbook
query {
  runbook(ulid: "01K2Q9V9A5GFDX61XF2FS1W6B4") {
    ulid title owner { id email } collaborators { id email }
  }
}

# Share runbook
mutation {
  shareRunbook(input: { runbookUlid: "01K2Q9V9A5GFDX61XF2FS1W6B4", userId: "user-123" })
}
```

## In practice

```bash
source .env && curl -X POST http://localhost:8787/graphql \
  -H "Authorization: Bearer $RUNT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { createRunbook(input: { title: \"My Second Runbook\" }) { ulid title owner { id email } createdAt } }"}'
```

```json
{"data":{"createRunbook":{"ulid":"01K2Q9V9A5GFDX61XF2FS1W6B4","title":"My Second Runbook","createdAt":"2025-08-15T16:43:43.813Z","owner":{"id":"a2dca944-0023-5374-8a6a-0ae9060431a0","email":"a2dca944-0023-5374-8a6a-0ae9060431a0@example.com"}}}}
```

## Architecture

The system introduces proper ownership and permissions to replace the current ephemeral notebook model:

### Database Schema (D1)

```sql
CREATE TABLE runbooks (
  ulid TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  vanity_name TEXT, -- Reserved for future URL slugs
  title TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE runbook_permissions (
  runbook_ulid TEXT NOT NULL,
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission = 'writer'),
  granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (runbook_ulid, user_id)
);
```

### Provider Pattern

Following the existing API key provider pattern, permissions are abstracted through a `PermissionsProvider` interface:

- **LocalPermissionsProvider**: D1-based implementation for development
- **AnacondaPermissionsProvider**: Future SpiceDB integration (planned)

**Permissions-First Architecture**: To ensure compatibility with SpiceDB (where we can't JOIN across data stores), the GraphQL resolvers use a two-step approach:

1. **Query permissions provider** for accessible resource IDs
2. **Query D1** for those specific resources

```typescript
// Step 1: Get accessible runbook IDs from permissions provider
const accessibleRunbookIds = await permissionsProvider.listAccessibleResources(
  user.id, 
  "runbook"
);

// Step 2: Query D1 for those specific runbooks
const result = await DB.prepare(`
  SELECT * FROM runbooks 
  WHERE ulid IN (${placeholders})
`).bind(...accessibleRunbookIds).all();
```

This pattern works with both local D1 permissions and remote SpiceDB because we avoid cross-system JOINs.

### Permission Model

- **Owner**: Full control - create, edit, share, delete
- **Writer**: Can edit content and execute code (matches LiveStore's binary write model)
- No reader permission initially (will be future enhancement)

### URL Structure

**Planned**: `/r/{ulid}/{vanity-name}` where vanity-name is URL dressing
- `/r/{ulid}` uniquely identifies the notebook
- Vanity name auto-generated from title for prettier URLs
- Conflicts don't matter - ULID is canonical

**Current**: `/?notebook={id}` continues working (legacy support)

## GraphQL Schema

```graphql
type Runbook {
  ulid: ID!
  title: String
  vanityName: String
  owner: User!
  collaborators: [User!]!
  myPermission: PermissionLevel!
  createdAt: String!
  updatedAt: String!
}

enum PermissionLevel {
  OWNER
  WRITER
}

type Query {
  runbooks(owned: Boolean, shared: Boolean, limit: Int, offset: Int): [Runbook!]!
  runbook(ulid: ID!): Runbook
  me: User!
}

type Mutation {
  createRunbook(input: CreateRunbookInput!): Runbook!
  updateRunbook(ulid: ID!, input: UpdateRunbookInput!): Runbook!
  deleteRunbook(ulid: ID!): Boolean!
  shareRunbook(input: ShareRunbookInput!): Boolean!
  unshareRunbook(input: UnshareRunbookInput!): Boolean!
}
```

## Implementation Status

### ✅ Complete
- D1 migration with runbooks and permissions tables
- GraphQL server with Yoga v5 integration 
- Authentication via existing API key system
- ULID generation for time-sortable IDs
- Local permissions provider with D1 backend
- Full CRUD operations (create, read, update, delete)
- Permission management (share/unshare)
- Provider factory pattern (Anaconda-ready)
- **Permissions-first architecture** - SpiceDB compatible query pattern

### 🚧 Tested & Working
- User authentication via API keys
- Runbook creation and listing
- Individual runbook queries
- Metadata updates
- Permission level resolution

### 📋 Next Steps
1. **Frontend Integration**: `/r/{ulid}` URL routing in React app
2. **LiveStore Permissions**: Integrate permission checks into `validatePayload()`
3. **Vanity URL Generation**: Implement title → slug conversion
4. **Delete Functionality**: Test runbook deletion with CASCADE
5. **Share/Unshare UI**: Permission management interface

## Future

Once ready, we'll start having notebooks be at `/r/{ulid}`

```
Frontend (/r/{ulid}) → GraphQL API → Permissions Provider → D1 Database
                     ↘ LiveStore Sync → Permissions Check
```

The GraphQL-first approach provides the flexibility needed for complex queries while maintaining clean separation of concerns through the provider pattern. The system is designed to scale from local D1 development to production SpiceDB deployment without breaking changes to the API surface.

## Key Benefits

1. **GraphQL Flexibility**: Complex filtering, sorting, pagination built-in
2. **Provider Pattern**: Clean abstraction for different permission backends  
3. **ULID Benefits**: Time-sortable, URL-safe, globally unique identifiers
4. **Legacy Compatibility**: Existing `/?notebook=` URLs continue working
5. **Type Safety**: Full TypeScript integration with schema-first approach
6. **Cloudflare Native**: Leverages D1, R2, and Worker platform features
7. **SpiceDB Ready**: Permissions-first architecture avoids cross-system JOIN limitations

This foundation enables rich collaborative features while maintaining the real-time, local-first architecture that makes Anode unique.