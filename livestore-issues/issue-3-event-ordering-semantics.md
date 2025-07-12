# Issue 3: Event Ordering Guarantees and Append Operation Semantics

## Problem Statement

LiveStore's event ordering guarantees are unclear when dealing with append operations that depend on sequence. This creates ambiguity about how to design events for streaming/incremental operations where order matters.

## Specific Questions

### 1. Event Ordering Guarantees
- **Question**: Does LiveStore guarantee that events from the same client arrive in the same order at all other clients?
- **Impact**: Critical for append operations where `AppendA` then `AppendB` should produce different results than `AppendB` then `AppendA`

### 2. Concurrent Event Resolution
- **Question**: How should materializers handle events that arrive concurrently or in different orders?
- **Current behavior**: Hash mismatches occur when materializers produce different results

### 3. Append Operation Best Practices
- **Question**: What's the recommended pattern for operations that logically depend on sequence?

## Current Problematic Patterns

**Pattern 1: Order-dependent appends**
```typescript
// These events arriving in different orders produce different results:
// Order A: "hello" + "world" = "helloworld" 
// Order B: "world" + "hello" = "worldhello"

events: {
  "v1.TextAppended": { outputId: "string", text: "string" }
}

materializers: {
  "v1.TextAppended": ({ outputId, text }, ctx) => {
    const existing = ctx.query(tables.outputs.select().where({ id: outputId }).limit(1))[0];
    return tables.outputs.update({ content: existing.content + text }).where({ id: outputId });
  }
}
```

**Pattern 2: Position-based ordering**
```typescript
// Better: Include position/timestamp for deterministic ordering
events: {
  "v1.TextAppended": { 
    outputId: "string", 
    text: "string",
    position: "number", // or timestamp
    previousLength: "number" // for validation
  }
}
```

## Real-World Scenarios

### Scenario 1: Terminal Output Streaming
```
Events arriving at different clients:
Client A: append("$ ls\n") → append("file1.txt\n") → append("file2.txt\n")
Client B: append("file2.txt\n") → append("$ ls\n") → append("file1.txt\n")

Result: Different terminal output content = hash mismatch
```

### Scenario 2: Collaborative Text Editing
```
Events from concurrent users:
User 1: insert("Hello", position: 0)
User 2: insert("World", position: 0) 

Without clear ordering: Undefined which appears first
```

## Potential Solutions

### Option 1: Strict Event Ordering
LiveStore guarantees events arrive in creation order
- **Pros**: Simple to reason about, append operations work naturally
- **Cons**: May impact performance, requires careful timestamp handling

### Option 2: Position-Based Events
Events include explicit position/sequence information
- **Pros**: Deterministic regardless of arrival order
- **Cons**: More complex event design, requires conflict resolution

### Option 3: Operational Transform Semantics
Events are designed to be order-independent through transformation
- **Pros**: Robust concurrent editing support
- **Cons**: Complex implementation, may not fit all use cases

## Documentation Needed

1. **Event Ordering Guarantees**: Clear documentation of what ordering LiveStore provides
2. **Append Operation Patterns**: Recommended approaches for sequential operations
3. **Conflict Resolution**: How to handle concurrent modifications to the same data
4. **Best Practices**: Guidelines for designing order-sensitive events

## Questions for LiveStore Team

1. What are the current event ordering guarantees?
2. Is strict ordering a goal, or should events be designed to be order-independent?
3. Are there plans for operational transform or CRDT-style conflict resolution?
4. What's the recommended pattern for append/streaming operations?

## Priority

**Medium** - Understanding these semantics is crucial for designing robust collaborative applications, but workarounds exist (event payload inflation, position-based events).

## Related Issues

- Issue 1: Materializer hash mismatches with ctx.query()
- Issue 2: Need for column expression API
- General question about LiveStore's consistency model and ordering guarantees