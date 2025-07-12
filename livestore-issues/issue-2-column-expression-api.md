# Issue 2: Feature Request - Column Expression API for Safe Database Operations

## Problem Statement

LiveStore materializers require deterministic, pure functions but common database operations like string concatenation, numeric increments, and JSON updates currently force developers into problematic patterns that either break determinism or compromise security.

## Current Limitations

**No safe way to reference existing column values in materializers:**

```typescript
// ❌ Non-deterministic (causes hash mismatches)
"v1.CounterIncremented": ({ id }, ctx) => {
  const current = ctx.query(tables.counters.select().where({ id }).limit(1))[0];
  return tables.counters.update({ count: current.count + 1 }).where({ id });
}

// ❌ Security risk (SQL injection potential)
"v1.CounterIncremented": ({ id }) =>
  tables.counters.update({ count: sql`count + 1` }).where({ id })

// ✅ Works but verbose (event payload bloat)
"v1.CounterIncremented": ({ id, previousCount }) =>
  tables.counters.update({ count: previousCount + 1 }).where({ id })
```

## Proposed Solution

Add a **Column Expression API** that provides type-safe, deterministic column operations:

```typescript
import { Column } from "@livestore/column-expressions";

const materializers = State.SQLite.materializers(events, {
  // String concatenation
  "v1.LogAppended": ({ id, message }) =>
    tables.logs.update({ 
      content: Column.concat(Column.ref('content'), message) 
    }).where({ id }),

  // Numeric operations  
  "v1.CounterIncremented": ({ id }) =>
    tables.counters.update({ 
      count: Column.add(Column.ref('count'), 1),
      lastUpdated: Column.now()
    }).where({ id }),

  // JSON updates
  "v1.MetadataUpdated": ({ id, patch }) =>
    tables.records.update({ 
      metadata: Column.jsonMerge(Column.ref('metadata'), patch) 
    }).where({ id }),

  // Conditional logic
  "v1.StatusChanged": ({ id, newStatus }) =>
    tables.tasks.update({
      status: newStatus,
      completedAt: Column.when(Column.eq(newStatus, 'completed'))
        .then(Column.now())
        .else(Column.ref('completedAt'))
    }).where({ id }),
});
```

## API Design

### Core Operations
```typescript
namespace Column {
  // Column reference
  ref<T>(columnName: string): ColumnExpression<T>
  
  // String operations
  concat(...expressions: ColumnExpression<string>[]): ColumnExpression<string>
  coalesce<T>(...expressions: ColumnExpression<T>[]): ColumnExpression<T>
  
  // Numeric operations
  add(left: ColumnExpression<number>, right: number | ColumnExpression<number>): ColumnExpression<number>
  subtract(left: ColumnExpression<number>, right: number | ColumnExpression<number>): ColumnExpression<number>
  multiply(left: ColumnExpression<number>, right: number | ColumnExpression<number>): ColumnExpression<number>
  
  // Convenience methods
  increment(amount?: number): ColumnExpression<number> // Column.add(Column.ref('column'), amount)
  
  // Comparison operations
  eq<T>(left: ColumnExpression<T>, right: T | ColumnExpression<T>): ColumnExpression<boolean>
  gt(left: ColumnExpression<number>, right: number | ColumnExpression<number>): ColumnExpression<boolean>
  lt(left: ColumnExpression<number>, right: number | ColumnExpression<number>): ColumnExpression<boolean>
  
  // Conditional operations
  when(condition: ColumnExpression<boolean>): ConditionalExpression<T>
  
  // Utility functions
  now(): ColumnExpression<Date>
  uuid(): ColumnExpression<string>
}
```

### Type Safety
```typescript
// Compile-time validation
tables.users.update({
  // ✅ Valid: string concatenation
  fullName: Column.concat(Column.ref('firstName'), ' ', Column.ref('lastName')),
  
  // ❌ Type error: can't add string to number
  age: Column.add(Column.ref('name'), 5),
  
  // ❌ Runtime error: column doesn't exist  
  invalid: Column.ref('nonexistentColumn')
})
```

## SQL Generation Examples

```typescript
// Expression
Column.concat(Column.ref('content'), newText)
// Generated SQL (SQLite)
UPDATE table SET content = content || ? WHERE id = ?

// Expression  
Column.add(Column.ref('count'), 1)
// Generated SQL (PostgreSQL)
UPDATE table SET count = count + $1 WHERE id = $2

// Expression
Column.when(Column.gt(Column.ref('score'), 100)).then('excellent').else(Column.ref('grade'))
// Generated SQL
UPDATE table SET grade = CASE WHEN score > ? THEN ? ELSE grade END WHERE id = ?
```

## Implementation Strategy

**Phase 1: Core String Operations**
- `Column.ref()`, `Column.concat()`, `Column.coalesce()`
- Addresses immediate append/streaming use cases

**Phase 2: Numeric Operations** 
- `Column.add()`, `Column.subtract()`, `Column.increment()`
- Enables counters and calculations

**Phase 3: Conditional Logic**
- `Column.when()`, comparison operations
- Advanced materializer logic

**Phase 4: JSON Operations**
- `Column.jsonSet()`, `Column.jsonMerge()`
- Complex data structure updates

## Benefits

1. **Determinism**: Eliminates non-deterministic `ctx.query()` calls
2. **Security**: Prevents SQL injection through parameterized queries  
3. **Performance**: Operations execute at database level
4. **Type Safety**: Compile-time validation of operations and column types
5. **Efficiency**: Reduces event payload size vs. including all data
6. **Maintainability**: Clear, declarative syntax

## Real-World Use Cases

- **Streaming outputs**: Terminal/markdown content accumulation
- **Counters**: Execution counts, view counts, like counts  
- **Timestamps**: Last modified, last accessed tracking
- **JSON updates**: Configuration merging, metadata updates
- **State machines**: Status transitions with conditional logic
- **Aggregations**: Running totals, averages

## Migration Path

Existing problematic materializers can be incrementally migrated:

```typescript
// Before (causes hash mismatches)
"v1.OutputAppended": ({ outputId, content }, ctx) => {
  const existing = ctx.query(tables.outputs.select().where({ id: outputId }).limit(1))[0];
  return tables.outputs.update({ data: existing.data + content }).where({ id: outputId });
}

// After (safe and deterministic)
"v1.OutputAppended": ({ outputId, content }) =>
  tables.outputs.update({ 
    data: Column.concat(Column.ref('data'), content) 
  }).where({ id: outputId })
```

## Priority

**High** - This unblocks critical streaming/collaborative use cases while maintaining LiveStore's determinism guarantees.