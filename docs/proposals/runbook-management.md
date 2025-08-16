# Runbook Management System

## Overview

Replaces ephemeral notebooks with managed runbooks featuring ownership, permissions, and GraphQL API.

## Architecture

### Database Schema (D1)

```sql
CREATE TABLE runbooks (
  ulid TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
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

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  given_name TEXT,
  family_name TEXT,
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Permissions Architecture

- **Provider Pattern**: `LocalPermissionsProvider` (D1) / `AnacondaPermissionsProvider` (SpiceDB)
- **Permissions-First Queries**: Query permissions provider first, then filter D1 results
- **Two Levels**: `owner` (full control), `writer` (edit access)

### URL Structure

- **Current**: `/?notebook={id}` (legacy, continues working)
- **Planned**: `/r/{ulid}/{vanity-name}` (vanity name is URL dressing only)

## GraphQL API

### Schema

```graphql
type Runbook {
  ulid: ID!
  title: String
  owner: User!
  collaborators: [User!]!
  myPermission: PermissionLevel!
  createdAt: String!
  updatedAt: String!
}

type User {
  id: ID!
  givenName: String
  familyName: String
}

type PrivateUser {
  id: ID!
  email: String!
  givenName: String
  familyName: String
}

enum PermissionLevel {
  OWNER
  WRITER
  NONE
}

type Query {
  runbooks(owned: Boolean, shared: Boolean): [Runbook!]!
  runbook(ulid: ID!): Runbook
  me: PrivateUser!
}

type Mutation {
  createRunbook(input: CreateRunbookInput!): Runbook!
  updateRunbook(ulid: ID!, input: UpdateRunbookInput!): Runbook!
  deleteRunbook(ulid: ID!): Boolean!
  shareRunbook(input: ShareRunbookInput!): Boolean!
  unshareRunbook(input: UnshareRunbookInput!): Boolean!
}
```

### Privacy

- **Public User Type**: No email field (prevents privacy leaks in runbook listings)
- **Private User Type**: Includes email (own profile only)
- **Schema Enforcement**: Cannot query email on other users

## User Registry

- **Auth-Layer Upserts**: Users registered automatically on authentication (OAuth or API key)
- **Privacy-Safe Utilities**: Public user queries exclude email fields
- **Calculated Display Names**: Frontend computes display names from `givenName` + `familyName`

## Implementation Status

- ✅ GraphQL API with CRUD operations
- ✅ D1 database schema and migrations
- ✅ LocalPermissionsProvider implementation
- ✅ User registry with privacy controls
- ✅ Permissions-first query architecture
- ✅ Preview environment deployed
- 🔄 Frontend `/r/{ulid}` routing (pending)
- 🔄 LiveStore permission integration (pending)
- 🔄 AnacondaPermissionsProvider with SpiceDB (pending)

## Current Environment

- **Preview**: Anaconda OAuth + LocalPermissionsProvider fallback
- **Local**: Local OIDC + LocalPermissionsProvider
