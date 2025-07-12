# Artifact API Reference

This document provides a comprehensive reference for the artifact system APIs across all components of the Anode notebook system.

## Table of Contents

- [Backend API](#backend-api)
- [Runtime Agent API](#runtime-agent-api)
- [Frontend API](#frontend-api)
- [Python Integration API](#python-integration-api)
- [Configuration](#configuration)
- [Error Handling](#error-handling)

## Backend API

### POST /api/artifacts

Upload a new artifact to the storage backend.

#### Request

**Headers:**
- `Content-Type`: MIME type of the content
- `X-Notebook-ID`: Notebook identifier for scoping
- `X-Auth-Token`: Authentication token

**Body:** Binary content or form data

**Form Data Format:**
```
file: File object
notebookId: string
authToken: string
```

**Raw Binary Format:**
```
Content-Type: image/png
X-Notebook-ID: notebook-123
X-Auth-Token: user-token
Body: <binary data>
```

#### Response

**Success (201):**
```json
{
  "artifactId": "notebook-123/abc123def456...",
  "byteLength": 50000,
  "mimeType": "image/png"
}
```

**Error (400):**
```json
{
  "error": "FILE_TOO_SMALL",
  "message": "File size 1024 bytes is below threshold 16384 bytes"
}
```

**Error (401):**
```json
{
  "error": "AUTHENTICATION_FAILED",
  "message": "Invalid authentication token"
}
```

### GET /api/artifacts/{artifactId}

Retrieve artifact content by ID.

#### Request

**URL Parameters:**
- `artifactId`: Content-addressed artifact identifier

**Query Parameters:**
- `token`: Authentication token (required)

#### Response

**Success (200):**
- **Headers:** `Content-Type`, `Content-Length`, CORS headers
- **Body:** Binary content with appropriate MIME type

**Error (404):**
```
Artifact not found
```

**Error (401):**
```
Authentication token required
```

## Runtime Agent API

### ExecutionContext Interface

The execution context provides methods for artifact handling within runtime agents.

```typescript
interface ExecutionContext {
  // Standard output methods
  stdout(text: string): void;
  stderr(text: string): void;
  
  // Enhanced display methods with artifact support
  display(data: RawOutputData, metadata?: Record<string, unknown>, displayId?: string): void;
  result(data: RawOutputData, metadata?: Record<string, unknown>): void;
  
  // Artifact-specific methods (Phase 1)
  uploadBinary(
    data: ArrayBuffer, 
    mimeType: string, 
    metadata?: ArtifactMetadata
  ): Promise<ArtifactReference>;
  
  uploadIfNeeded(
    data: ArrayBuffer | string,
    mimeType: string,
    threshold?: number
  ): Promise<MediaContainer>;
  
  displayArtifact(
    artifactId: string,
    mimeType: string, 
    metadata?: Record<string, unknown>
  ): void;
}
```

### Types

#### ArtifactMetadata
```typescript
interface ArtifactMetadata {
  byteLength?: number;
  dimensions?: { width: number; height: number };
  source?: string; // "matplotlib", "user-upload", "pandas", etc.
  encoding?: string; // "utf-8", "binary", etc.
  compression?: string; // "gzip", "none", etc.
  [key: string]: unknown;
}
```

#### ArtifactReference
```typescript
interface ArtifactReference {
  artifactId: string;
  url: string; // Pre-authenticated URL for frontend access
  metadata: ArtifactMetadata;
}
```

#### MediaContainer
```typescript
interface MediaContainer {
  type: "inline" | "artifact";
  data?: unknown; // Only for inline
  artifactId?: string; // Only for artifact
  metadata?: Record<string, unknown>;
}
```

### Methods

#### uploadBinary()

Upload binary data directly to the artifact service.

```typescript
const artifactRef = await context.uploadBinary(
  pngData, 
  "image/png",
  { 
    dimensions: { width: 800, height: 600 },
    source: "matplotlib"
  }
);
console.log(`Uploaded as ${artifactRef.artifactId}`);
```

#### uploadIfNeeded()

Automatically decide between inline and artifact storage based on size.

```typescript
const container = await context.uploadIfNeeded(
  imageData,
  "image/png",
  16384 // 16KB threshold
);

if (container.type === "artifact") {
  console.log(`Large image uploaded as artifact: ${container.artifactId}`);
} else {
  console.log("Small image kept inline");
}
```

#### displayArtifact()

Display a pre-uploaded artifact.

```typescript
context.displayArtifact(
  "notebook-123/abc456def789",
  "image/png",
  { caption: "Generated plot", width: 800 }
);
```

## Frontend API

### Artifact Utilities

#### fetchArtifact()

Fetch artifact content as a Blob.

```typescript
import { fetchArtifact } from "../util/artifacts";

const blob = await fetchArtifact(
  "notebook-123/abc456",
  {
    authToken: "user-token",
    syncUrl: "https://api.example.com",
    signal: abortController.signal
  }
);
```

#### getArtifactUrl()

Generate an authenticated URL for artifact access.

```typescript
import { getArtifactUrl } from "../util/artifacts";

const url = getArtifactUrl(
  "notebook-123/abc456",
  {
    authToken: "user-token",
    syncUrl: "https://api.example.com"
  }
);
// Result: "https://api.example.com/api/artifacts/notebook-123/abc456?token=user-token"
```

#### uploadArtifact()

Upload a file from the frontend.

```typescript
import { uploadArtifact } from "../util/artifacts";

const response = await uploadArtifact(
  file, // File or Blob
  "notebook-123",
  {
    authToken: "user-token",
    syncUrl: "https://api.example.com"
  }
);
console.log(`Uploaded: ${response.artifactId}`);
```

### React Hooks

#### useArtifact()

Main hook for artifact loading with flexible options.

```typescript
import { useArtifact } from "../hooks/useArtifact";

const { blob, dataUrl, text, loading, error, refetch } = useArtifact(
  "notebook-123/abc456",
  {
    asDataUrl: true, // Convert to data URL for images
    asText: false,   // Convert to text for text content
    autoFetch: true  // Automatically fetch on mount
  }
);

if (loading) return <div>Loading...</div>;
if (error) return <div>Error: {error.message}</div>;
if (dataUrl) return <img src={dataUrl} alt="Artifact" />;
```

#### useArtifactDataUrl()

Simplified hook for image content.

```typescript
import { useArtifactDataUrl } from "../hooks/useArtifact";

const { dataUrl, loading, error } = useArtifactDataUrl("notebook-123/abc456");

return loading ? (
  <div>Loading image...</div>
) : error ? (
  <div>Failed to load image</div>
) : (
  <img src={dataUrl} alt="Artifact" />
);
```

#### useArtifactText()

Simplified hook for text content.

```typescript
import { useArtifactText } from "../hooks/useArtifact";

const { text, loading, error } = useArtifactText("notebook-123/abc456");

return (
  <pre>{text}</pre>
);
```

### Components

#### ArtifactRenderer

Universal component for displaying artifacts based on MIME type.

```typescript
import { ArtifactRenderer } from "../components/notebook/ArtifactRenderer";

<ArtifactRenderer
  artifactId="notebook-123/abc456"
  mimeType="image/png"
  metadata={{ byteLength: 50000 }}
  className="my-artifact"
/>
```

**Supported MIME Types:**
- **Images**: `image/png`, `image/jpeg`, `image/svg+xml`, `image/gif`
- **Text**: `text/plain`, `text/html`, `text/markdown`
- **Data**: `application/json`, `*+json`
- **Fallback**: Shows metadata and download info for unsupported types

## Python Integration API

### ArtifactUploader Class

Available in Python runtime environment as global `artifact` instance.

```python
# Upload binary data
artifact_id = await artifact.upload_binary(
    png_data,           # bytes
    "image/png",        # MIME type
    {                   # metadata (optional)
        "source": "matplotlib",
        "width": 800,
        "height": 600
    }
)

# Smart upload with threshold checking
container = await artifact.upload_if_needed(
    large_data,         # bytes
    "application/json", # MIME type
    threshold=16384     # size threshold (optional)
)

if container["type"] == "artifact":
    print(f"Uploaded as artifact: {container['artifactId']}")
else:
    print("Kept inline")
```

### JavaScript Bridge Functions

Available in Python environment for direct integration.

```python
import js

# Display pre-uploaded artifact
js.display_artifact(
    artifact_id,        # string
    "image/png",        # MIME type
    {                   # metadata (optional)
        "caption": "Generated plot",
        "width": 800
    }
)

# Check if artifact uploads are available
if hasattr(js, 'upload_binary'):
    # Use direct upload
    artifact_id = await js.upload_binary(data, mime_type, metadata)
else:
    # Fall back to IPython display
    display(Image(data=data))
```

### Matplotlib Integration

Enhanced matplotlib capture with artifact support.

```python
import matplotlib.pyplot as plt

# Configure for artifact-aware output
fig, ax = plt.subplots(figsize=(10, 8))
ax.plot(data)

# Show with automatic artifact handling
plt.show()  # Automatically uploads large plots as artifacts
```

## Configuration

### Environment Variables

#### Backend (Cloudflare Workers)
```bash
ARTIFACT_STORAGE=r2              # "r2" | "local"
ARTIFACT_THRESHOLD=16384         # Size threshold in bytes
```

#### Runtime Agent (Deno)
```bash
ARTIFACT_UPLOAD_TIMEOUT=30000    # Upload timeout in ms
ARTIFACT_RETRY_ATTEMPTS=3        # Number of retry attempts
ARTIFACT_CACHE_SIZE=100          # Number of artifacts to cache
```

#### Frontend (Vite)
```bash
VITE_ARTIFACT_CDN_URL=           # Optional CDN URL for artifacts
VITE_ARTIFACT_MAX_SIZE=104857600 # Max artifact size (100MB)
```

### Runtime Configuration

```typescript
const config = createRuntimeConfig(args, {
  runtimeType: "python3-pyodide",
  artifactConfig: {
    threshold: 16384,           // Upload threshold
    maxSize: 100 * 1024 * 1024, // Max file size (100MB)
    timeout: 30000,             // Upload timeout
    retries: 3,                 // Retry attempts
    compression: true           // Enable compression
  }
});
```

## Error Handling

### Common Error Types

#### ARTIFACT_UPLOAD_FAILED
```typescript
{
  code: "ARTIFACT_UPLOAD_FAILED",
  message: "Failed to upload artifact",
  details: {
    status: 500,
    artifactId: "notebook-123/abc456",
    retryable: true
  }
}
```

#### ARTIFACT_NOT_FOUND
```typescript
{
  code: "ARTIFACT_NOT_FOUND", 
  message: "Artifact not found",
  details: {
    artifactId: "notebook-123/nonexistent",
    retryable: false
  }
}
```

#### ARTIFACT_TOO_LARGE
```typescript
{
  code: "ARTIFACT_TOO_LARGE",
  message: "Artifact exceeds maximum size limit",
  details: {
    size: 104857600,
    maxSize: 52428800,
    retryable: false
  }
}
```

### Error Recovery

#### Automatic Fallback
```typescript
try {
  const container = await context.uploadIfNeeded(data, mimeType);
  context.display({ [mimeType]: container });
} catch (error) {
  // Fallback to inline display
  console.warn("Artifact upload failed, using inline:", error.message);
  context.display({ [mimeType]: { type: "inline", data: data } });
}
```

#### Manual Retry
```typescript
const maxRetries = 3;
let attempt = 0;

while (attempt < maxRetries) {
  try {
    const artifact = await context.uploadBinary(data, mimeType);
    break; // Success
  } catch (error) {
    attempt++;
    if (attempt >= maxRetries) {
      throw error; // Give up
    }
    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
  }
}
```

### Best Practices

#### Size Validation
```typescript
const MAX_SIZE = 100 * 1024 * 1024; // 100MB

if (data.byteLength > MAX_SIZE) {
  throw new Error(`File too large: ${data.byteLength} bytes exceeds ${MAX_SIZE} bytes`);
}
```

#### MIME Type Validation
```typescript
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/json'];

if (!ALLOWED_TYPES.includes(mimeType)) {
  throw new Error(`Unsupported MIME type: ${mimeType}`);
}
```

#### Authentication Handling
```typescript
try {
  await uploadArtifact(file, notebookId, { authToken });
} catch (error) {
  if (error.message.includes('authentication')) {
    // Trigger re-authentication
    window.location.reload();
  }
  throw error;
}
```

This API reference provides comprehensive documentation for all artifact system components, enabling developers to effectively integrate and use the artifact functionality across the Anode platform.