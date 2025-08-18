# Type-Safe GraphQL with urql and GraphQL Codegen

This project now uses [GraphQL Codegen](https://the-guild.dev/graphql/codegen) to generate type-safe hooks for urql, providing full TypeScript support for GraphQL operations.

## Setup

The type-safe GraphQL setup consists of:

1. **GraphQL Schema**: `schema.graphql` - Contains the GraphQL schema definition
2. **Codegen Configuration**: `codegen.ts` - Configures how types and hooks are generated
3. **Generated Types**: `src/generated/graphql.ts` - Auto-generated TypeScript types and hooks
4. **Query Definitions**: `src/queries/runbooks.ts` - GraphQL operations using `gql` template literals

## Generated Files

### Types

- `Runbook`, `User`, `PrivateUser` - Entity types
- `CreateRunbookInput`, `UpdateRunbookInput` - Input types
- `PermissionLevel` - Enum types
- Query/Mutation result types with full type safety

### Hooks

- `useListRunbooksQuery()` - Type-safe query hook
- `useGetRunbookQuery()` - Type-safe query hook
- `useCreateRunbookMutation()` - Type-safe mutation hook
- `useUpdateRunbookMutation()` - Type-safe mutation hook
- And more...

## Usage

### Before (Manual urql hooks)

```typescript
import { useQuery, useMutation } from "urql";
import { LIST_RUNBOOKS, CREATE_RUNBOOK } from "../queries/runbooks";

// No type safety for variables or return data
const [{ data, fetching, error }] = useQuery({
  query: LIST_RUNBOOKS,
  variables: { owned: true }, // No type checking
});

const [, createRunbook] = useMutation(CREATE_RUNBOOK);
```

### After (Type-safe generated hooks)

```typescript
import {
  useListRunbooksQuery,
  useCreateRunbookMutation,
} from "../queries/runbooks";

// Full type safety for variables and return data
const [{ data, fetching, error }] = useListRunbooksQuery({
  variables: {
    owned: true, // TypeScript validates this is boolean
    limit: 10, // TypeScript validates this is number
  },
});

const [, createRunbook] = useCreateRunbookMutation();

// Type-safe mutation with validated input
const result = await createRunbook({
  input: { title: "New Runbook" }, // TypeScript validates input structure
});

// Full type safety on response data
if (result.data?.createRunbook) {
  const runbook = result.data.createRunbook;
  console.log(runbook.ulid); // TypeScript knows this is string
  console.log(runbook.title); // TypeScript knows this is string | null
  console.log(runbook.myPermission); // TypeScript knows this is PermissionLevel enum
}
```

## Benefits

1. **Type Safety**: TypeScript catches errors at compile time
2. **IntelliSense**: Full autocomplete for all fields and variables
3. **Refactoring Safety**: Renaming fields in GraphQL schema updates all TypeScript code
4. **Documentation**: Generated types serve as living documentation
5. **Error Prevention**: Prevents runtime errors from typos or invalid field access

## Development Workflow

### Adding New Queries/Mutations

1. Add the GraphQL operation to a `.ts` file using `gql`:

   ```typescript
   import { gql } from "urql";

   export const NEW_QUERY = gql`
     query NewQuery($id: ID!) {
       someField(id: $id) {
         id
         name
       }
     }
   `;
   ```

2. Run codegen to generate types and hooks:

   ```bash
   pnpm codegen
   ```

3. Import and use the generated hook:

   ```typescript
   import { useNewQueryQuery } from "../queries/runbooks";

   const [{ data }] = useNewQueryQuery({ variables: { id: "123" } });
   ```

### Updating Schema

1. Modify `schema.graphql`
2. Run `pnpm codegen` to regenerate types
3. TypeScript will show errors for any breaking changes
4. Update your code to match the new schema

### Watch Mode

For development, you can run codegen in watch mode:

```bash
pnpm codegen:watch
```

This will automatically regenerate types when you modify GraphQL operations.

## Migration Guide

To migrate existing components:

1. Replace manual `useQuery`/`useMutation` calls with generated hooks
2. Update imports to use generated types
3. Remove manual type definitions (they're now generated)
4. Update variable types to use generated interfaces

Example migration:

```typescript
// Before
import { useQuery } from "urql";
import { LIST_RUNBOOKS } from "../queries/runbooks";

const [{ data }] = useQuery({ query: LIST_RUNBOOKS });

// After
import { useListRunbooksQuery } from "../queries/runbooks";

const [{ data }] = useListRunbooksQuery();
```

## Configuration

The codegen configuration in `codegen.ts` includes:

- `withHooks: true` - Generate React hooks
- `withComponent: false` - Don't generate components (using hooks instead)
- `documentMode: 'documentNode'` - Generate optimized document nodes
- `useTypeImports: true` - Use `import type` for better tree-shaking
- `dedupeOperationSuffix: true` - Remove duplicate suffixes
- `dedupeFragments: true` - Optimize fragment usage

## Troubleshooting

### Type Errors

If you get type errors after running codegen:

1. Make sure your GraphQL operations match the schema
2. Check that all required fields are selected
3. Verify variable types match the schema

### Missing Types

If types are missing:

1. Run `pnpm codegen` to regenerate
2. Check that your GraphQL operations are in the `documents` pattern
3. Verify the schema file is correct

### Performance

The generated code is optimized for:

- Tree-shaking (unused code elimination)
- Bundle size (minimal runtime overhead)
- Type safety (compile-time validation)
