## Feature Request: Safe Column Expression API for Common Operations

### Problem Statement

LiveStore materializers require deterministic, pure functions to maintain consistency across clients. However, common operations like string concatenation or numeric increments currently require either:

1. **Non-deterministic `ctx.query()` calls** that cause materializer hash mismatches
2. **Unsafe raw SQL** with potential injection risks  
3. **Event payload bloat** by including all data needed for operations

### Root Cause Analysis

The core issue is that materializers cannot safely reference existing column values during updates. This forces developers into problematic patterns:

**Pattern 1: Non-deterministic queries (❌ Causes hash mismatches)**
```typescript
"v1.OutputAppended": ({ outputId, content }, ctx) => {
  const existing = ctx.query(tables.outputs.select().where({ id: outputId }).limit(1))[0];
  if (!existing) throw new Error(`Output ${outputId} not found`);
  return tables.outputs.update({ data: existing.data + content }).where({ id: outputId });
}
```

**Pattern 2: Event payload inflation (✅ Works but verbose)**
```typescript
"v1.OutputAppended": ({ outputId, previousData, appendedContent }) => {
  return tables.outputs.update({ data: previousData + appendedContent }).where({ id: outputId });
}
```

**Pattern 3: Raw SQL (❌ Security risk)**
```typescript
"v1.OutputAppended": ({ outputId, content }) => {
  return tables.outputs.update({ data: sql`data || ${content}` }).where({ id: outputId });
}
```

### Real-World Use Cases

This issue blocks several critical streaming/append scenarios in Anode:

1. **Terminal output streaming** - Appending ANSI text to existing output
2. **Markdown rendering** - Building up markdown content incrementally  
3. **Error message accumulation** - Collecting multiple error lines
4. **Progress counters** - Incrementing execution counts, timestamps
5. **JSON merging** - Updating nested JSON objects

### Proposed Solution

Add a **safe column expression API** that allows deterministic column references:

```typescript
// ✅ Safe, deterministic, and secure
"v1.OutputAppended": ({ outputId, content }) => {
  return tables.outputs.update({ 
    data: Column.concat(Column.ref('data'), content),
    updateCount: Column.increment(1),
    lastModified: Column.coalesce(Column.ref('lastModified'), new Date())
  }).where({ id: outputId });
}
```

### Detailed API Design

```typescript
namespace Column {
  // Core column reference
  ref(columnName: string): ColumnExpression<T>
  
  // String operations
  concat(...expressions: ColumnExpression<string>[]): ColumnExpression<string>
  coalesce(...expressions: ColumnExpression<T>[]): ColumnExpression<T>
  
  // Numeric operations  
  add(left: ColumnExpression<number>, right: ColumnExpression<number>): ColumnExpression<number>
  subtract(left: ColumnExpression<number>, right: ColumnExpression<number>): ColumnExpression<number>
  increment(amount?: number): ColumnExpression<number> // Shorthand for add(ref('column'), amount)
  
  // JSON operations
  jsonSet(path: string, value: any): ColumnExpression<object>
  jsonMerge(patch: ColumnExpression<object>): ColumnExpression<object>
  
  // Conditional operations
  when(condition: ColumnExpression<boolean>): ConditionalExpression<T>
}

// Usage examples
.update({ 
  // String concatenation
  terminalOutput: Column.concat(Column.ref('terminalOutput'), newLine),
  
  // Numeric increment with coalescing
  executionCount: Column.coalesce(Column.ref('executionCount'), 0).add(1),
  
  // JSON updates
  metadata: Column.jsonMerge(Column.ref('metadata'), { lastRun: new Date() }),
  
  // Conditional updates
  status: Column.when(Column.ref('errorCount').gt(0))
    .then('error')
    .else(Column.ref('status'))
})
```

### Type Safety & Validation

```typescript
// Compile-time type checking prevents invalid operations
tables.outputs.update({
  data: Column.add(Column.ref('data'), 5) // ❌ Type error: can't add number to string
  count: Column.concat(Column.ref('count'), 'text') // ❌ Type error: can't concat string to number
})

// Runtime validation ensures column exists and types match
Column.ref('nonexistentColumn') // ❌ Runtime error: column doesn't exist in table schema
```

### Implementation Strategy

1. **Phase 1**: Core string operations (`concat`, `coalesce`) for immediate streaming use cases
2. **Phase 2**: Numeric operations (`add`, `subtract`, `increment`) for counters
3. **Phase 3**: JSON operations for complex data updates
4. **Phase 4**: Conditional expressions for advanced logic

### SQL Generation Examples

```typescript
// LiveStore expression
Column.concat(Column.ref('data'), newContent)

// Generated SQL (SQLite)
UPDATE outputs SET data = data || ? WHERE id = ?

// Generated SQL (PostgreSQL) 
UPDATE outputs SET data = data || $1 WHERE id = $2
```

### Benefits

1. **Determinism**: Eliminates non-deterministic `ctx.query()` calls
2. **Security**: Prevents SQL injection through parameterized queries
3. **Performance**: Operations execute at database level
4. **Type Safety**: Compile-time validation of column types and operations
5. **Maintainability**: Clear, declarative syntax vs complex event payload management
6. **Efficiency**: Reduces event payload size by avoiding data duplication

### Alternative Approaches Considered

**Template Literals with Safety**
```typescript
data: expr`${ref('data')} || ${newContent}` // More SQL-like but less type-safe
```

**Fluent Builder Pattern**
```typescript  
data: Column.ref('data').concat(newContent).coalesce('') // More readable chains
```

**Function-based Imports**
```typescript
import { ref, concat, increment } from '@livestore/column-expressions'
data: concat(ref('data'), newContent) // Shorter imports
```

### Migration Path

Existing materializers using `ctx.query()` patterns can be gradually migrated:

```typescript
// Before (problematic)
"v1.OutputAppended": ({ outputId, content }, ctx) => {
  const existing = ctx.query(tables.outputs.select().where({ id: outputId }).limit(1))[0];
  return tables.outputs.update({ data: existing.data + content }).where({ id: outputId });
}

// After (safe)
"v1.OutputAppended": ({ outputId, content }) => {
  return tables.outputs.update({ 
    data: Column.concat(Column.ref('data'), content) 
  }).where({ id: outputId });
}
```

### Priority & Impact

**Priority**: **Critical** - This is blocking production use cases in Anode where streaming outputs cause materializer hash mismatches.

**Impact**: Enables reliable real-time collaborative editing with streaming content, fixing crashes that occur during concurrent append operations.