# Unified Output System Refactor - Handoff Documentation

**Branch**: `feature/new-output-sytem`  
**Status**: Ready for implementation  
**Timeline**: 2-4 weeks  
**Breaking Changes**: Yes (prototype phase)

## Overview

This refactor replaces the single `cellOutputAdded` event with granular, type-safe events that eliminate discriminated unions and provide better streaming capabilities.

## What We're Changing

### From: Single Event + Discriminated Union

```typescript
// Old approach
"cellOutputAdded": {
  outputType: "display_data" | "execute_result" | "terminal" | "markdown" | ...
  content?: MediaRepresentation;
  representations?: Record<string, MediaRepresentation>;
}
```

### To: Granular Events

```typescript
// New approach - each event has precise, known structure
"multimediaDisplayOutputAdded": {
  representations: Record<string, MediaRepresentation>;
  displayId?: string;
}

"terminalOutputAdded": {
  content: MediaRepresentation;
  streamName: "stdout" | "stderr";
}

"terminalOutputAppended": {
  outputId: string;
  content: MediaRepresentation;
}
```

## Schema Changes Required

### New Events to Add

- `multimediaDisplayOutputAdded` - for display() calls
- `multimediaResultOutputAdded` - for execution results
- `terminalOutputAdded` - for stdout/stderr
- `terminalOutputAppended` - for streaming terminal output
- `markdownOutputAdded` - for AI responses
- `markdownOutputAppended` - for streaming markdown
- `errorOutputAdded` - for execution errors

### Enhanced Clear Support

- Update `cellOutputsCleared` with `wait: boolean` field
- Add `pendingClears` table for `clear_output(wait=True)` support

### Remove/Replace

- Replace `cellOutputAdded` entirely (breaking change)

## Implementation Priority

### Phase 1: Schema Updates (Week 1)

- [ ] Update `runt/packages/schema/mod.ts` with new events
- [ ] Add `pendingClears` table definition
- [ ] Update materializers with `handlePendingClear` logic
- [ ] **Important**: Link local schema for cross-workspace development

### Phase 2: Client Updates (Week 2)

- [ ] Update output rendering components in `src/components/notebook/`
- [ ] Implement terminal block grouping (display() calls break terminal blocks)
- [ ] Add streaming UI for append operations
- [ ] Test multi-media representation selection

### Phase 3: Integration Testing (Week 3-4)

- [ ] Test all output scenarios thoroughly
- [ ] Verify `clear_output(wait=True)` works correctly
- [ ] Performance testing with streaming outputs
- [ ] Real-time collaboration testing

## Key Technical Decisions

### Terminal Output Rendering

- **Store separately**: Keep `streamName: "stdout" | "stderr"` for debugging
- **Render merged**: Default UI merges chronologically like real terminals
- **Display breakups**: `display()` calls create separate output blocks

### MediaBundle Integration

- **Direct mapping**: Existing `MediaBundle` becomes `representations` field
- **No conversion needed**: All existing media handling works unchanged
- **AI compatibility**: `toAIMediaBundle()` works with new structure

### Clear Output Strategy

- **Pending clear table**: Separate table tracks `clear_output(wait=True)`
- **All events check**: Every `*OutputAdded` event must check for pending clears
- **Smooth replacement**: No flicker when replacing outputs

## Files That Need Updates

### Schema Package (runt)

- `runt/packages/schema/mod.ts` - event definitions and materializers

### Client Components (anode)

- `src/components/notebook/NotebookViewer.tsx` - output grouping logic
- `src/components/notebook/Cell.tsx` - cell rendering
- `src/components/notebook/AnsiOutput.tsx` - terminal rendering
- `src/components/notebook/RichOutput.tsx` - multimedia rendering

### Key Functions to Update

- All ExecutionContext output methods (handled in runt)
- Output rendering components
- Terminal block grouping logic
- Streaming append UI

## Local Development Setup

Since both anode and runt need to work together during this refactor, the anode package.json has been updated to use the local runt schema:

```json
"dependencies": {
  "@runt/schema": "file:../runt/packages/schema"
}
```

After schema changes in runt:

```bash
# In anode workspace, reinstall to pick up changes
cd anode
pnpm install
```

## Testing Strategy

### Unit Tests

- [ ] Test all new materializers
- [ ] Test pending clear logic
- [ ] Test representation selection

### Integration Tests

- [ ] Test terminal output merging
- [ ] Test display() breakups
- [ ] Test streaming append operations
- [ ] Test `clear_output(wait=True)` scenarios

### Real-world Scenarios

- [ ] matplotlib plots with text fallbacks
- [ ] Long terminal output sessions
- [ ] AI streaming responses
- [ ] Mixed stdout/stderr/display workflows

## Migration Notes

### Breaking Changes

- All existing `cellOutputAdded` events become invalid
- Client components must handle new event structure
- Materializers completely rewritten

### Preserved Functionality

- All MediaBundle handling and AI conversion
- MIME type support and custom `+json` extensions
- Rich output rendering capabilities
- Real-time collaborative updates

## Rollback Plan

If issues arise:

1. **Schema rollback**: Revert to previous event structure
2. **Client fallback**: Keep old rendering components as backup
3. **Data migration**: May need to replay events with old materializers

## Success Criteria

- [ ] No optional fields in events (full type safety)
- [ ] Terminal output feels natural (merged streams)
- [ ] Streaming append operations work smoothly
- [ ] `clear_output(wait=True)` works without flicker
- [ ] All existing rich output scenarios continue working
- [ ] Performance is equal or better than current system

## Questions/Decisions Needed

- **Schema linking**: Confirm approach for local cross-workspace development
- **Migration timing**: Coordinate schema changes between runt and anode
- **Testing scope**: Define acceptance criteria for each output scenario
- **Performance targets**: Define acceptable latency for streaming operations

## Related Documentation

- [docs/proposals/unified-output-system.md](./docs/proposals/unified-output-system.md) - Full design document
- [AGENTS.md](./AGENTS.md) - Updated development context
- [runt/AGENTS.md](../runt/AGENTS.md) - Runtime agent context
