# Artifact Service Design

**Status: 🚧 FIRST VERSION DEPLOYED** - Basic artifact service is operational but has known limitations.

This document describes how runt will store large outputs as external artifacts
instead of embedding them in LiveStore events. The goal is to keep events small
while still allowing reasonably fast display of images, files, and tables.

## Implementation Status

**✅ First Version Deployed:**

- POST /api/artifacts endpoint for uploading large outputs (with auth token authentication)
- GET /api/artifacts/{id} content routes for serving artifacts (currently unauthenticated)
- R2 and local storage backends with environment-aware switching
- Basic artifact ID generation with notebook scoping
- Integration with unified worker architecture

**⚠️ Known Limitations (First Version):**

- Downloads are currently unauthenticated (security concern)
- No multipart upload support for very large files
- No validation that users have permission to add artifacts to specific notebooks
- No validation that users can view specific artifacts
- Basic UUID-based artifact IDs instead of content addressing
- No garbage collection for orphaned artifacts

**🚧 Immediate Security & Reliability Fixes:**

- Authenticated downloads (cookies or signed URLs)
- User permission validation for notebook artifacts
- Multipart upload support for large files
- Proper content addressing with deduplication
- Garbage collection for orphaned artifacts

**🚧 Runtime Integration (Next Steps):**

- Runtime agents automatically uploading large outputs to artifact service
- MediaRepresentationSchema usage in output events (inline vs artifact)
- Frontend rendering of artifact-based outputs
- Size threshold enforcement in runtime execution context

**🔮 Future Enhancements:**

- Streaming upload/download for very large files
- Pre-signed URLs for R2 optimization
- Compression for text-based artifacts
- CDN integration for faster artifact serving

## Motivation

- Output events currently embed data directly via `MediaRepresentationSchema`. Large blobs bloat the event log.
- We need a consistent approach for hosted deployments (Cloudflare R2) and local setups.
- Tabular data should be available as Apache Arrow for use in browser clients.

## Overview

Artifacts are stored in an object store. Events only reference an `artifactId`
and metadata. Clients fetch the object when needed via content routes.

```
+--------------+          +------------------+
|   Runtime    |  upload  |  Sync Worker     |
| (Pyodide/JS) | -------> |  /api/artifacts  |
+--------------+          +------------------+
       |                        |
       | output events          | content route
       v                        v
+--------------+          +------------------+
| LiveStore    |          |  Artifact Store  |
| (events)     |          |  (R2, local S3)  |
+--------------+          +------------------+
```

## Current Schema Support

The schema already supports artifacts via `MediaRepresentationSchema`:

```typescript
const MediaRepresentationSchema = Schema.Union(
  Schema.Struct({
    type: Schema.Literal("inline"),
    data: Schema.Any,
    metadata: Schema.optional(
      Schema.Record({ key: Schema.String, value: Schema.Any })
    ),
  }),
  Schema.Struct({
    type: Schema.Literal("artifact"),
    artifactId: Schema.String,
    metadata: Schema.optional(
      Schema.Record({ key: Schema.String, value: Schema.Any })
    ),
  })
);
```

## Current Output Events

The unified output system uses granular events with `MediaRepresentationSchema`:

### Multi-media Outputs

```typescript
// multimediaDisplayOutputAdded & multimediaResultOutputAdded
{
  id: string;
  cellId: string;
  position: number;
  representations: Record<string, MediaRepresentationSchema>;
  displayId?: string; // for display outputs
  executionCount?: number; // for result outputs
}
```

### Simple Outputs

```typescript
// terminalOutputAdded, markdownOutputAdded, errorOutputAdded
{
  id: string;
  cellId: string;
  position: number;
  content: MediaRepresentationSchema;
  streamName?: "stdout" | "stderr"; // for terminal outputs
}
```

## Implementation Examples

**Multi-media matplotlib output**:

```typescript
{
  outputType: "display_data",
  representations: {
    "image/png": {
      type: "artifact",
      artifactId: "notebook123/abc123",
      metadata: { byteLength: 50000 }
    },
    "text/plain": {
      type: "inline",
      data: "<Figure size 640x480>"
    }
  }
}
```

**Simple large output**:

```typescript
{
  outputType: "execute_result",
  content: {
    type: "artifact",
    artifactId: "notebook123/def456",
    metadata: {
      mimeType: "application/json",
      byteLength: 50000
    }
  }
}
```

**Small inline output**:

```typescript
{
  outputType: "terminal",
  content: {
    type: "inline",
    data: "Hello, world!\n"
  },
  streamName: "stdout"
}
```

## Runtime Workflow

1. Execute code and capture output.
2. For each media type representation:
   - If `byteLength` > threshold (configurable, default 16KB):
     - Upload bytes to `/api/artifacts` endpoint.
     - Use `{ type: "artifact", artifactId, metadata }` in event.
   - Otherwise use `{ type: "inline", data }` in event.
3. Emit appropriate output event (`multimediaDisplayOutputAdded`, `terminalOutputAdded`, etc.).

## Artifact Content Routes

**Implementation**: Extend existing sync worker with artifact content routes:

- **POST /api/artifacts** – upload bytes, returns `artifactId`
- **GET /api/artifacts/{id}** – serves content directly (not an API endpoint)

**These are content routes, not API endpoints**. They serve binary data directly
to HTML elements (`<img>`, `<video>`, etc.) rather than JSON to JavaScript.

**Authentication approaches**:

**Local development**: Direct serving with simple auth

```typescript
// Cookie-based or URL token validation
GET /api/artifacts/abc123?token=temp_token
→ 200 OK, Content-Type: image/png, [binary data]
```

**Production**: Pre-signed URLs for R2

```typescript
// Redirect to signed R2 URL
GET /api/artifacts/abc123
→ 302 Found, Location: https://r2.example.com/abc123?signature=...
```

**Environment-aware serving**:

```typescript
if (env.ARTIFACT_STORAGE === "local") {
  return new Response(fileBytes, {
    headers: { "Content-Type": mimeType },
  });
} else {
  return Response.redirect(signedUrl);
}
```

## Artifact Identification

**Content addressing with namespace scoping**:

```typescript
artifactId = `${notebookId}/${sha256(content)}`;
```

Benefits:

- Enables deduplication within notebooks
- Prevents hash enumeration attacks across notebooks
- Natural garbage collection via event log compaction

## Storage Backend

**Production**: Cloudflare R2 with pre-signed URLs for performance
**Development**: Local file system or minio for simplicity

**Configuration**:

```typescript
const ARTIFACT_THRESHOLD = parseInt(env.ARTIFACT_THRESHOLD || "16384"); // 16KB
const ARTIFACT_STORAGE = env.ARTIFACT_STORAGE || "local"; // "local" | "r2"
```

## Context Integration

The artifact service integrates seamlessly with the existing `ExecutionContext`:

```typescript
interface ExecutionContext {
  // Current methods
  stdout(text: string): void;
  display(data: any, metadata?: Record<string, any>): void;
  markdown(content: string, metadata?: Record<string, any>): string;

  // New artifact-aware methods
  displayFile(
    artifactId: string,
    mimeType: string,
    metadata?: Record<string, any>
  ): void;
  uploadArtifact(data: ArrayBuffer, mimeType: string): Promise<string>;
}
```

## Output Type Mapping

Current output events map to artifact service:

| Event Type                     | Artifact Usage         | Example                 |
| ------------------------------ | ---------------------- | ----------------------- |
| `multimediaDisplayOutputAdded` | Multi-format artifacts | matplotlib: PNG + text  |
| `multimediaResultOutputAdded`  | Multi-format artifacts | pandas: HTML + JSON     |
| `terminalOutputAdded`          | Large terminal output  | Long compilation logs   |
| `markdownOutputAdded`          | Large markdown content | Generated documentation |
| `errorOutputAdded`             | Large error traces     | Full stack traces       |

## Tabular Data

Python results serialized with `pyarrow` to produce Arrow format. Store as
artifact with mime type `application/vnd.apache.arrow.file`. Frontend fetches
and uses Arrow libraries for rendering/analysis.

```typescript
// Pandas DataFrame output
{
  representations: {
    "text/html": {
      type: "artifact",
      artifactId: "notebook123/table-html",
      metadata: { byteLength: 25000 }
    },
    "application/vnd.apache.arrow.file": {
      type: "artifact",
      artifactId: "notebook123/table-arrow",
      metadata: { byteLength: 15000, rows: 1000 }
    }
  }
}
```

**Subset handling**: UI indicates when viewing partial data, provides option to
fetch full dataset.

## Display Updates and Immutability

Artifacts are immutable. Updates create new artifacts:

- Runtime uploads new artifact
- Emits new output event (or `markdownOutputAppended` for streaming)
- Old artifacts remain for caching/history

## Benefits

- LiveStore events stay lightweight and sync quickly
- Large outputs retrieved on demand via content routes
- Multi-media outputs properly supported (PNG + text representations)
- Unified auth with existing sync worker
- Document-scoped access control
- Natural garbage collection via event log compaction
- Works for both local and hosted deployments
- Seamless integration with existing output system

## User-Provided Artifacts

The artifact service doubles as a staging area for user uploads. Users can push
documents, snippets, or CSV files and reference them in notebook cells or AI
conversations via their `artifactId`. This keeps large context data out of the
event log while still making it accessible to other tools.

## Implementation Priority

1. ✅ **Backend endpoints**: POST `/api/artifacts` → storage upload → return `artifactId`
2. ⚠️ **Content routes**: GET `/api/artifacts/{id}` → serve content directly (unauthenticated)
3. ⚠️ **Auth integration**: Upload authentication working, download authentication pending
4. ✅ **Size threshold**: Configurable via environment variable (ARTIFACT_THRESHOLD)
5. 🚧 **Security fixes**: Authenticated downloads, permission validation, multipart uploads
6. 🚧 **Runtime integration**: Update ExecutionContext to use artifact threshold
7. 🚧 **Frontend rendering**: Display artifact-based outputs in notebook interface
8. 🚧 **Content addressing**: SHA-256 deduplication within notebook scope

## Error Handling

**Upload failures**: Runtime retries with exponential backoff, falls back to
inline data if threshold allows.

**Fetch failures**: Client shows error state, provides retry option.

**Authentication failures**: Same error handling as existing sync endpoints.

## Future Considerations

**Streaming artifacts**: For very large outputs, consider streaming upload/download
to avoid memory pressure.

**Content route optimization**:

- Proper HTTP caching headers
- CDN integration for hosted deployments
- Progressive loading for large artifacts

**Garbage collection**: Implement cleanup for orphaned artifacts based on event
log compaction and TTL policies.

**Compression**: Automatic compression for text-based artifacts (JSON, HTML, etc.)
to reduce storage costs and transfer time.
