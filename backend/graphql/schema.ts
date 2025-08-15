export const typeDefs = /* GraphQL */ `
  """
  A computational notebook (runbook) with cells, outputs, and collaboration features
  """
  type Runbook {
    """
    Unique ULID identifier for the runbook
    """
    ulid: ID!

    """
    Human-readable title of the runbook
    """
    title: String

    """
    URL-friendly vanity name (reserved for future use)
    """
    vanityName: String

    """
    User who owns this runbook
    """
    owner: User!

    """
    Users who have write access to this runbook
    """
    collaborators: [User!]!

    """
    Current user's permission level for this runbook
    """
    myPermission: PermissionLevel!

    """
    Timestamp when the runbook was created
    """
    createdAt: String!

    """
    Timestamp when the runbook was last updated
    """
    updatedAt: String!
  }

  """
  User information
  """
  type User {
    """
    Unique user identifier
    """
    id: ID!

    """
    User's email address
    """
    email: String!

    """
    User's display name
    """
    name: String

    """
    User's given name
    """
    givenName: String

    """
    User's family name
    """
    familyName: String
  }

  """
  Permission levels for runbook access
  """
  enum PermissionLevel {
    OWNER
    WRITER
    NONE
  }

  """
  Input for creating a new runbook
  """
  input CreateRunbookInput {
    """
    Title for the new runbook
    """
    title: String!
  }

  """
  Input for updating runbook metadata
  """
  input UpdateRunbookInput {
    """
    New title for the runbook
    """
    title: String
  }

  """
  Input for sharing a runbook with another user
  """
  input ShareRunbookInput {
    """
    ULID of the runbook to share
    """
    runbookUlid: ID!

    """
    User ID to grant access to
    """
    userId: ID!
  }

  """
  Input for removing access from a runbook
  """
  input UnshareRunbookInput {
    """
    ULID of the runbook to remove access from
    """
    runbookUlid: ID!

    """
    User ID to remove access from
    """
    userId: ID!
  }

  type Query {
    """
    Get runbooks accessible to the current user
    """
    runbooks(
      """
      Filter to only runbooks owned by the current user
      """
      owned: Boolean

      """
      Filter to only runbooks shared with the current user (not owned)
      """
      shared: Boolean

      """
      Limit the number of results
      """
      limit: Int

      """
      Offset for pagination
      """
      offset: Int
    ): [Runbook!]!

    """
    Get a specific runbook by its ULID
    """
    runbook(ulid: ID!): Runbook

    """
    Get the current authenticated user
    """
    me: User!
  }

  type Mutation {
    """
    Create a new runbook
    """
    createRunbook(input: CreateRunbookInput!): Runbook!

    """
    Update runbook metadata (title, etc.)
    """
    updateRunbook(ulid: ID!, input: UpdateRunbookInput!): Runbook!

    """
    Delete a runbook (owner only)
    """
    deleteRunbook(ulid: ID!): Boolean!

    """
    Share a runbook with another user (owner only)
    """
    shareRunbook(input: ShareRunbookInput!): Boolean!

    """
    Remove user access from a runbook (owner only)
    """
    unshareRunbook(input: UnshareRunbookInput!): Boolean!
  }
`;
