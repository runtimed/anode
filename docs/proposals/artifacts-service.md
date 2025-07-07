# Artifact Service Design

This document describes how runt will store large outputs as external artifacts
instead of embedding them in LiveStore events. The goal is to keep events small
while still allowing reasonably fast display of images, files, and tables.

## Motivation

- `cellOutputAdded` events currently embed data directly. Large blobs bloat the
  event log.
- We need a consistent approach for hosted deployments (Cloudflare R2) and local
  setups.
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
       | cellOutputAdded        | content route
       v                        v
+--------------+          +------------------+
| LiveStore    |          |  Artifact Store  |
| (events)     |          |  (R2, local S3)  |
+--------------+          +------------------+
```

## Event Schema

**Single atomic event** supporting multi-media representations:

```typescript
"cellOutputAdded": {
  cellId: string;
  displayId?: string;
  position: number;
  outputType: "display_data" | "execute_result" | "stream" | "error";

  // For multi-media outputs (e.g., matplotlib with PNG + text)
  representations?: {
    [mimeType: string]: {
      artifactId?: string;  // Large content → artifact
      data?: any;           // Small content → inline
    };
  };

  // For simple outputs
  data?: any;
  artifactId?: string;
  artifactMeta?: {
    mimeType: string;
    byteLength: number;
  };
}
```

**Examples**:

```typescript
// Multi-media matplotlib output
{
  outputType: "display_data",
  representations: {
    "image/png": { artifactId: "notebook123/abc123" },
    "text/plain": { data: "<Figure size 640x480>" }
  }
}

// Simple large output
{
  outputType: "execute_result",
  artifactId: "notebook123/def456",
  artifactMeta: { mimeType: "application/json", byteLength: 50000 }
}
```

## Runtime Workflow

1. Execute code and capture output.
2. For each media type representation:
   - If `byteLength` > threshold (configurable, default 16KB):
     - Upload bytes to `/api/artifacts` endpoint.
     - Reference via `artifactId` in event.
   - Otherwise include inline via `data` field.
3. Emit single `cellOutputAdded` event with all representations.

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

## Tabular Data

Python results serialized with `pyarrow` to produce Arrow format. Store as
artifact with mime type `application/vnd.apache.arrow.file`. Frontend fetches
and uses Arrow libraries for rendering/analysis.

**Subset handling**: UI indicates when viewing partial data, provides option to
fetch full dataset.

## Display Updates and Immutability

Artifacts are immutable. Updates create new artifacts:

- Runtime uploads new artifact
- Emits `cellOutputUpdated` with same `displayId` but new `artifactId`
- Old artifacts remain for caching/history

## Benefits

- LiveStore events stay lightweight and sync quickly
- Large outputs retrieved on demand via content routes
- Multi-media outputs properly supported (PNG + text representations)
- Unified auth with existing sync worker
- Document-scoped access control
- Natural garbage collection via event log compaction
- Works for both local and hosted deployments

## User-Provided Artifacts

The artifact service doubles as a staging area for user uploads. Users can push
documents, snippets, or CSV files and reference them in notebook cells or AI
conversations via their `artifactId`. This keeps large context data out of the
event log while still making it accessible to other tools.

## Implementation Priority

1. **Happy path**: POST `/api/artifacts` → storage upload → return `artifactId`
2. **Content routes**: GET `/api/artifacts/{id}` → serve content directly
3. **Event schema**: Support both simple and multi-media representations
4. **Auth integration**: Environment-aware serving (cookies vs pre-signed URLs)
5. **Size threshold**: Configurable via environment variable
6. **Deduplication**: Content addressing within notebook scope

## Error Handling

**Upload failures**: Runtime retries with exponential backoff, falls back to
inline data if threshold allows.

**Fetch failures**: Client shows error state, provides retry option.

**Authentication failures**: Same error handling as existing sync endpoints.

## Future Considerations

**SQL-friendly output types**: When adding new output types (`text`, `terminal`,
`markdown`), they work seamlessly with the artifact system. The `outputType`
describes semantics, while `artifactId` handles delivery optimization.

**Content route optimization**:

- Proper HTTP caching headers
- CDN integration for hosted deployments
- Progressive loading for large artifacts
