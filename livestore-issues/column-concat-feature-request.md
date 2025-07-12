# Feature Request: Column Expression API for Efficient Append Operations

## Summary

LiveStore needs a convenient API for concatenating data to existing column values in materializers, providing better developer experience and performance compared to current `ctx.query()` patterns.

## Problem Statement

Currently, appending data to existing column values in LiveStore materializers requires verbose and inefficient patterns. This impacts developer experience and performance:

### Current Approaches and Their Drawbacks

**1. Using `ctx.query()` (verbose and performance overhead)**
```typescript
"v1.TerminalOutputAppended": ({ outputId, content }, ctx) => {
  // Requires separate query to fetch current value
  const existing = ctx.query(
    tables.outputs.select().where({ id: outputId }).limit(1)
  )[0];
  
  if (!existing) return [];
  
  // Then update with concatenated value
  return tables.outputs
    .update({ data: existing.data + content })
    .where({ id: outputId });
}
```

**Issues with this approach:**
- Extra database query for every append operation
- More complex error handling (missing records)
- Verbose materializer code

**2. Event payload inflation (increased network overhead)**
```typescript
"v1.TerminalOutputAppended": ({ outputId, previousData, content }) => {
  // Must include full previous data in every event
  return tables.outputs
    .update({ data: previousData + content })
    .where({ id: outputId });
}
```

**Issues with this approach:**
- Events become larger with repeated data
- Network overhead increases
- More complex event creation logic

**3. Raw SQL (security and maintainability concerns)**
```typescript
"v1.TerminalOutputAppended": ({ outputId, content }) => {
  // Raw SQL concatenation
  return tables.outputs
    .update({ data: sql`data || ${content}` })
    .where({ id: outputId });
}
```

**Issues with this approach:**
- Potential SQL injection risks
- Database-specific syntax
- No type safety

## Proposed Solution

Add a **Column Expression API** that provides clean, efficient column operations:

```typescript
import { Column } from '@livestore/livestore'

const materializers = State.SQLite.materializers(events, {
  "v1.TerminalOutputAppended": ({ outputId, content }) =>
    tables.outputs.update({ 
      data: Column.concat(Column.ref('data'), content) 
    }).where({ id: outputId }),
    
  "v1.CounterIncremented": ({ counterId }) =>
    tables.counters.update({ 
      count: Column.add(Column.ref('count'), 1),
      lastUpdated: Column.now()
    }).where({ id: counterId }),
    
  "v1.JsonFieldUpdated": ({ recordId, patch }) =>
    tables.records.update({ 
      metadata: Column.jsonMerge(Column.ref('metadata'), patch) 
    }).where({ id: recordId })
})
```

## Use Cases

This feature would enable safe implementation of common patterns:

### 1. **Terminal/Log Output Streaming**
```typescript
// Append new terminal output to existing content
data: Column.concat(Column.ref('data'), newOutput)
```

### 2. **Markdown Content Building**
```typescript
// Build up markdown content incrementally
content: Column.concat(Column.ref('content'), newSection)
```

### 3. **Error Message Accumulation**
```typescript
// Collect multiple error messages
errors: Column.concat(Column.ref('errors'), '\n', newError)
```

### 4. **Counters and Statistics**
```typescript
// Increment counters safely
count: Column.add(Column.ref('count'), 1),
totalBytes: Column.add(Column.ref('totalBytes'), newBytes)
```

### 5. **JSON Object Updates**
```typescript
// Merge JSON objects
settings: Column.jsonMerge(Column.ref('settings'), updates)
```

## Proposed API Design

### Core Operations
```typescript
namespace Column {
  // Column reference
  ref<T>(columnName: string): ColumnExpression<T>
  
  // String operations
  concat(...expressions: (ColumnExpression<string> | string)[]): ColumnExpression<string>
  coalesce<T>(...expressions: ColumnExpression<T>[]): ColumnExpression<T>
  
  // Numeric operations
  add(left: ColumnExpression<number>, right: number | ColumnExpression<number>): ColumnExpression<number>
  subtract(left: ColumnExpression<number>, right: number | ColumnExpression<number>): ColumnExpression<number>
  
  // Convenience methods
  increment(amount?: number): ColumnExpression<number>
  
  // Utility functions
  now(): ColumnExpression<Date>
}
```

### Type Safety
```typescript
// Compile-time validation prevents invalid operations
tables.outputs.update({
  // ✅ Valid: string concatenation
  data: Column.concat(Column.ref('data'), newText),
  
  // ❌ Type error: can't add number to string column
  data: Column.add(Column.ref('data'), 5),
  
  // ❌ Runtime error: column doesn't exist
  invalid: Column.ref('nonexistentColumn')
})
```

## Benefits

1. **Performance**: Operations execute at the database level, eliminating fetch-modify-update cycles
2. **Developer Experience**: Clean, declarative syntax for common operations
3. **Type Safety**: Compile-time validation of column types and operations
4. **Security**: Prevents SQL injection through parameterized queries
5. **Efficiency**: Reduces event payload size by avoiding data duplication
6. **Maintainability**: Simpler materializer code with fewer edge cases

## Implementation Notes

### SQL Generation Examples
```typescript
// Column expression
Column.concat(Column.ref('data'), newContent)

// Generated SQL (SQLite)
UPDATE outputs SET data = data || ? WHERE id = ?

// Column expression  
Column.add(Column.ref('count'), 1)

// Generated SQL
UPDATE counters SET count = count + ? WHERE id = ?
```

### Implementation Strategy
1. **Phase 1**: Core string operations (`concat`, `coalesce`)
2. **Phase 2**: Numeric operations (`add`, `subtract`, `increment`)  
3. **Phase 3**: JSON operations (`jsonMerge`, `jsonSet`)
4. **Phase 4**: Conditional expressions (`when`, `case`)

## Real-World Examples from Anode

This feature would immediately solve several issues in the Anode codebase:

**Current problematic materializers:**
- `TerminalOutputAppended` in `runt/packages/schema/mod.ts:1047-1060`
- `MarkdownOutputAppended` in `runt/packages/schema/mod.ts:1095-1112`

**After Column API:**
```typescript
"v1.TerminalOutputAppended": ({ outputId, content }) =>
  tables.outputs.update({ 
    data: Column.concat(Column.ref('data'), content) 
  }).where({ id: outputId })
```

## Priority

**High** - This would significantly improve developer experience for common streaming/append use cases. A clean column expression API would enable more efficient and maintainable materializers throughout the LiveStore ecosystem.