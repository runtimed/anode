# GraphQL API Documentation

## Overview

The Anode GraphQL API provides a unified interface for managing runbooks (computational notebooks) with ownership, permissions, and collaboration features.

**Endpoint**: `/graphql`
**Method**: `POST`
**Content-Type**: `application/json`

## Authentication

All requests require authentication via Bearer token:

```bash
Authorization: Bearer <your_api_key>
```

## Schema

### Types

#### Runbook

```graphql
type Runbook {
  ulid: ID! # Unique ULID identifier
  title: String # Human-readable title
  vanityName: String # URL-friendly name (reserved)
  owner: User! # Runbook owner
  collaborators: [User!]! # Users with write access
  myPermission: PermissionLevel! # Current user's permission
  createdAt: String! # ISO timestamp
  updatedAt: String! # ISO timestamp
}
```

#### User

```graphql
type User {
  id: ID! # Unique user identifier
  email: String! # User email address
  name: String # Display name
  givenName: String # First name
  familyName: String # Last name
}
```

#### PermissionLevel

```graphql
enum PermissionLevel {
  OWNER # Full control (create, edit, share, delete)
  WRITER # Edit content and execute code
}
```

### Queries

#### Get Current User

```graphql
query {
  me {
    id
    email
    name
  }
}
```

#### List Runbooks

```graphql
query {
  runbooks(
    owned: Boolean # Filter to owned runbooks
    shared: Boolean # Filter to shared runbooks
    limit: Int # Pagination limit (default: 50)
    offset: Int # Pagination offset (default: 0)
  ) {
    ulid
    title
    owner {
      id
      email
    }
    myPermission
    createdAt
  }
}
```

#### Get Specific Runbook

```graphql
query {
  runbook(ulid: "01K2Q9V9A5GFDX61XF2FS1W6B4") {
    ulid
    title
    owner {
      id
      email
      name
    }
    collaborators {
      id
      email
    }
    myPermission
    createdAt
    updatedAt
  }
}
```

### Mutations

#### Create Runbook

```graphql
mutation {
  createRunbook(input: { title: "My New Runbook" }) {
    ulid
    title
    owner {
      id
    }
    createdAt
  }
}
```

#### Update Runbook

```graphql
mutation {
  updateRunbook(
    ulid: "01K2Q9V9A5GFDX61XF2FS1W6B4"
    input: { title: "Updated Title" }
  ) {
    ulid
    title
    updatedAt
  }
}
```

#### Share Runbook

```graphql
mutation {
  shareRunbook(
    input: { runbookUlid: "01K2Q9V9A5GFDX61XF2FS1W6B4", userId: "user-123" }
  )
}
```

#### Remove Access

```graphql
mutation {
  unshareRunbook(
    input: { runbookUlid: "01K2Q9V9A5GFDX61XF2FS1W6B4", userId: "user-123" }
  )
}
```

#### Delete Runbook

```graphql
mutation {
  deleteRunbook(ulid: "01K2Q9V9A5GFDX61XF2FS1W6B4")
}
```

## Examples

### Create and List Runbooks

```bash
# Create a new runbook
curl -X POST http://localhost:8787/graphql \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createRunbook(input: { title: \"Data Analysis\" }) { ulid title createdAt } }"
  }'
```

Response:

```json
{
  "data": {
    "createRunbook": {
      "ulid": "01K2Q9V9A5GFDX61XF2FS1W6B4",
      "title": "Data Analysis",
      "createdAt": "2025-01-15T16:43:43.813Z"
    }
  }
}
```

### Query with Filtering

```bash
# Get only owned runbooks
curl -X POST http://localhost:8787/graphql \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { runbooks(owned: true, limit: 10) { ulid title myPermission } }"
  }'
```

Response:

```json
{
  "data": {
    "runbooks": [
      {
        "ulid": "01K2Q9V9A5GFDX61XF2FS1W6B4",
        "title": "Data Analysis",
        "myPermission": "OWNER"
      }
    ]
  }
}
```

## Error Handling

### Authentication Errors

```json
{
  "errors": [
    {
      "message": "Missing or invalid Authorization header",
      "extensions": { "code": "UNAUTHENTICATED" }
    }
  ]
}
```

### Permission Errors

```json
{
  "errors": [
    {
      "message": "Only the owner can delete a runbook",
      "locations": [{ "line": 1, "column": 12 }],
      "path": ["deleteRunbook"]
    }
  ]
}
```

### Not Found Errors

```json
{
  "errors": [
    {
      "message": "Runbook not found or access denied",
      "locations": [{ "line": 1, "column": 9 }],
      "path": ["runbook"]
    }
  ]
}
```

## Permissions Model

- **OWNER**: Created the runbook, can perform all operations
- **WRITER**: Granted access by owner, can edit content but not metadata/permissions
- **Access Control**: Users can only see runbooks they own or have been granted access to

## Notes

- ULIDs are time-sortable and URL-safe
- All timestamps are in ISO 8601 format
- Pagination uses limit/offset pattern
- Legacy `/?notebook=id` URLs continue to work
- Vanity names are reserved for future URL slugs (`/r/{ulid}/{vanity-name}`)

## GraphQL Introspection

The API supports GraphQL introspection for schema exploration:

```graphql
query {
  __schema {
    types {
      name
      fields {
        name
        type {
          name
        }
      }
    }
  }
}
```

## Development

For local development, the GraphQL endpoint is available at:

- **Backend**: `http://localhost:8787/graphql`
- **GraphiQL**: Available when `NODE_ENV=development`

Use the `RUNT_API_KEY` from your `.env` file for authentication during development.
