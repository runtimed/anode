# Unified Output System Design

**Status**: Draft Proposal
**Author**: Development Team
**Date**: July 2025

## Overview

This document proposes a unified output system for Anode that replaces the current single `cellOutputAdded` event with granular, type-safe events that integrate seamlessly with the existing runtime agent and media handling systems.

## Motivation

Current output handling has several gaps:

- **Single event with discriminated unions** creates complex runtime type checking
- **Large outputs** bloat the event log and memory (future artifact support)
- **Streaming scenarios** require efficient append operations
- **Type safety** is lacking with optional fields that don't apply to all output types

## Architecture Overview

The unified system replaces the existing single event with granular, type-safe events:

1. **Granular events** with precise schemas (no optional fields)
2. **Multi-media representation** using existing MediaBundle system
3. **Streaming append** operations for efficient incremental updates
4. **Future artifact integration** via discriminated union content
5. **SQL-friendly output types** for easy querying and concatenation

```
┌───────┐    events   ┌──────────┐    materialize    ┌──────────┐
│  Runtime   │ ──────►│    LiveStore    │ ─────────► │    SQL Tables   │
│ (Pyodide)  │             |   (event log)   │                   │                 │
└───────┘             └──────────┘                   └──────────┘
       │                            │                                       │
       │ artifacts                  │ sync                                  │ queries
       ▼                            ▼                                       ▼
┌──────┐             ┌───────────┐                   ┌──────────┐
│ Artifact │             │ Sync Worker      │                   │    Client UI    │
│ Storage  │             │ (/api/artifacts) │                   │  (React, etc.)  │
└──────┘             └───────────┘                   └──────────┘
```

## Current System Integration

The new events integrate seamlessly with existing systems:

**ExecutionContext methods** map to new events:

- `context.stdout(text)` → `terminalOutputAdded` / `terminalOutputAppended`
- `context.stderr(text)` → `terminalOutputAdded` / `terminalOutputAppended`
- `context.display(data)` → `multimediaDisplayOutputAdded`
- `context.result(data)` → `multimediaResultOutputAdded`
- `context.error(...)` → `errorOutputAdded`

**MediaBundle integration**:

- Existing `MediaBundle` becomes `representations` field directly
- `toAIMediaBundle()`, `validateMediaBundle()` work unchanged
- All MIME type handling and custom `+json` support preserved

## Core Schema Design

### Media Representation Types

```typescript
type MediaRepresentation =
  | { type: "inline"; data: any; metadata?: any }
  | { type: "artifact"; artifactId: string; metadata?: any };
```

### Granular Output Events

```typescript
// Multi-media display output (from display() calls)
"multimediaDisplayOutputAdded": {
  id: string;
  cellId: string;
  position: number;
  representations: Record<string, MediaRepresentation>;
  displayId?: string;  // For cross-cell updates
}

// Multi-media execution result (from result() calls)
"multimediaResultOutputAdded": {
  id: string;
  cellId: string;
  position: number;
  representations: Record<string, MediaRepresentation>;
  executionCount: number;  // Required for execute_result
}

// Terminal/shell output (appendable)
"terminalOutputAdded": {
  id: string;
  cellId: string;
  position: number;
  content: MediaRepresentation;
  streamName: "stdout" | "stderr";
}

"terminalOutputAppended": {
  outputId: string;
  content: MediaRepresentation;
}

// Markdown content (appendable, for AI responses)
"markdownOutputAdded": {
  id: string;
  cellId: string;
  position: number;
  content: MediaRepresentation;
}

"markdownOutputAppended": {
  outputId: string;
  content: MediaRepresentation;
}

// Error output
"errorOutputAdded": {
  id: string;
  cellId: string;
  position: number;
  content: MediaRepresentation;  // ErrorOutputData
}

// Clear outputs
"cellOutputsCleared": {
  cellId: string;
  wait: boolean;
  clearedBy: string;
}

// Future: Artifact creation (schema-ready, no implementation yet)
"artifactCreated": {
  id: string;                 // artifactId (e.g., notebookId/sha256)
  mimeType: string;
  byteLength: number;
  createdBy: string;
  purpose: "output" | "upload" | "temporary";
}
```

## Runtime Agent Integration

### Updated ExecutionContext Methods

```typescript
// Current implementation maps directly to new events
const context: ExecutionContext = {
  // Terminal output (stdout/stderr)
  stdout: (text: string) => {
    this.store.commit(
      events.terminalOutputAdded({
        id: crypto.randomUUID(),
        cellId: cell.id,
        streamName: "stdout",
        content: { type: "inline", data: text },
        position: outputPosition++,
      })
    );
  },

  stderr: (text: string) => {
    this.store.commit(
      events.terminalOutputAdded({
        id: crypto.randomUUID(),
        cellId: cell.id,
        streamName: "stderr",
        content: { type: "inline", data: text },
        position: outputPosition++,
      })
    );
  },

  // Multi-media display
  display: (
    data: MediaBundle,
    metadata?: Record<string, unknown>,
    displayId?: string
  ) => {
    const representations = Object.fromEntries(
      Object.entries(data).map(([mimeType, content]) => [
        mimeType,
        {
          type: "inline" as const,
          data: content,
          metadata: metadata?.[mimeType],
        },
      ])
    );

    this.store.commit(
      events.multimediaDisplayOutputAdded({
        id: crypto.randomUUID(),
        cellId: cell.id,
        representations,
        position: outputPosition++,
        displayId,
      })
    );
  },

  // Multi-media execution result
  result: (data: MediaBundle, metadata?: Record<string, unknown>) => {
    const representations = Object.fromEntries(
      Object.entries(data).map(([mimeType, content]) => [
        mimeType,
        {
          type: "inline" as const,
          data: content,
          metadata: metadata?.[mimeType],
        },
      ])
    );

    this.store.commit(
      events.multimediaResultOutputAdded({
        id: crypto.randomUUID(),
        cellId: cell.id,
        representations,
        executionCount: queueEntry.executionCount,
        position: outputPosition++,
      })
    );
  },

  // Error output
  error: (ename: string, evalue: string, traceback: string[]) => {
    this.store.commit(
      events.errorOutputAdded({
        id: crypto.randomUUID(),
        cellId: cell.id,
        content: {
          type: "inline",
          data: { ename, evalue, traceback } as ErrorOutputData,
        },
        position: outputPosition++,
      })
    );
  },

  // Clear outputs (with wait support)
  clear: (wait: boolean = false) => {
    this.store.commit(
      events.cellOutputsCleared({
        cellId: cell.id,
        wait,
        clearedBy: `runtime-${this.config.runtimeId}`,
      })
    );
  },
};
```

## Materializer Design

### Flattened SQL Schema

```sql
CREATE TABLE outputs (
  id TEXT PRIMARY KEY,
  cell_id TEXT,
  output_type TEXT,  -- 'multimedia_display', 'multimedia_result', 'terminal', 'markdown', 'error'
  stream_name TEXT,  -- 'stdout', 'stderr' for terminal outputs
  execution_count INTEGER,  -- Only for multimedia_result
  display_id TEXT,   -- Only for multimedia_display
  position INTEGER,

  -- Flattened content for SQL operations
  data TEXT,              -- Primary/concatenated content
  artifact_id TEXT,       -- Primary artifact reference
  mime_type TEXT,         -- Primary mime type
  metadata ANY,           -- Primary metadata

  -- Multi-media support
  representations ANY,    -- Full representation map for multimedia outputs

  -- Metadata
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE pending_clears (
  cell_id TEXT PRIMARY KEY,
  cleared_by TEXT
);
```

### Pure Materializers

```typescript
const materializers = State.SQLite.materializers(events, {
  "v1.MultimediaDisplayOutputAdded": ({ representations, cellId, ...rest }, ctx) => {
    const ops = handlePendingClear(cellId, ctx);

    const primary = choosePrimaryRepresentation(representations);
    ops.push(tables.outputs.insert({
      data: primary.type === "inline" ? primary.data : null,
      artifactId: primary.type === "artifact" ? primary.artifactId : null,
      metadata: primary.metadata,
      representations: representations,
      outputType: "multimedia_display",
      cellId,
      ...rest
    }));

    return ops;
  },

  "v1.MultimediaResultOutputAdded": ({ representations, executionCount, cellId, ...rest }, ctx) => {
    const ops = handlePendingClear(cellId, ctx);

    const primary = choosePrimaryRepresentation(representations);
    ops.push(tables.outputs.insert({
      data: primary.type === "inline" ? primary.data : null,
      artifactId: primary.type === "artifact" ? primary.artifactId : null,
      metadata: primary.metadata,
      representations: representations,
      outputType: "multimedia_result",
      executionCount,
      cellId,
      ...rest
    }));

    return ops;
  },

  "v1.TerminalOutputAdded": ({ content, streamName, cellId, ...rest }, ctx) => {
    const ops = handlePendingClear(cellId, ctx);

    ops.push(tables.outputs.insert({
      data: content.type === "inline" ? content.data : null,
      artifactId: content.type === "artifact" ? content.artifactId : null,
      metadata: content.metadata,
      outputType: "terminal",
      streamName,
      cellId,
      ...rest
    }));

    return ops;
  },

  "v1.TerminalOutputAppended": ({ outputId, content }) => [
    tables.outputs.update({
      data: sql`data || ${content.type === "inline" ? content.data : ""}`,
      updatedAt: new Date()
    }).where({ id: outputId })
  ],

  "v1.MarkdownOutputAdded": ({ content, cellId, ...rest }, ctx) => {
    const ops = handlePendingClear(cellId, ctx);

    ops.push(tables.outputs.insert({
      data: content.type === "inline" ? content.data : null,
      artifactId: content.type === "artifact" ? content.artifactId : null,
      metadata: content.metadata,
      outputType: "markdown",
      cellId,
      ...rest
    }));

    return ops;
  },

  "v1.MarkdownOutputAppended": ({ outputId, content }) => [
    tables.outputs.update({
      data: sql`data || ${content.type === "inline" ? content.data : ""}`,
      updatedAt: new Date()
    }).where({ id: outputId })
  ],

  "v1.ErrorOutputAdded": ({ content, cellId, ...rest }, ctx) => {
    const ops = handlePendingClear(cellId, ctx);

    ops.push(tables.outputs.insert({
      data: content.type === "inline" ? JSON.stringify(content.data) : null,
      artifactId: content.type === "artifact" ? content.artifactId : null,
      metadata: content.metadata,
      outputType: "error",
      cellId,
      ...rest
    }));

    return ops;
  },

  // Clear outputs (with wait=True support)
  "v1.CellOutputsCleared": ({ cellId, wait, clearedBy }, ctx) => {
    if (wait) {
      // Create pending clear marker, will be resolved by next output
      return [tables.pendingClears.insert({ cellId, clearedBy })];
    } else {
      // Immediate clear
      return [tables.outputs.delete().where({ cellId })];
    }
  },

  // Helper function for pending clear logic (applied to all *OutputAdded events)
  const handlePendingClear = (cellId: string, ctx: any) => {
    const ops = [];
    const pendingClear = ctx.query(tables.pendingClears.where({ cellId }).first());
    if (pendingClear) {
      ops.push(tables.outputs.delete().where({ cellId }));
      ops.push(tables.pendingClears.delete().where({ cellId }));
    }
    return ops;
  };
});
```

## Client Rendering

### Type-Safe Component Logic

Note: this is all pseudocode

```typescript
// Event type determines structure (no runtime property checking)
const OutputRenderer = ({ output }) => {
  if (output.outputType === "multimedia_display" || output.outputType === "multimedia_result") {
    // Multi-media output - choose best representation
    const best = chooseBestRepresentation(output.representations, capabilities);

    return best.type === "artifact" ? (
      <ArtifactRenderer
        artifactId={best.artifactId}
        metadata={best.metadata}
      />
    ) : (
      <InlineRenderer
        data={best.data}
        metadata={best.metadata}
      />
    );
  } else {
    // Single-media output
    const content = output.content;
    return content.type === "artifact" ? (
      <ArtifactRenderer
        artifactId={content.artifactId}
        metadata={content.metadata}
      />
    ) : (
      <div className={`output-${output.outputType}`}>
        {output.outputType === "terminal" &&
          <AnsiRenderer content={content.data} streamName={output.streamName} />}
        {output.outputType === "markdown" &&
          <MarkdownRenderer content={content.data} />}
        {output.outputType === "error" &&
          <ErrorRenderer error={content.data} />}
      </div>
    );
  }
};

// Terminal output rendering: merge stdout/stderr chronologically by default
const TerminalOutputBlock = ({ terminalOutputs }) => {
  // Merge stdout and stderr chronologically (natural terminal behavior)
  const mergedContent = terminalOutputs
    .sort((a, b) => a.position - b.position)
    .map(output => output.data)
    .join("");

  return <AnsiTerminal content={mergedContent} />;

  // Optional: debug mode to show streams separately
  // {debugMode && renderSeparateStreams(terminalOutputs)}
};

// Cell rendering: display() calls break up terminal blocks
const CellOutputs = ({ cellId }) => {
  const outputs = useQuery(tables.outputs.where({ cellId }).orderBy("position"));

  // Group outputs: terminal blocks broken by display outputs
  const outputBlocks = [];
  let currentTerminalBlock = [];

  for (const output of outputs) {
    if (output.outputType === "terminal") {
      currentTerminalBlock.push(output);
    } else {
      // Display/multimedia output breaks the terminal block
      if (currentTerminalBlock.length > 0) {
        outputBlocks.push({ type: "terminal", outputs: currentTerminalBlock });
        currentTerminalBlock = [];
      }
      outputBlocks.push({ type: "multimedia", output });
    }
  }

  // Add final terminal block if any
  if (currentTerminalBlock.length > 0) {
    outputBlocks.push({ type: "terminal", outputs: currentTerminalBlock });
  }

  return (
    <div className="cell-outputs">
      {outputBlocks.map((block, i) =>
        block.type === "terminal" ? (
          <TerminalOutputBlock key={i} terminalOutputs={block.outputs} />
        ) : (
          <OutputRenderer key={i} output={block.output} />
        )
      )}
    </div>
  );
};

```

## SQL Query Examples

Note: this is all pseudocode

### Terminal Output Aggregation

```sql
-- Get all stdout from a cell
SELECT data FROM outputs
WHERE output_type = 'terminal' AND stream_name = 'stdout' AND cell_id = 'cell123'
ORDER BY position;

-- Full terminal session
SELECT group_concat(data, '') as session
FROM outputs
WHERE output_type = 'terminal' AND cell_id = 'cell123'
ORDER BY position;
```

### AI Response Aggregation

```sql
-- Get all AI responses from notebook
SELECT cell_id, group_concat(data, '') as full_response
FROM outputs
WHERE output_type = 'markdown'
  AND cell_id IN (SELECT id FROM cells WHERE cell_type = 'ai')
GROUP BY cell_id;
```

### Multi-media Content Discovery

```sql
-- Find all matplotlib plots
SELECT cell_id, representations->>'image/png' as png_data
FROM outputs
WHERE output_type IN ('multimedia_display', 'multimedia_result')
  AND representations LIKE '%"image/png"%';
```

## Implementation Plan

### Phase 1: Enhanced Schema

- [ ] **Breaking change**: Replace `cellOutputAdded` with granular events
- [ ] Add `pending_clears` table for `clear_output(wait=True)` support
- [ ] Update materializers for SQL-friendly flattening
- [ ] Add `artifactCreated` event (schema only, no service implementation)

### Phase 2: Runtime Integration

- [ ] Update ExecutionContext methods to use new events
- [ ] Integrate MediaBundle → representations mapping
- [ ] Test all output scenarios (stdout, display, result, error)
- [ ] Ensure `clear_output(wait=True)` works correctly

### Phase 3: Client Updates

- [ ] Update output rendering components for new output types
- [ ] Implement streaming UI for terminal and markdown outputs
- [ ] Test multi-media representation selection
- [ ] Performance testing and optimization

### Phase 4: Future - Artifact Service (deferred)

- [ ] Implement artifact content routes in sync worker
- [ ] Add artifact storage backends (local/R2)
- [ ] Large content transition logic
- [ ] Environment-aware serving strategies

## Benefits

- **Type Safety**: No optional fields, event name determines exact structure
- **Runtime Efficiency**: No discriminated union checking, direct event handling
- **SQL Friendly**: Easy concatenation and querying with dedicated output types
- **Natural Terminal Behavior**: Unified stdout/stderr like real terminals, broken by display() calls
- **Streaming Ready**: Append operations for real-time terminal and AI output
- **Future Proof**: Artifact support in schema, extensible for new output types
- **Jupyter Compatible**: Full MediaBundle support for multi-media outputs

## Migration Strategy

**Breaking changes approach** (prototype phase):

- Replace entire event schema with granular events
- Update runtime agent ExecutionContext methods
- Migrate client rendering to new output type structure
- Clean migration since we're still in prototype stage

**Preserved functionality**:

- All existing MediaBundle handling and AI conversion
- MIME type support and custom `+json` extensions
- Rich output rendering capabilities
- Real-time collaborative updates

## Related Work

This design consolidates and supersedes previous proposals with a unified, type-safe approach that provides better performance and maintainability than separate systems.

**Note**: Artifact service implementation is deferred to focus on core schema and runtime integration first.
