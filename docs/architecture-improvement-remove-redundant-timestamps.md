# Architecture Improvement: Remove Manual `notebookLastModified` Fields

## Problem

Currently, our schema requires `notebookLastModified` fields on every cell-related event:

```typescript
cellCreated: Events.synced({
  name: 'v1.CellCreated',
  schema: Schema.Struct({
    id: Schema.String,
    cellType: Schema.Literal('code', 'markdown', 'raw', 'sql', 'ai'),
    position: Schema.Number,
    createdBy: Schema.String,
    notebookLastModified: Schema.Date, // <- This is redundant!
  }),
}),
```

This creates several issues:
- **Redundant data**: LiveStore already tracks event timestamps
- **Error-prone**: Easy to forget or set incorrectly (as we just experienced)
- **Maintenance burden**: Every event commit needs manual timestamp management
- **Schema bloat**: Extra field on every event
- **Runtime errors**: Schema validation failures when field is missing

## Solution: Use Event Metadata Timestamps

LiveStore materializers already have access to event metadata including timestamps via the `context.event` parameter. We can derive `notebookLastModified` from the event timestamp instead of storing it manually.

### Step 1: Update Schema - Remove Manual Fields

```typescript
// Remove notebookLastModified from all events
cellCreated: Events.synced({
  name: 'v1.CellCreated',
  schema: Schema.Struct({
    id: Schema.String,
    cellType: Schema.Literal('code', 'markdown', 'raw', 'sql', 'ai'),
    position: Schema.Number,
    createdBy: Schema.String,
    // notebookLastModified: removed!
  }),
}),

cellSourceChanged: Events.synced({
  name: 'v1.CellSourceChanged',
  schema: Schema.Struct({
    id: Schema.String,
    source: Schema.String,
    modifiedBy: Schema.String,
    // notebookLastModified: removed!
  }),
}),

// Apply same pattern to cellDeleted, cellMoved, cellTypeChanged, etc.
```

### Step 2: Update Materializers - Use Event Timestamps

```typescript
const materializers = State.SQLite.materializers(events, {
  'v1.CellCreated': ({ id, cellType, position, createdBy, createdAt }, ctx) => [
    tables.cells.insert({
      id,
      cellType,
      position,
      createdBy,
    }),
    // Use event timestamp for notebook lastModified
    tables.notebook.update({
      lastModified: new Date(ctx.event.timestamp) // <-- Use event metadata!
    }),
  ],

  'v1.CellSourceChanged': ({ id, source }, ctx) => [
    tables.cells.update({ source }).where({ id }),
    tables.notebook.update({
      lastModified: new Date(ctx.event.timestamp) // <-- Consistent!
    }),
  ],

  'v1.CellDeleted': ({ id, }, ctx) => [
    tables.cells.update({ deletedAt }).where({ id }),
    tables.notebook.update({
      lastModified: new Date(ctx.event.timestamp)
    }),
  ],

  // Similar pattern for all cell-related events...
})
```

### Step 3: Simplify Event Creation

```typescript
// Before: Error-prone manual timestamp management
store.commit(events.cellCreated({
  id: cellId,
  position: newPosition,
  cellType,
  createdBy: 'current-user',
  notebookLastModified: new Date(), // Manual, error-prone
}))

// After: Clean, automatic timestamp handling
store.commit(events.cellCreated({
  id: cellId,
  position: newPosition,
  cellType,
  createdBy: 'current-user',
  // notebookLastModified automatically derived from event timestamp!
}))
```

### Step 4: Create Helper for Consistent Patterns

```typescript
// Helper function to reduce boilerplate in materializers
const updateNotebookLastModified = (ctx: MaterializerContext) =>
  tables.notebook.update({
    lastModified: new Date(ctx.event.timestamp)
  })

const materializers = State.SQLite.materializers(events, {
  'v1.CellCreated': ({ id, cellType, position, createdBy }, ctx) => [
    tables.cells.insert({ id, cellType, position, createdBy }),
    updateNotebookLastModified(ctx),
  ],

  'v1.CellSourceChanged': ({ id, source }, ctx) => [
    tables.cells.update({ source }).where({ id }),
    updateNotebookLastModified(ctx),
  ],

  // Pattern repeats cleanly for all cell events...
})
```

## Benefits

1. **DRY Principle**: Single source of truth for event timing
2. **Automatic Consistency**: No manual timestamp management
3. **Cleaner Schema**: Fewer fields, less complexity
4. **Better Developer Experience**: No more runtime schema validation errors
5. **Leverages LiveStore**: Uses built-in event metadata as intended
6. **Future-Proof**: If LiveStore adds more event metadata, we can use it

## Migration Strategy

1. **Phase 1**: Add new materializers using event timestamps (parallel to existing)
2. **Phase 2**: Update client code to stop passing `notebookLastModified`
3. **Phase 3**: Remove `notebookLastModified` from event schemas
4. **Phase 4**: Clean up old materializer code

This is a non-breaking migration since we're removing fields from events (which LiveStore supports) and the computed result will be the same.

## Build-Time Validation Opportunities

This also opens up opportunities for build-time validation:

1. **TypeScript Event Helpers**: Create strongly-typed helpers that enforce required fields
2. **Schema Linting**: Build-time checks that events don't contain redundant timestamp fields
3. **Materializer Validation**: Ensure all cell events update notebook timestamp
4. **Testing**: Automated tests that verify event timestamp derivation works correctly

## Conclusion

By leveraging LiveStore's built-in event metadata, we eliminate a major source of runtime errors and maintenance burden while creating cleaner, more maintainable code. This follows the principle of using the framework's capabilities rather than fighting against them.

The notebook's `lastModified` time should be a derived value, not manually maintained state.
