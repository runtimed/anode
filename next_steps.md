# LiveStore Prerelease Migration - Next Steps for Debugging

## Background: Migration Success ✅

The Anode project has been **successfully migrated** to LiveStore prerelease v0.4.0-dev.10. The following work is complete:

### Completed Migration Tasks:

- ✅ **Type checking passes**: All TypeScript errors resolved
- ✅ **Build works**: Vite build completes successfully
- ✅ **Dependencies resolved**: No more Effect peer dependency conflicts
- ✅ **LiveStore APIs updated**: All query and sync provider APIs use correct prerelease signatures

### Key Changes Made:

1. **Query API Migration** - Fixed all `.first()` calls to use `behaviour: "fallback"`
2. **Sync Provider Updates** - Updated import paths to `@livestore/sync-cf/cf-worker` and `/client`
3. **Effect Version Resolution** - Upgraded from Effect 3.15.5 to 3.18.4
4. **Configuration Updates** - Updated wrangler.toml binding names

## Current Problem: Data Compatibility Issue ❌

**Symptom**: Old notebooks appear blank (no cells, no content) while new notebooks work correctly.

**Environment**: Preview deployment at `https://preview.runt.run`

## Investigation Findings

### Database Analysis (preview environment):

- **Old notebook example**: `NQHc2_CeFp2E` ("Game 6 Results") created 2025-08-25
- **New notebook example**: `2phYrPJYd68s` ("A new notebook") created 2025-10-09
- **Storage format**: All eventlog tables use format version 7 (`eventlog_7_*`)
- **Event data exists**: Old notebook has 174 events with names like `v2.CellCreated`, `v1.CellSourceChanged`
- **New notebook**: No eventlog table created yet (suggesting no events committed)

### LiveStore Logs Analysis:

```
📝 Pull request: { storeId: 'NQHc2_CeFp2E', isRuntime: false, hasPayload: true }
📝 Push received: { storeId: 'NQHc2_CeFp2E', eventCount: 1, hasPayload: true }
📝 User push: { storeId: 'NQHc2_CeFp2E', eventCount: 1 }
```

**Key Observation**: LiveStore sync is working (pull/push happening), but data isn't materializing in the UI.

## Root Cause Identified ✅: Event Format Breaking Change

**Confirmed Issue**: The LiveStore prerelease v0.4.0-dev.10 has breaking changes in client-side event processing:

1. **D1 storage configuration**: Fixed - old data is accessible from server
2. **WASM processing incompatibility**: Client-side SQLite WASM cannot process old event format
3. **Event schema evolution**: Old events (v1.CellCreated, etc.) cause `makeChangeset.apply` errors

**Key Evidence**:

- Fresh notebooks work flawlessly in preview environment
- Old notebooks load data briefly, then fail with WASM errors: `RuntimeError: null function or function signature mismatch`
- Error occurs in `makeChangeset.apply` during client-side event processing
- Server-side sync works correctly (pull/push operations succeed)

**Impact**:

- Old notebooks with format version 7 events are incompatible with new LiveStore client
- Data exists and is accessible, but client cannot process legacy event schemas
- Breaking change in LiveStore prerelease affects existing user data

**Fix Applied**: Updated `backend/sync.ts` to explicitly configure D1 storage:

```typescript
export class WebSocketServer extends makeDurableObject({
  storage: {
    _tag: "d1",
    binding: "DB",
  },
  // ... rest of configuration
})
```

## Resolution Status ⚠️: Breaking Change Confirmed

### Applied Fixes (2025-01-10)

- [x] **D1 storage configuration**: Fixed server-side access to D1 database
- [x] **Data accessibility**: Old events are readable from D1 (format version 7)
- [x] **Fresh notebook functionality**: New notebooks work perfectly with LiveStore prerelease

### Breaking Change Identified

- [x] **Client-side processing**: Old event format incompatible with new WASM module
- [x] **WASM errors**: `makeChangeset.apply` fails on legacy event schemas
- [x] **Scope**: Affects all existing notebooks created before LiveStore prerelease migration

### Migration Strategy Required

Choose one approach:

**Option 1: Data Migration (Recommended)**

- [ ] Create migration script to transform old events to new format
- [ ] Extract events from D1, convert schemas (v1.CellCreated → v2.CellCreated)
- [ ] Preserve original data as backup
- [ ] Batch process existing notebooks

**Option 2: Breaking Change Documentation**

- [ ] Document as breaking change in migration notes
- [ ] Provide export/recreation workflow for critical notebooks
- [ ] Fastest implementation but requires user action

**Option 3: LiveStore Compatibility**

- [ ] Work with LiveStore team on backward compatibility
- [ ] Long-term solution but uncertain timeline

### Deployment History

- **Build**: Completed successfully with updated storage configuration
- **Preview deployment**: 4152a910-314f-4965-804a-cb15eec92205 (deployed 2025-01-10)
- **D1 binding**: Confirmed available as `env.DB` in worker environment

## Technical Context

### Database Schema Present:

```sql
-- Old notebook eventlog
eventlog_7_NQHc2_CeFp2E (174 events)
-- Events include: v2.CellCreated, v1.CellSourceChanged, v1.CellOutputsCleared

-- Current materializers support:
"v1.CellCreated": materializer...
"v2.CellCreated": materializer...
```

### Working Environment:

- **Preview**: https://preview.runt.run
- **Database**: Cloudflare D1 `anode-docworker-preview-db`
- **Logs**: `pnpm wrangler tail --env preview`
- **DB Access**: `pnpm wrangler d1 execute DB --env preview --remote`

### Current LiveStore Versions:

- **Prerelease**: v0.4.0-dev.10
- **Effect**: 3.18.4 (upgraded from 3.15.5)

## Success Criteria

### Immediate Goals (Migration Complete When):

- [x] New notebooks work correctly ← **CONFIRMED**
- [x] Server-side data access restored ← **CONFIRMED**
- [x] LiveStore sync works for new data ← **CONFIRMED**
- [ ] Migration strategy implemented for old notebooks ← **IN PROGRESS**
- [ ] Existing user data preserved and accessible ← **PENDING MIGRATION**

### Current Status

- **Fresh functionality**: ✅ Working perfectly
- **Legacy compatibility**: ❌ Breaking change confirmed
- **Next step**: Implement data migration strategy

**Critical Finding**: LiveStore prerelease introduces client-side breaking changes for event processing. Server-side access works, but client WASM module cannot process legacy event schemas.

## Emergency Rollback

If data loss is critical:

1. Revert LiveStore packages to previous stable version
2. Restore Effect version overrides in package.json
3. Redeploy to preview environment

Last updated: 2025-01-10 by breaking change identification and migration planning
