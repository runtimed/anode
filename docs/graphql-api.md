# GraphQL API

## Endpoint

- **URL**: `/graphql`
- **Method**: `POST`
- **Authentication**: `Authorization: Bearer <token>`

## Schema

### Types

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
```

### Operations

```graphql
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

## Examples

### Create Runbook

```bash
curl -X POST /graphql \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query": "mutation { createRunbook(input: { title: \"Test\" }) { ulid title } }"}'
```

### List Runbooks

```bash
curl -X POST /graphql \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query": "query { runbooks { ulid title owner { givenName familyName } } }"}'
```

### Get User Profile

```bash
curl -X POST /graphql \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query": "query { me { id email givenName familyName } }"}'
```

## Privacy

- `User` type excludes email (used for owner/collaborators)
- `PrivateUser` type includes email (own profile only)
- Schema prevents accidental email exposure in runbook queries

## Authentication

- API Keys: Validated against configured provider
- OAuth Tokens: JWT validation with issuer verification
- User registry populated automatically on authentication
