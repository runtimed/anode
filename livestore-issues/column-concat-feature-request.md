# Feature Request: Column Concatenation API for LiveStore

## Summary

LiveStore needs a convenient API for concatenating data to existing column values in materializers, providing better developer experience and performance compared to current `ctx.query()` patterns.

## Problem

Currently, appending data to existing column values in LiveStore materializers requires verbose and inefficient patterns. This impacts developer experience and performance:

### Current Approaches and Their Drawbacks

**1. Using `ctx.query()`**
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

**2. Event payload inflation**
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

**3. Raw SQL**
```typescript
"v1.TerminalOutputAppended": ({ outputId, content }) => {
  // Raw SQL concatenation (not currently possible, but illustrates the need)
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

Add a **Column Expression API** focused on string concatenation and null handling:

```typescript
import { Column } from '@livestore/livestore'

const materializers = State.SQLite.materializers(events, {
  "v1.TerminalOutputAppended": ({ outputId, content }) =>
    tables.outputs.update({
      data: Column.concat(Column.ref('data'), content)
    }).where({ id: outputId }),

  "v1.LogMessageAppended": ({ logId, message }) =>
    tables.logs.update({
      content: Column.concat(
        Column.coalesce(Column.ref('content'), ''),
        '\n',
        message
      )
    }).where({ id: logId })
})
```

## Use Cases

### **Terminal/Log Output Streaming**
```typescript
// Append new terminal output to existing content
data: Column.concat(Column.ref('data'), newOutput)
```

### **AI Content Building**
```typescript
// Build up AI content incrementally
content: Column.concat(Column.ref('content'), newSection)
```

### **Error Message Accumulation**
```typescript
// Collect multiple error messages with safe null handling
errors: Column.concat(
  Column.coalesce(Column.ref('errors'), ''),
  '\n',
  newError
)
```

## Proposed API Design

### Core Operations
```typescript
namespace Column {
  // Column reference
  ref<T>(columnName: string): ColumnExpression<T>

  // String concatenation
  concat(...expressions: (ColumnExpression<string> | string)[]): ColumnExpression<string>

  // Null coalescing
  coalesce<T>(...expressions: ColumnExpression<T>[]): ColumnExpression<T>
}
```

### Type Safety
```typescript
// Compile-time validation prevents invalid operations
tables.outputs.update({
  // ✅ Valid: string concatenation
  data: Column.concat(Column.ref('data'), newText),

  // ✅ Valid: null-safe concatenation
  content: Column.concat(Column.coalesce(Column.ref('content'), ''), newText),

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

// Column expression with coalesce
Column.concat(Column.coalesce(Column.ref('data'), ''), newContent)

// Generated SQL (SQLite)
UPDATE outputs SET data = COALESCE(data, '') || ? WHERE id = ?
```

## Real-World Examples from Anode

In the Agentic Notebook I'm building on top of LiveStore, there are two main output streams I'm putting into the document (serverside):

* Terminal Output
* LLM Completions

With this column API it makes our materializers more like this:

```typescript
"v1.TerminalOutputAppended": ({ outputId, content }) =>
  tables.outputs.update({
    data: Column.concat(Column.ref('data'), content)
  }).where({ id: outputId })
```
