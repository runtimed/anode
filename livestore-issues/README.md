# LiveStore Issues - Anode Project

This directory contains focused issue reports for the LiveStore team regarding problems encountered while building Anode, a collaborative notebook system.

## Overview

Anode uses LiveStore for event-sourced, real-time collaborative editing. During development, we've encountered several issues that impact the stability and usability of streaming/append operations in collaborative environments.

## Issues

### 1. [Column Expression API Feature Request](./column-concat-feature-request.md)
**Priority: High** - Significant developer experience improvement

**Problem**: Appending data to existing column values requires verbose `ctx.query()` calls or bloated event payloads.

**Proposed Solution**: Add a Column Expression API for efficient database-level operations.

**Example**: `Column.concat(Column.ref('content'), newText)` instead of separate query + update patterns.

**Benefits**: Better performance, cleaner code, type safety, reduced event payload sizes.

### 2. [Materializer Hash Mismatches with ctx.query()](./issue-1-ctx-query-nondeterminism.md)
**Priority: Medium** - Investigation needed

**Problem**: Materializers using `ctx.query()` to read existing data may cause issues in collaborative environments.

**Status**: Under investigation - may be related to event reordering during rebasing.

### 3. [Event Ordering Guarantees](./issue-3-event-ordering-semantics.md)
**Priority: Medium** - Documentation and clarification needed

**Problem**: Unclear event ordering semantics make it difficult to design robust append operations.

**Questions**: What ordering guarantees does LiveStore provide? How should order-dependent operations be designed?

## Reproduction

### Minimal Code Example
See [`minimal-append-reproduction.ts`](./minimal-append-reproduction.ts) for a minimal test case that demonstrates the hash mismatch issue.

### Running the Tests
```bash
# Run comprehensive reproduction tests
cd anode
pnpm test hash-mismatch-reproduction

# Run existing materializer tests that show the issue
pnpm test materializer-hash

# Run REAL multi-client reproduction (requires sync backend)
# Terminal 1: Start sync backend
pnpm dev:sync

# Terminal 2: Run real sync test
pnpm test real-sync-hash-mismatch
```

### Real Multi-Client Reproduction
The [`real-sync-hash-mismatch.test.ts`](../test/real-sync-hash-mismatch.test.ts) test demonstrates the actual production failure scenario:
- Two clients connected to the same sync backend
- Events syncing between clients in different orders
- `ctx.query()` materializers producing different results
- **Actual hash mismatch detection** (when timing is right)

### Real-World Examples
The issue manifests in Anode's production code in these materializers:
- `TerminalOutputAppended` in `runt/packages/schema/mod.ts:1047-1060`
- `MarkdownOutputAppended` in `runt/packages/schema/mod.ts:1095-1112`

Both use the problematic pattern:
```typescript
"v1.TerminalOutputAppended": ({ outputId, content }, ctx) => {
  const existingOutput = ctx.query(
    tables.outputs.select().where({ id: outputId }).limit(1)
  )[0];
  
  const concatenatedData = (existingOutput.data || "") + newContent;
  return tables.outputs.update({ data: concatenatedData }).where({ id: outputId });
}
```

## Current Workarounds

1. **Event Payload Inflation**: Include all needed data in event payloads (verbose but works)
   ```typescript
   "v1.ContentAppended": ({ id, previousContent, appendText }) =>
     tables.messages.update({ content: previousContent + appendText }).where({ id })
   ```

2. **Raw SQL**: Use unsafe SQL expressions (security risk)
   ```typescript
   "v1.ContentAppended": ({ id, appendText }) =>
     tables.messages.update({ content: sql`content || ${appendText}` }).where({ id })
   ```

3. **Avoid Append Operations**: Redesign features to avoid incremental updates (limits functionality)

## Impact on Anode

These issues currently affect:
- ✅ **Basic collaborative editing** - Works fine
- ❌ **Terminal output streaming** - Causes crashes during concurrent execution
- ❌ **Markdown content building** - Hash mismatches during incremental rendering  
- ❌ **Error message accumulation** - Fails when multiple errors occur
- ❌ **Progress counters** - Cannot safely increment execution counts

## Technical Details

### When Hash Mismatches Occur
The issue happens when events arrive in different orders across clients:

**Scenario 1: Normal Order**
```
Client A: create("test") → append("hello") → append("world") = "helloworld"
```

**Scenario 2: Different Order**
```
Client B: create("test") → append("world") → append("hello") = "worldhello"
```

**Result**: Different materializer outputs → hash mismatch → LiveStore crash

### Why ctx.query() Breaks Determinism
```typescript
// ❌ Non-deterministic: result depends on current database state
"v1.ContentAppended": ({ id, text }, ctx) => {
  const existing = ctx.query(tables.messages.select().where({ id }).limit(1))[0];
  return tables.messages.update({ content: existing.content + text }).where({ id });
}

// ✅ Deterministic: result depends only on event data
"v1.ContentAppended": ({ id, previousContent, text }) =>
  tables.messages.update({ content: previousContent + text }).where({ id })
```

## Next Steps

1. **Issue 1** needs immediate attention as it causes production crashes
2. **Issue 2** provides the long-term solution for safe column operations
3. **Issue 3** requires clarification from LiveStore team on design principles

## Testing Environment

- **LiveStore version**: `^0.3.1`
- **Node.js**: `>=23.0.0`
- **Test framework**: Vitest
- **Database**: SQLite (in-memory for tests)

## Contact

These issues were identified during development of [Anode](https://github.com/rgbkrk/anode), a real-time collaborative notebook system. For questions or clarification, please reach out to the Anode development team.

The reproduction tests demonstrate the exact scenarios that cause production failures in collaborative environments.