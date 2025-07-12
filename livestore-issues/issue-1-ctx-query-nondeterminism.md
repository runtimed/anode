# Issue 1: Materializer Hash Mismatches Due to ctx.query() Non-determinism

## Problem

Materializers that use `ctx.query()` to read existing data cause "materializer hash mismatch" errors when events arrive in different orders across clients.

## Root Cause

Materializers must be pure functions that produce identical results given the same event. When a materializer uses `ctx.query()`, it depends on the current database state, making it non-deterministic across clients that may have processed events in different orders.

## Minimal Reproduction

```typescript
const tables = State.SQLite.tables({
  messages: {
    id: "TEXT PRIMARY KEY",
    content: "TEXT NOT NULL DEFAULT ''",
  },
});

const events = State.SQLite.events({
  "v1.MessageCreated": { id: "string" },
  "v1.ContentAppended": { id: "string", appendText: "string" },
});

const materializers = State.SQLite.materializers(events, {
  "v1.MessageCreated": ({ id }) =>
    tables.messages.insert({ id, content: "" }),

  // ❌ Non-deterministic due to ctx.query()
  "v1.ContentAppended": ({ id, appendText }, ctx) => {
    const existing = ctx.query(
      tables.messages.select().where({ id }).limit(1)
    )[0];
    
    if (!existing) return [];
    
    return tables.messages
      .update({ content: existing.content + appendText })
      .where({ id });
  },
});
```

**Scenario that triggers the bug:**
1. Client A processes: `MessageCreated(id: "test")` → `ContentAppended(id: "test", appendText: "hello")` → `ContentAppended(id: "test", appendText: "world")`
2. Client B processes the same events but in different order due to network timing
3. Materializers produce different final states → hash mismatch → crash

## Current Workarounds

**Pattern 1: Include all data in event payload (verbose but works)**
```typescript
"v1.ContentAppended": ({ id, previousContent, appendText }) =>
  tables.messages.update({ content: previousContent + appendText }).where({ id })
```

**Pattern 2: Raw SQL (unsafe)**
```typescript
"v1.ContentAppended": ({ id, appendText }) =>
  tables.messages.update({ content: sql`content || ${appendText}` }).where({ id })
```

## Needed Solution

A safe column expression API that allows deterministic column references:

```typescript
"v1.ContentAppended": ({ id, appendText }) =>
  tables.messages.update({ 
    content: Column.concat(Column.ref('content'), appendText) 
  }).where({ id })
```

## Impact

This blocks common streaming/append use cases:
- Terminal output accumulation
- Markdown content building
- Error message collection
- JSON object updates
- Progress counters

## Priority

**Critical** - This causes production crashes in collaborative environments where event ordering varies between clients.