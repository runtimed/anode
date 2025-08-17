import { gql } from "urql";

// Fragment for runbook fields
export const RUNBOOK_FRAGMENT = gql`
  fragment RunbookFields on Runbook {
    ulid
    title
    myPermission
    createdAt
    updatedAt
    owner {
      id
      givenName
      familyName
    }
    collaborators {
      id
      givenName
      familyName
    }
  }
`;

// Query to list runbooks
export const LIST_RUNBOOKS = gql`
  ${RUNBOOK_FRAGMENT}
  query ListRunbooks(
    $owned: Boolean
    $shared: Boolean
    $limit: Int
    $offset: Int
  ) {
    runbooks(owned: $owned, shared: $shared, limit: $limit, offset: $offset) {
      ...RunbookFields
    }
  }
`;

// Query to get a single runbook
export const GET_RUNBOOK = gql`
  ${RUNBOOK_FRAGMENT}
  query GetRunbook($ulid: ID!) {
    runbook(ulid: $ulid) {
      ...RunbookFields
    }
  }
`;

// Query to get current user
export const GET_ME = gql`
  query GetMe {
    me {
      id
      email
      givenName
      familyName
    }
  }
`;

// Mutation to create a new runbook
export const CREATE_RUNBOOK = gql`
  ${RUNBOOK_FRAGMENT}
  mutation CreateRunbook($input: CreateRunbookInput!) {
    createRunbook(input: $input) {
      ...RunbookFields
    }
  }
`;

// Mutation to update a runbook
export const UPDATE_RUNBOOK = gql`
  ${RUNBOOK_FRAGMENT}
  mutation UpdateRunbook($ulid: ID!, $input: UpdateRunbookInput!) {
    updateRunbook(ulid: $ulid, input: $input) {
      ...RunbookFields
    }
  }
`;

// Mutation to delete a runbook
export const DELETE_RUNBOOK = gql`
  mutation DeleteRunbook($ulid: ID!) {
    deleteRunbook(ulid: $ulid)
  }
`;

// Mutation to share a runbook
export const SHARE_RUNBOOK = gql`
  mutation ShareRunbook($input: ShareRunbookInput!) {
    shareRunbook(input: $input)
  }
`;

// Mutation to unshare a runbook
export const UNSHARE_RUNBOOK = gql`
  mutation UnshareRunbook($input: UnshareRunbookInput!) {
    unshareRunbook(input: $input)
  }
`;

// Type definitions for TypeScript
export interface User {
  id: string;
  givenName?: string;
  familyName?: string;
}

export interface PrivateUser extends User {
  email: string;
}

export interface Runbook {
  ulid: string;
  title: string;
  myPermission: "OWNER" | "WRITER" | "NONE";
  createdAt: string;
  updatedAt: string;
  owner: User;
  collaborators: User[];
}

export interface CreateRunbookInput {
  title: string;
}

export interface UpdateRunbookInput {
  title?: string;
}

export interface ShareRunbookInput {
  runbookUlid: string;
  userId: string;
}

export interface UnshareRunbookInput {
  runbookUlid: string;
  userId: string;
}
