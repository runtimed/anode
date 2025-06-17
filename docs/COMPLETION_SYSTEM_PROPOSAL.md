# Interactive Code Completion System Proposal

**Status**: Draft Proposal
**Author**: Development Team
**Date**: December 2024

## Overview

This document proposes an architecture for implementing interactive code completions in Anode notebooks using LiveStore's event-sourcing system while addressing storage growth and distributed deployment constraints.

## Background

Anode is designed as a local-first collaborative notebook system with a security-conscious "no inbound ports" architecture where:

- **Web clients** connect to Cloudflare Workers sync backend
- **Kernel servers** make outbound-only connections
- **All coordination** happens through LiveStore event synchronization

Traditional completion systems use request-response patterns with direct HTTP connections, which conflicts with our security model.

## The Challenge

Adding code completions introduces several architectural challenges:

1. **Security Constraints**: Kernel servers cannot expose inbound HTTP ports
2. **Storage Growth**: Event-sourced completions could accumulate without bound
3. **Performance Requirements**: Completions need sub-second response times
4. **Collaborative Context**: Multiple users may benefit from shared completion cache

## Related LiveStore Issues

- **[#136 - Eventlog Compaction](https://github.com/livestorejs/livestore/issues/136)**: LiveStore doesn't yet support automatic cleanup of old events
- **[#254 - Facts System](https://github.com/livestorejs/livestore/issues/254)**: Future foundation for compaction and conflict resolution
- **Storage Format Versioning**: LiveStore uses `@4` suffix for current storage format version

## Proposed Solution: Separate Completion Stores

### Architecture

Create dedicated completion stores alongside main notebook stores:

```
notebook-1750103266697-6y9q7nvc0v4              # Main notebook data
notebook-1750103266697-6y9q7nvc0v4-completions  # Completion-specific store
```

### Implementation Details

#### Store Configuration
- **Main Store**: Unchanged schema, persistent notebook data
- **Completion Store**: Separate schema optimized for completion events
- **Naming Convention**: `${notebookStoreId}-completions`

#### Kernel Integration
```typescript
// Kernel connects to both stores
const NOTEBOOK_ID = process.env.NOTEBOOK_ID;
const COMPLETION_STORE_ID = `${NOTEBOOK_ID}-completions`;

const notebookStore = await createStorePromise({
  storeId: NOTEBOOK_ID,
  schema: notebookSchema
});

const completionStore = await createStorePromise({
  storeId: COMPLETION_STORE_ID,
  schema: completionSchema
});
```

#### Completion Schema
```typescript
const completionEvents = {
  completionRequested: Events.synced({
    name: "v1.CompletionRequested",
    schema: Schema.Struct({
      completionId: Schema.String,
      cellId: Schema.String,
      source: Schema.String,
      cursorPosition: Schema.Number,
      requestedBy: Schema.String,
      timestamp: Schema.Number,
    }),
  }),

  completionReceived: Events.synced({
    name: "v1.CompletionReceived",
    schema: Schema.Struct({
      completionId: Schema.String,
      suggestions: Schema.Array(Schema.Struct({
        text: Schema.String,
        kind: Schema.String, // 'function', 'variable', 'keyword'
        documentation: Schema.optional(Schema.String),
        insertText: Schema.optional(Schema.String),
        detail: Schema.optional(Schema.String),
      })),
      status: Schema.Literal("success", "error", "timeout"),
      timestamp: Schema.Number,
    }),
  }),
};
```

### Event Flow

1. **User types** in web client code editor
2. **Web client** commits `completionRequested` event to completion store
3. **Kernel** observes completion request via reactive queries
4. **Kernel** computes completions using Jedi/IPython introspection
5. **Kernel** commits `completionReceived` event to completion store
6. **Web client** observes completion response and displays suggestions

### Storage Management Strategy

#### Phase 1: Accept Accumulation
- Allow completion events to accumulate in dedicated stores
- Monitor storage growth patterns during development
- Focus on functionality over optimization

#### Phase 2: Periodic Cleanup (Future)
```typescript
// Browser-side cleanup
const cleanupOldCompletionStores = async () => {
  const opfsRoot = await navigator.storage.getDirectory();

  for await (const [name, handle] of opfsRoot.entries()) {
    if (name.includes('-completions@') && isOlderThan(name, 7)) {
      await opfsRoot.removeEntry(name, { recursive: true });
    }
  }
};

// Sync backend cleanup mechanism TBD
// Note: Cleanup at the sync backend level needs further investigation
// based on LiveStore's sync-cf implementation details
```

## Trade-offs Analysis

### Advantages ✅

- **Security Compliant**: No inbound ports required on kernel servers
- **Schema Isolation**: Main notebook schema remains unchanged
- **Collaborative Benefits**: Shared completion cache across users
- **Event Sourcing Benefits**: Full audit trail, replay capability, offline support
- **Separation of Concerns**: Completion data isolated from notebook data
- **Future Cleanup**: Can implement retention policies later

### Disadvantages ⚠️

- **Storage Growth**: Events accumulate until cleanup implemented
- **Complexity**: Kernel must manage two LiveStore connections
- **Latency**: Additional network round-trips compared to direct HTTP
- **Resource Usage**: More memory for additional store instances

### Alternative Approaches Considered

1. **HTTP Endpoints**: Rejected due to security constraints
2. **Single Store with Cleanup Events**: More complex schema evolution
3. **Date-Rotated Stores**: Adds coordination complexity
4. **WebSocket Side Channels**: Would bypass LiveStore's benefits

## Implementation Plan

### Phase 1: Core Functionality (2 weeks)
- [ ] Implement completion schema in separate file
- [ ] Modify kernel to connect to both stores
- [ ] Add completion request/response handling
- [ ] Integrate with web client editor (CodeMirror)

### Phase 2: Performance Optimization (1 week)
- [ ] Add client-side caching and debouncing
- [ ] Implement kernel-side completion caching
- [ ] Add performance monitoring

### Phase 3: Storage Management (Future)
- [ ] Implement periodic cleanup mechanisms
- [ ] Add storage usage monitoring
- [ ] Optimize retention policies based on usage patterns

## Success Metrics

- **Completion Latency**: < 500ms for cached results, < 2s for computed results
- **Storage Growth**: Monitor and establish acceptable growth rates
- **Collaboration**: Multiple users benefit from shared completion cache
- **Reliability**: Graceful degradation when completion store unavailable

## Conclusion

The separate completion store approach provides a pragmatic solution that respects Anode's security constraints while leveraging LiveStore's collaborative benefits. By accepting short-term storage growth in exchange for implementation simplicity, we can deliver interactive completions quickly and optimize storage management as usage patterns become clear.

This approach aligns with LiveStore's roadmap for eventual compaction support while providing immediate value to users through intelligent, context-aware code completions.

---

**Next Steps**: Review proposal with team and begin Phase 1 implementation if approved.
