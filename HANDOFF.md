# LiveStore Kernel System - Updated Handoff

## Current State Summary

After extensive debugging and refactoring, we've resolved the major execution issues in the Anode kernel system. The system now has a simplified architecture with timestamps removed and proper event sequencing.

## Architecture Overview

- **Notebook System**: Each notebook = one LiveStore store (NOTEBOOK_ID = STORE_ID)
- **Kernel Process**: Python execution server using Pyodide, manually started per notebook
- **Execution Queue**: Event-driven system with states: `pending` → `assigned` → `executing` → `completed`
- **Communication**: Events synced via CloudFlare Workers sync backend

## ✅ MAJOR ISSUES RESOLVED

### 1. Event Sequence Number Conflicts - FIXED
**Problem**: Kernel was committing events with incorrect sequence numbers, causing sync backend to reject them with "Invalid parent event number" errors.

**Solution**: Added initial sync delay before kernel commits its first event:
- 2-second configurable delay (`INITIAL_SYNC_DELAY` env var)
- Allows time for initial sync to complete before kernel registration
- Added debugging to show store state before committing events

### 2. Timestamp Schema Complexity - ELIMINATED
**Problem**: Complex Date ↔ number conversions in LiveStore schemas were causing parsing errors and LiveStore shutdowns.

**Root Cause**: 
```
ParseError: notebook
└─ ["createdAt"]
   └─ DateFromNumber
      └─ Type side transformation failure
         └─ Expected DateFromSelf, actual 1749852900062
```

**Solution**: **Completely removed all timestamp fields** from the system:
- **Tables**: Removed `createdAt`, `lastModified`, `startedAt`, `terminatedAt`, `heartbeatAt`, etc.
- **Events**: Removed timestamp parameters from all event schemas
- **Materializers**: Simplified to not handle date conversions
- **Web Client**: Updated to not send/reference timestamp fields
- **Kernel Client**: Updated to not send timestamp parameters

### 3. Kernel Query Column Mismatch - FIXED
**Problem**: Kernel client was querying for non-existent `requestedAt` column in `executionQueue` table, causing "no such column" SQL errors.

**Root Cause**: 
```
SqliteError: no such column: requestedAt
SELECT * FROM 'executionQueue' WHERE status = ? ORDER BY requestedAt asc
```

**Solution**: Fixed kernel polling queries to use existing schema columns:
- **Assigned work polling**: Changed from `ORDER BY requestedAt` to `ORDER BY priority DESC`
- **Pending work polling**: Removed `ORDER BY requestedAt` clause entirely
- **Result**: Kernel now polls successfully without database errors

### 4. Circular Reactive Dependencies - PREVIOUSLY FIXED
**Solution**: Replaced reactive subscriptions with polling approach in kernel client.

### 5. Schema Materializer Errors - PREVIOUSLY FIXED  
**Solution**: Updated materializers to use safer query patterns with `.limit(1)` instead of `.first()`.

## Current System State

### ✅ **Working Components**
- **Event sequencing**: No more sync conflicts
- **Kernel registration**: Clean session startup and heartbeats
- **Polling architecture**: Stable assigned/pending work detection without SQL errors
- **Schema simplification**: All timestamp complexity eliminated
- **Database queries**: All kernel queries now match actual schema columns
- **Basic execution flow**: Kernel operational and ready for end-to-end testing

### ⚠️ **Known Issues**
- **Tests need cleanup**: Schema tests still reference removed timestamp fields
- **End-to-end flow**: Needs testing with actual cell execution

## Architecture Decisions Made

### ✅ **Timestamp Elimination Strategy**
- **Rationale**: Timestamps were causing more problems than value in this prototype
- **Benefits**: Simplified schema, eliminated conversion errors, reduced complexity
- **Trade-offs**: Lost audit trail capabilities (can be re-added later if needed)

### ✅ **Event Sequencing Strategy**  
- **Initial sync delay**: Simple but effective solution for startup timing
- **Configurable timing**: `INITIAL_SYNC_DELAY` env var for tuning
- **Store state debugging**: Added visibility into sync state

### ✅ **Polling Over Reactivity**
- **Assigned work**: 500ms polling for kernel's own work
- **Pending work**: 2s polling for claiming new work  
- **No reactive subscriptions**: Avoids circular dependency issues

## Current File State

### **Schema Package** (`packages/schema/`)
- ✅ **Simplified schemas**: All timestamp fields removed
- ✅ **Clean materializers**: No date conversion logic
- ⚠️ **Tests need fixing**: Still reference removed fields

### **Kernel Client** (`packages/dev-server-kernel-ls-client/`)
- ✅ **Initial sync delay**: Prevents sequence number conflicts
- ✅ **Polling architecture**: Stable work detection without SQL errors
- ✅ **Error handling**: Comprehensive debugging and stack traces
- ✅ **No timestamp events**: Updated for simplified schema
- ✅ **Fixed queries**: All SQL queries now match actual schema columns

### **Web Client** (`packages/web-client/`)
- ✅ **No timestamp events**: Updated for simplified schema
- ✅ **UI simplified**: Removed timestamp displays
- ⚠️ **Some cleanup needed**: References to removed fields

## Testing Status

### **Current Test Setup**
```bash
# Start sync backend
pnpm dev:sync-only

# Start kernel for specific notebook  
NOTEBOOK_ID=notebook-$(date +%s)-test pnpm dev:kernel

# Start web client
pnpm dev:web-only
```

### **Test Notebook Creation Flow**
1. Navigate to web client
2. Initialize notebook (should work cleanly)
3. Create code cell (should work without LiveStore shutdown)
4. Execute cell (kernel should pick up and process)

## Key Configuration

### **Kernel Environment Variables**
```bash
NOTEBOOK_ID=notebook-123-abc           # Required: which notebook to serve
INITIAL_SYNC_DELAY=2000               # Optional: sync delay in ms
KERNEL_ID=kernel-${process.pid}       # Auto-generated
AUTH_TOKEN=insecure-token-change-me   # Sync backend auth
```

### **Current Architecture Benefits**
- **Simplified reasoning**: No timestamp conversion complexity
- **Stable event sequencing**: No more sync conflicts  
- **Predictable polling**: No reactive subscription issues
- **Clear separation**: Each notebook = isolated store
- **Comprehensive debugging**: Good visibility into system state

## Next Steps for Development

### **Immediate Priority**
1. **Fix remaining tests**: Remove timestamp references in schema tests
2. **End-to-end testing**: Verify full execution flow works with web client

### **Short-term Improvements**
1. **Better sync detection**: Replace delay with actual sync state checking
2. **Error recovery**: Handle kernel restart scenarios gracefully
3. **Performance optimization**: Tune polling intervals

### **Long-term Architecture**
1. **Kernel lifecycle management**: Automatic start/stop per notebook
2. **Authentication**: Replace insecure tokens with proper auth
3. **Timestamp re-introduction**: Add back with proper LiveStore patterns if needed

## Development Commands

```bash
# Core development
pnpm build:schema                     # Required after schema changes
pnpm dev                             # Start web + sync
NOTEBOOK_ID=test pnpm dev:kernel     # Start kernel

# Debugging  
pnpm reset-storage                   # Clear all local storage
DEBUG=* NOTEBOOK_ID=test pnpm dev:kernel  # Verbose kernel logs

# Testing
pnpm type-check                      # Check all TypeScript
pnpm lint                           # Lint all packages
pnpm --filter @anode/schema test    # Run schema tests (needs fixing)
```

## Key Insights for Future Development

1. **LiveStore timestamp handling is complex** - simpler schemas are more reliable
2. **Event sequencing timing matters** - initial sync must complete first
3. **Polling is more predictable than reactive subscriptions** for complex workflows
4. **Schema-query alignment is critical** - ensure all queries match actual table columns
5. **Comprehensive debugging is essential** for distributed event-driven systems
6. **Schema simplification > feature completeness** for prototypes

## Communication with Next Developer

The system is now in a stable working state. All major architectural issues have been resolved:

✅ **Kernel runs without errors** - no more SQL column mismatches or sequence conflicts
✅ **Clean startup and polling** - kernel registers properly and waits for work
✅ **Stable architecture** - polling approach works reliably

Focus on:

1. **Test cleanup first** - get the test suite passing
2. **End-to-end verification** - test actual cell execution through web client
3. **Incremental improvements** - add features back gradually

The timestamp removal was aggressive but necessary - it eliminated a whole class of type conversion and query mismatch issues that were causing system instability. The kernel query fixes ensure database operations work correctly. This foundation can support adding features back with proper LiveStore patterns once core functionality is verified.