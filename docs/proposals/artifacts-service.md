# Artifact Service Design

This document describes how runt will store large outputs as external artifacts
instead of embedding them in LiveStore events. The goal is to keep events small
while still allowing reasonably fast display of images, files, and tables.

## Motivation

- `cellOutputAdded` events currently embed data directly. Large blobs bloat the
  event log.
- We need a consistent approach for hosted deployments (Cloudflare R2 or otherwise) and local
  setups.
- Tabular data should be available as Apache Arrow for use in browser clients.

## Overview

Artifacts are stored in an object store. Events only reference an `artifactId`
and metadata. Clients fetch the object when needed.

```
+--------------+          +------------------+
|   Runtime    |  upload  |  Artifact Store  |
| (Pyodide/JS) | -------> |  (R2, local S3)  |
+--------------+          +------------------+
       |                        |
       | artifactCreated        |
       v                        |
+--------------+                |
| LiveStore    |                |
| (events)     |                |
+--------------+                |
```

## Event Changes

- **`artifactCreated`**: `{ artifactId, mimeType, byteLength, cellId }`
- **`cellOutputAdded`**: shall accept either small data inline or
  `{ artifactId }`

Existing events remain unchanged for backward compatibility. The runtime checks
output size and chooses inline vs. artifact.

## Runtime Workflow

1. Execute code and capture output.
2. If `byteLength` > threshold (e.g., 16 KB):
   - Write bytes to the artifact service using an auth token.
   - Emit `artifactCreated` with metadata.
   - Emit `cellOutputAdded` referencing `artifactId`.
3. Otherwise emit `cellOutputAdded` with inline data.

## Artifact Service

The service is a thin HTTP API:

- **POST /artifacts** – upload bytes, returns `artifactId`.
- **GET /artifacts/{id}`** – returns the bytes (may be a signed URL for R2).

Hosted deployments use R2. Local development can run a small Node/Express or
minio server exposing the same endpoints. The runtime only needs the base URL
and an auth token.

## Tabular Data

Python results can be serialized with `pyarrow` to produce an Arrow file. Store
it as an artifact with mime type `application/vnd.apache.arrow.file`. The
frontend fetches this file and uses Arrow libraries to render tables or perform
analysis. In workflows where the same table is shown again, reuse the original
`artifactId` instead of uploading a new copy.

## Benefits

- LiveStore events stay lightweight and sync quickly.
- Large outputs (images, Arrow tables, files) are retrieved on demand.
- The same API works for hosted and local environments.

## Display Updates and Immutability

Artifacts themselves are never mutated. When a display needs to change (progress
bars, updated plots, etc.) the runtime uploads a new artifact and emits
`cellOutputUpdated` with the same `displayId` but the new `artifactId` in its
payload. Older artifacts remain in the store for caching or history purposes.
Object store versioning is optional but not required; we treat every upload as a
new immutable artifact.

## User‑Provided Artifacts

The artifact service doubles as a staging area for user uploads. Users
can push documents, snippets, or CSV files and reference them in notebook cells
or AI conversations via their `artifactId`. This keeps large context data out
of the event log while still making it accessible to other tools.
