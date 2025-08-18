import type { DocumentNode } from 'graphql';
import * as Urql from 'urql';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

/** Input for creating a new runbook */
export type CreateRunbookInput = {
  /** Title for the new runbook */
  title: Scalars['String']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Create a new runbook */
  createRunbook: Runbook;
  /** Delete a runbook (owner only) */
  deleteRunbook: Scalars['Boolean']['output'];
  /** Share a runbook with another user (owner only) */
  shareRunbook: Scalars['Boolean']['output'];
  /** Remove user access from a runbook (owner only) */
  unshareRunbook: Scalars['Boolean']['output'];
  /** Update runbook metadata (title, etc.) */
  updateRunbook: Runbook;
};


export type MutationCreateRunbookArgs = {
  input: CreateRunbookInput;
};


export type MutationDeleteRunbookArgs = {
  ulid: Scalars['ID']['input'];
};


export type MutationShareRunbookArgs = {
  input: ShareRunbookInput;
};


export type MutationUnshareRunbookArgs = {
  input: UnshareRunbookInput;
};


export type MutationUpdateRunbookArgs = {
  input: UpdateRunbookInput;
  ulid: Scalars['ID']['input'];
};

/** Permission levels for runbook access */
export enum PermissionLevel {
  None = 'NONE',
  Owner = 'OWNER',
  Writer = 'WRITER'
}

/**
 * Private user information (only for current user's own profile)
 * Includes sensitive data like email address
 */
export type PrivateUser = {
  __typename?: 'PrivateUser';
  /** User's email address (private) */
  email: Scalars['String']['output'];
  /** User's family name */
  familyName?: Maybe<Scalars['String']['output']>;
  /** User's given name */
  givenName?: Maybe<Scalars['String']['output']>;
  /** Unique user identifier */
  id: Scalars['ID']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** Get the current authenticated user (includes private data like email) */
  me: PrivateUser;
  /** Get a specific runbook by its ULID */
  runbook?: Maybe<Runbook>;
  /** Get runbooks accessible to the current user */
  runbooks: Array<Runbook>;
};


export type QueryRunbookArgs = {
  ulid: Scalars['ID']['input'];
};


export type QueryRunbooksArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  owned?: InputMaybe<Scalars['Boolean']['input']>;
  shared?: InputMaybe<Scalars['Boolean']['input']>;
};

/** A computational notebook (runbook) with cells, outputs, and collaboration features */
export type Runbook = {
  __typename?: 'Runbook';
  /** Users who have write access to this runbook */
  collaborators: Array<User>;
  /** Timestamp when the runbook was created */
  createdAt: Scalars['String']['output'];
  /** Current user's permission level for this runbook */
  myPermission: PermissionLevel;
  /** User who owns this runbook */
  owner: User;
  /** Human-readable title of the runbook */
  title?: Maybe<Scalars['String']['output']>;
  /** Unique ULID identifier for the runbook */
  ulid: Scalars['ID']['output'];
  /** Timestamp when the runbook was last updated */
  updatedAt: Scalars['String']['output'];
};

/** Input for sharing a runbook with another user */
export type ShareRunbookInput = {
  /** ULID of the runbook to share */
  runbookUlid: Scalars['ID']['input'];
  /** User ID to grant access to */
  userId: Scalars['ID']['input'];
};

/** Input for removing access from a runbook */
export type UnshareRunbookInput = {
  /** ULID of the runbook to remove access from */
  runbookUlid: Scalars['ID']['input'];
  /** User ID to remove access from */
  userId: Scalars['ID']['input'];
};

/** Input for updating runbook metadata */
export type UpdateRunbookInput = {
  /** New title for the runbook */
  title?: InputMaybe<Scalars['String']['input']>;
};

/**
 * Public user information (safe for sharing in runbook contexts)
 * Does not include email to prevent privacy leaks
 */
export type User = {
  __typename?: 'User';
  /** User's family name */
  familyName?: Maybe<Scalars['String']['output']>;
  /** User's given name */
  givenName?: Maybe<Scalars['String']['output']>;
  /** Unique user identifier */
  id: Scalars['ID']['output'];
};

export type RunbookFieldsFragment = { __typename?: 'Runbook', ulid: string, title?: string | null, myPermission: PermissionLevel, createdAt: string, updatedAt: string, owner: { __typename?: 'User', id: string, givenName?: string | null, familyName?: string | null }, collaborators: Array<{ __typename?: 'User', id: string, givenName?: string | null, familyName?: string | null }> };

export type ListRunbooksQueryVariables = Exact<{
  owned?: InputMaybe<Scalars['Boolean']['input']>;
  shared?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ListRunbooksQuery = { __typename?: 'Query', runbooks: Array<{ __typename?: 'Runbook', ulid: string, title?: string | null, myPermission: PermissionLevel, createdAt: string, updatedAt: string, owner: { __typename?: 'User', id: string, givenName?: string | null, familyName?: string | null }, collaborators: Array<{ __typename?: 'User', id: string, givenName?: string | null, familyName?: string | null }> }> };

export type GetRunbookQueryVariables = Exact<{
  ulid: Scalars['ID']['input'];
}>;


export type GetRunbookQuery = { __typename?: 'Query', runbook?: { __typename?: 'Runbook', ulid: string, title?: string | null, myPermission: PermissionLevel, createdAt: string, updatedAt: string, owner: { __typename?: 'User', id: string, givenName?: string | null, familyName?: string | null }, collaborators: Array<{ __typename?: 'User', id: string, givenName?: string | null, familyName?: string | null }> } | null };

export type GetMeQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMeQuery = { __typename?: 'Query', me: { __typename?: 'PrivateUser', id: string, email: string, givenName?: string | null, familyName?: string | null } };

export type CreateRunbookMutationVariables = Exact<{
  input: CreateRunbookInput;
}>;


export type CreateRunbookMutation = { __typename?: 'Mutation', createRunbook: { __typename?: 'Runbook', ulid: string, title?: string | null, myPermission: PermissionLevel, createdAt: string, updatedAt: string, owner: { __typename?: 'User', id: string, givenName?: string | null, familyName?: string | null }, collaborators: Array<{ __typename?: 'User', id: string, givenName?: string | null, familyName?: string | null }> } };

export type UpdateRunbookMutationVariables = Exact<{
  ulid: Scalars['ID']['input'];
  input: UpdateRunbookInput;
}>;


export type UpdateRunbookMutation = { __typename?: 'Mutation', updateRunbook: { __typename?: 'Runbook', ulid: string, title?: string | null, myPermission: PermissionLevel, createdAt: string, updatedAt: string, owner: { __typename?: 'User', id: string, givenName?: string | null, familyName?: string | null }, collaborators: Array<{ __typename?: 'User', id: string, givenName?: string | null, familyName?: string | null }> } };

export type DeleteRunbookMutationVariables = Exact<{
  ulid: Scalars['ID']['input'];
}>;


export type DeleteRunbookMutation = { __typename?: 'Mutation', deleteRunbook: boolean };

export type ShareRunbookMutationVariables = Exact<{
  input: ShareRunbookInput;
}>;


export type ShareRunbookMutation = { __typename?: 'Mutation', shareRunbook: boolean };

export type UnshareRunbookMutationVariables = Exact<{
  input: UnshareRunbookInput;
}>;


export type UnshareRunbookMutation = { __typename?: 'Mutation', unshareRunbook: boolean };

export const RunbookFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RunbookFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Runbook"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ulid"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"myPermission"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"givenName"}},{"kind":"Field","name":{"kind":"Name","value":"familyName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"collaborators"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"givenName"}},{"kind":"Field","name":{"kind":"Name","value":"familyName"}}]}}]}}]} as unknown as DocumentNode;
export const ListRunbooksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListRunbooks"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"owned"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"shared"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"runbooks"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"owned"},"value":{"kind":"Variable","name":{"kind":"Name","value":"owned"}}},{"kind":"Argument","name":{"kind":"Name","value":"shared"},"value":{"kind":"Variable","name":{"kind":"Name","value":"shared"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RunbookFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RunbookFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Runbook"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ulid"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"myPermission"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"givenName"}},{"kind":"Field","name":{"kind":"Name","value":"familyName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"collaborators"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"givenName"}},{"kind":"Field","name":{"kind":"Name","value":"familyName"}}]}}]}}]} as unknown as DocumentNode;

export function useListRunbooksQuery(options?: Omit<Urql.UseQueryArgs<ListRunbooksQueryVariables>, 'query'>) {
  return Urql.useQuery<ListRunbooksQuery, ListRunbooksQueryVariables>({ query: ListRunbooksDocument, ...options });
};
export const GetRunbookDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRunbook"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ulid"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"runbook"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ulid"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ulid"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RunbookFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RunbookFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Runbook"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ulid"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"myPermission"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"givenName"}},{"kind":"Field","name":{"kind":"Name","value":"familyName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"collaborators"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"givenName"}},{"kind":"Field","name":{"kind":"Name","value":"familyName"}}]}}]}}]} as unknown as DocumentNode;

export function useGetRunbookQuery(options: Omit<Urql.UseQueryArgs<GetRunbookQueryVariables>, 'query'>) {
  return Urql.useQuery<GetRunbookQuery, GetRunbookQueryVariables>({ query: GetRunbookDocument, ...options });
};
export const GetMeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMe"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"givenName"}},{"kind":"Field","name":{"kind":"Name","value":"familyName"}}]}}]}}]} as unknown as DocumentNode;

export function useGetMeQuery(options?: Omit<Urql.UseQueryArgs<GetMeQueryVariables>, 'query'>) {
  return Urql.useQuery<GetMeQuery, GetMeQueryVariables>({ query: GetMeDocument, ...options });
};
export const CreateRunbookDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateRunbook"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateRunbookInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createRunbook"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RunbookFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RunbookFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Runbook"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ulid"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"myPermission"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"givenName"}},{"kind":"Field","name":{"kind":"Name","value":"familyName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"collaborators"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"givenName"}},{"kind":"Field","name":{"kind":"Name","value":"familyName"}}]}}]}}]} as unknown as DocumentNode;

export function useCreateRunbookMutation() {
  return Urql.useMutation<CreateRunbookMutation, CreateRunbookMutationVariables>(CreateRunbookDocument);
};
export const UpdateRunbookDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateRunbook"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ulid"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateRunbookInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateRunbook"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ulid"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ulid"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RunbookFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RunbookFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Runbook"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ulid"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"myPermission"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"givenName"}},{"kind":"Field","name":{"kind":"Name","value":"familyName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"collaborators"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"givenName"}},{"kind":"Field","name":{"kind":"Name","value":"familyName"}}]}}]}}]} as unknown as DocumentNode;

export function useUpdateRunbookMutation() {
  return Urql.useMutation<UpdateRunbookMutation, UpdateRunbookMutationVariables>(UpdateRunbookDocument);
};
export const DeleteRunbookDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteRunbook"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ulid"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteRunbook"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ulid"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ulid"}}}]}]}}]} as unknown as DocumentNode;

export function useDeleteRunbookMutation() {
  return Urql.useMutation<DeleteRunbookMutation, DeleteRunbookMutationVariables>(DeleteRunbookDocument);
};
export const ShareRunbookDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ShareRunbook"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ShareRunbookInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"shareRunbook"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode;

export function useShareRunbookMutation() {
  return Urql.useMutation<ShareRunbookMutation, ShareRunbookMutationVariables>(ShareRunbookDocument);
};
export const UnshareRunbookDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnshareRunbook"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UnshareRunbookInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unshareRunbook"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode;

export function useUnshareRunbookMutation() {
  return Urql.useMutation<UnshareRunbookMutation, UnshareRunbookMutationVariables>(UnshareRunbookDocument);
};