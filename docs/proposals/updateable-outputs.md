# Updateable Outputs Architecture Proposal

**Status**: Draft Proposal\
**Author**: Development Team\
**Date**: June 2025

## Overview

This document proposes architecture for implementing updateable outputs in Anode
notebooks to support Jupyter's `update_display_data` and `clear_output` messages
while addressing the unique challenge of merging stdout/stderr streams in our
event-sourced collaborative environment.

## Background

Jupyter notebooks support updating existing outputs through two key mechanisms:

- `update_display_data()` - Update specific display outputs by ID
- `clear_output()` - Clear all outputs from a cell

These are essential for:

- Progress bars and status indicators
- Streaming AI responses
- Interactive widgets
- Real-time data visualizations
- Long-running operation feedback

## Current State vs Jupyter Standard

### Current Anode Behavior

- All outputs are immutable once created
- Each execution creates new outputs, replacing previous ones
- Stream consolidation happens at execution completion
- No way to update existing outputs

### Jupyter Standard Behavior

```python
from IPython.display import display, update_display_data
import time

# Create output with ID
display("Starting...", display_id="status")

time.sleep(1)

# Update the same output
update_display_data("Processing...", display_id="status")

time.sleep(1)

# Update again
update_display_data("Complete!", display_id="status")
```

## Core Challenge: Stream Merging

The most complex aspect is handling stdout/stderr streams that need to be merged
with display updates:

```python
print("Starting process...")
display("Progress: 0%", display_id="progress")
print("Initializing...")
update_display_data("Progress: 50%", display_id="progress")
print("Finishing...")
update_display_data("Progress: 100%", display_id="progress")
print("Done!")
```

**Expected Output:**

```
Starting process...
Initializing...
Progress: 100%
Finishing...
Done!
```

## Proposed Architecture

### Enhanced Output Schema

```typescript
interface OutputData {
  id: string; // Unique identifier for updates
  type: OutputType;
  data: RichOutputData | StreamOutputData | ErrorOutputData;
  metadata?: Record<string, unknown>;
  position: number; // Display order
  timestamp: number; // For collaborative conflict resolution
  displayId?: string; // Jupyter display_id for updates
  streamIndex?: number; // For stream ordering
  isUpdated?: boolean; // Marks updated outputs
  originalId?: string; // References original output if updated
}
```

### New LiveStore Events

```typescript
// Update existing output by display_id
outputUpdated: Events.synced({
  name: "v1.OutputUpdated",
  schema: Schema.Struct({
    cellId: Schema.String,
    displayId: Schema.String,
    newData: Schema.Any,
    newMetadata: Schema.optional(Schema.Any),
    updatedBy: Schema.String,
    timestamp: Schema.Number,
  }),
}),

// Clear outputs with optional filtering
outputsCleared: Events.synced({
  name: "v1.OutputsCleared",
  schema: Schema.Struct({
    cellId: Schema.String,
    wait: Schema.Boolean,           // Jupyter clear_output(wait=True)
    clearType: Schema.Literal("all", "display", "stream"),
    clearedBy: Schema.String,
  }),
}),

// Stream fragment for incremental building
streamFragment: Events.synced({
  name: "v1.StreamFragment",
  schema: Schema.Struct({
    cellId: Schema.String,
    streamId: Schema.String,        // Persistent stream identifier
    name: Schema.Literal("stdout", "stderr"),
    text: Schema.String,
    fragmentIndex: Schema.Number,   // Order within stream
    timestamp: Schema.Number,
  }),
}),
```

### Stream Merging Strategy

#### Option 1: Temporal Interleaving

Merge streams based on timestamp order:

```typescript
Stream merging will require:
- Temporal ordering based on execution timestamps
- Consolidation of consecutive stream outputs of the same type
- Interleaving of stream and display outputs in chronological order
- Configurable thresholds for stream consolidation

Specific implementation approach to be determined during development.
```

#### Option 2: Position-Based Ordering

Use explicit position markers relative to execution start, allowing for precise
ordering even in distributed environments where clock synchronization may be
imperfect.

### IPython Integration Changes

The existing IPython integration will need enhancement to support:

- Display ID tracking for updateable outputs
- `update_display_data()` and `clear_output()` callbacks
- Position tracking for stream outputs
- Communication with JavaScript via callback system

Implementation details for the enhanced display publisher and stream handling to
be determined.

### Web Client Updates

The web client will need enhancements to:

- Process and merge stream outputs with display data
- Handle real-time output updates via LiveStore subscriptions
- Render updated outputs without full re-render
- Manage output ordering and conflict resolution

Specific component architecture and update handling to be designed during
implementation.

## Collaborative Conflict Resolution

### Concurrent Updates

When multiple users update the same display_id simultaneously, conflict
resolution strategies will include:

- **Last-write-wins** - Simple timestamp-based resolution
- **Merge strategies** - For compatible text-based outputs
- **User choice** - Present conflict resolution UI when needed

LiveStore's event-sourcing foundation provides natural conflict detection and
resolution capabilities.

### Stream Position Conflicts

Out-of-order stream fragments will be handled through:

- Primary ordering by execution sequence
- Secondary ordering by timestamp
- Fragment index tracking within streams

Implementation approach to be determined based on testing with real
collaborative scenarios.

## Implementation Phases

### Phase 1: Basic Update Support (2 weeks)

- [ ] Add display_id support to output schema
- [ ] Implement `update_display_data` in IPython integration
- [ ] Add output update events to LiveStore
- [ ] Update web client to handle output updates

### Phase 2: Stream Merging (2 weeks)

- [ ] Implement position-based stream ordering
- [ ] Add stream fragment events
- [ ] Create StreamMerger for temporal interleaving
- [ ] Test complex stream/display interleavings

### Phase 3: Clear Output Support (1 week)

- [ ] Implement `clear_output(wait=True/False)`
- [ ] Add selective clearing (display vs stream)
- [ ] Handle collaborative clearing conflicts
- [ ] Add undo/redo for clear operations

### Phase 4: Conflict Resolution (1 week)

- [ ] Implement last-write-wins for display updates
- [ ] Add conflict detection and logging
- [ ] Create user choice resolution UI
- [ ] Performance optimization for large output sets

## Open Questions

### Stream Merging Strategy

- **Q**: Should we use timestamp-based or position-based ordering?
- **Q**: How to handle clock drift in collaborative environments?
- **Q**: What's the right threshold for stream consolidation?

### Performance Implications

- **Q**: How to handle notebooks with thousands of outputs?
- **Q**: Should we implement output pagination or virtualization?
- **Q**: How to optimize conflict resolution performance?

### Jupyter Compatibility

- **Q**: Are there edge cases in Jupyter's update semantics we're missing?
- **Q**: How to handle widgets that depend on display_id updates?
- **Q**: Should we support Jupyter's output metadata updates?

### User Experience

- **Q**: How to show users when outputs are being updated vs replaced?
- **Q**: Should there be visual indicators for collaborative output conflicts?
- **Q**: How to handle undo/redo of output updates?

## Success Metrics

- **Jupyter Compatibility**: 100% compatibility with standard
  update_display_data usage
- **Stream Accuracy**: Correct ordering of interleaved streams and displays
- **Performance**: < 100ms latency for output updates
- **Collaboration**: Conflict-free experience for concurrent users
- **Real-world Usage**: Progress bars, streaming responses work flawlessly

## Related Standards

- **Jupyter Messaging Protocol**:
  [Output Message Types](https://jupyter-client.readthedocs.io/en/stable/messaging.html#messages-on-the-iopub-channel)
- **IPython Display System**:
  [Rich Display Documentation](https://ipython.readthedocs.io/en/stable/api/generated/IPython.display.html)
- **LiveStore Event Sourcing**: Event-based conflict resolution patterns

---

**Next Steps**: Begin with Phase 1 implementation focusing on basic display_id
update support, then tackle the complex stream merging challenge in Phase 2.
