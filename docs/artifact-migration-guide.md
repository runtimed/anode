# Artifact System Migration Guide

This guide provides step-by-step instructions for implementing the artifact system across all phases of development, from initial setup to production deployment.

## Overview

The artifact system migration is designed to be incremental and non-breaking, allowing existing notebooks to continue working while new functionality is gradually rolled out.

## Migration Phases

### Phase 1: Core Infrastructure ⏳
**Status**: In Progress  
**Target**: Establish basic artifact upload/download capabilities

### Phase 2: Python Integration 📋
**Status**: Planned  
**Target**: Direct binary upload from Python runtime

### Phase 3: Enhanced Frontend 📋
**Status**: Planned  
**Target**: Improved user experience and file uploads

### Phase 4: Production Optimizations 📋
**Status**: Planned  
**Target**: CDN, compression, and scalability

---

## Phase 1: Core Infrastructure

### Prerequisites

- [x] Cloudflare Workers development environment
- [x] R2 bucket configured (or local simulation)
- [x] TypeScript build system
- [x] React development environment

### Backend Changes

#### 1. Update `wrangler.toml`

Add artifact service configuration:

```toml
# Development environment
[[r2_buckets]]
binding = "ARTIFACT_BUCKET"
bucket_name = "anode-artifacts-dev"

[vars]
ARTIFACT_STORAGE = "r2"
ARTIFACT_THRESHOLD = "16384"

# Production environment  
[env.production]
[[env.production.r2_buckets]]
binding = "ARTIFACT_BUCKET"
bucket_name = "anode-artifacts-prod"

[env.production.vars]
ARTIFACT_STORAGE = "r2"
ARTIFACT_THRESHOLD = "16384"
```

#### 2. Update `.dev.vars`

```bash
AUTH_TOKEN="insecure-token-change-me"
ARTIFACT_STORAGE="r2"
ARTIFACT_THRESHOLD="16384"
```

#### 3. Verify Backend Endpoints

Test the artifact endpoints:

```bash
# Upload test
curl -X POST http://localhost:8787/api/artifacts \
  -F "file=@test-file.png" \
  -F "notebookId=test-notebook" \
  -F "authToken=insecure-token-change-me"

# Download test
curl "http://localhost:8787/api/artifacts/{artifact-id}?token=insecure-token-change-me"
```

Expected responses:
- Upload: `201 Created` with artifact ID
- Download: `200 OK` with correct Content-Type

### Runtime Agent Changes

#### 1. Update Dependencies

In `runt/packages/lib/deno.json`:

```json
{
  "imports": {
    "@runt/schema": "jsr:@runt/schema@^0.6.2",
    "@std/cli": "jsr:@std/cli@^1.0.0",
    "npm:@livestore/adapter-node": "npm:@livestore/adapter-node@^0.3.1",
    "npm:@livestore/livestore": "npm:@livestore/livestore@^0.3.1",
    "npm:@livestore/sync-cf": "npm:@livestore/sync-cf@^0.3.1",
    "npm:@opentelemetry/api": "npm:@opentelemetry/api@^1.9.0"
  }
}
```

#### 2. Add Artifact Upload Integration

The artifact upload integration is already implemented in:
- `runt/packages/lib/src/media/types.ts` - Upload utilities
- `runt/packages/pyodide-runtime-agent/src/pyodide-agent.ts` - Runtime integration

#### 3. Test Runtime Integration

```bash
cd runt
deno task test:unit
```

All tests should pass, including the new artifact upload tests.

### Frontend Changes

#### 1. Update Artifact Renderer

The `ArtifactRenderer` component is implemented in:
- `anode/src/components/notebook/ArtifactRenderer.tsx`
- `anode/src/hooks/useArtifact.ts`
- `anode/src/util/artifacts.ts`

#### 2. Update RichOutput Integration

The `RichOutput` component has been updated to detect and render artifact containers.

#### 3. Test Frontend Integration

```bash
cd anode
pnpm dev
```

Navigate to a notebook and test artifact rendering with large outputs.

### Validation Checklist

- [ ] Backend endpoints respond correctly
- [ ] Runtime agent uploads large outputs as artifacts
- [ ] Frontend displays artifacts properly
- [ ] Authentication works for artifact access
- [ ] Error handling works for failed uploads
- [ ] Artifacts are properly scoped by notebook ID

### Known Issues

#### Issue: Image Display Problems
**Symptoms**: Images show as broken links or `[object Object]`
**Cause**: URL mismatch between Vite dev server (5173) and Wrangler (8787)
**Status**: Fixed in `ArtifactRenderer` to use correct sync URL

#### Issue: Base64 Text in Artifacts
**Symptoms**: Artifacts contain base64 text instead of binary data
**Cause**: IPython display system converts binary to base64
**Status**: Addressed in Phase 2 with direct binary upload

---

## Phase 2: Python Integration

### Goals

- Eliminate double conversion (binary → base64 → artifact)
- Provide direct upload API in Python environment
- Maintain backward compatibility with existing notebooks

### Implementation Steps

#### 1. Extend ExecutionContext Interface

Add to `runt/packages/lib/src/types.ts`:

```typescript
interface ExecutionContext {
  // Existing methods...
  
  /** Upload binary data directly to artifact service */
  uploadBinary(
    data: ArrayBuffer, 
    mimeType: string, 
    metadata?: ArtifactMetadata
  ): Promise<ArtifactReference>;
  
  /** Upload with automatic size threshold checking */
  uploadIfNeeded(
    data: ArrayBuffer | string,
    mimeType: string,
    threshold?: number
  ): Promise<MediaContainer>;
  
  /** Display pre-uploaded artifact */
  displayArtifact(
    artifactId: string,
    mimeType: string, 
    metadata?: Record<string, unknown>
  ): void;
}
```

#### 2. Implement ExecutionContext Methods

Add to `runt/packages/lib/src/runtime-agent.ts`:

```typescript
private async processExecution(queueEntry: ExecutionQueueData): Promise<void> {
  // ... existing code ...
  
  const executionContext: ExecutionContext = {
    // ... existing methods ...
    
    uploadBinary: async (data: ArrayBuffer, mimeType: string, metadata?: ArtifactMetadata) => {
      const artifactConfig = {
        syncUrl: this.config.syncUrl.replace("ws://", "http://").replace("wss://", "https://").replace("/api", ""),
        authToken: this.config.authToken,
        notebookId: this.config.notebookId,
      };
      
      const response = await uploadArtifact(data, mimeType, artifactConfig);
      
      return {
        artifactId: response.artifactId,
        url: getArtifactContentUrl(response.artifactId, artifactConfig),
        metadata: { byteLength: response.byteLength, mimeType: response.mimeType, ...metadata }
      };
    },
    
    uploadIfNeeded: async (data: ArrayBuffer | string, mimeType: string, threshold = 16384) => {
      const artifactConfig = {
        syncUrl: this.config.syncUrl.replace("ws://", "http://").replace("wss://", "https://").replace("/api", ""),
        authToken: this.config.authToken,
        notebookId: this.config.notebookId,
        threshold,
      };
      
      return await uploadArtifactIfNeeded(data, mimeType, artifactConfig);
    },
    
    displayArtifact: (artifactId: string, mimeType: string, metadata?: Record<string, unknown>) => {
      this.store.commit(
        events.multimediaDisplayOutputAdded({
          id: crypto.randomUUID(),
          cellId: cell.id,
          position: this.getNextOutputPosition(cell.id),
          representations: {
            [mimeType]: {
              type: "artifact",
              artifactId,
              metadata: metadata || {},
            },
          },
        })
      );
    },
  };
}
```

#### 3. Add JavaScript Bridge to Pyodide Worker

Update `runt/packages/pyodide-runtime-agent/src/pyodide-worker.ts`:

```typescript
// Add to the worker initialization
pyodide.globals.set("js_upload_binary", async (data: Uint8Array, mimeType: string, metadata: Record<string, unknown> = {}) => {
  try {
    const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    
    self.postMessage({
      type: "upload_binary",
      data: {
        buffer,
        mimeType,
        metadata,
      },
    });
    
    // Return promise that resolves when upload completes
    return new Promise((resolve, reject) => {
      const messageHandler = (event: MessageEvent) => {
        if (event.data.type === "upload_complete") {
          self.removeEventListener("message", messageHandler);
          resolve(event.data.artifactId);
        } else if (event.data.type === "upload_error") {
          self.removeEventListener("message", messageHandler);
          reject(new Error(event.data.error));
        }
      };
      self.addEventListener("message", messageHandler);
    });
  } catch (error) {
    console.error("Error in js_upload_binary:", error);
    throw error;
  }
});
```

#### 4. Handle Upload Messages in Pyodide Agent

Update `runt/packages/pyodide-runtime-agent/src/pyodide-agent.ts`:

```typescript
private handleWorkerMessage(event: MessageEvent): void {
  const { id, type, data, error } = event.data;

  // Handle binary uploads
  if (type === "upload_binary") {
    this.handleBinaryUpload(data)
      .then(artifactId => {
        if (this.worker) {
          this.worker.postMessage({
            type: "upload_complete",
            artifactId,
          });
        }
      })
      .catch(error => {
        if (this.worker) {
          this.worker.postMessage({
            type: "upload_error",
            error: error.message,
          });
        }
      });
    return;
  }
  
  // ... existing message handling ...
}

private async handleBinaryUpload(data: { buffer: ArrayBuffer; mimeType: string; metadata: Record<string, unknown> }): Promise<string> {
  if (!this.currentExecutionContext) {
    throw new Error("No active execution context for binary upload");
  }
  
  const artifact = await this.currentExecutionContext.uploadBinary(
    data.buffer,
    data.mimeType,
    data.metadata
  );
  
  return artifact.artifactId;
}
```

#### 5. Update Python Environment

Update `runt/packages/pyodide-runtime-agent/src/ipython-setup.py`:

```python
# Add artifact uploader class
class ArtifactUploader:
    def __init__(self):
        self.js_upload_binary = None
        
    async def upload_binary(self, data: bytes, mime_type: str, metadata: dict = None) -> str:
        """Upload binary data directly to artifact service"""
        if self.js_upload_binary:
            import numpy as np
            # Convert bytes to Uint8Array for JavaScript
            uint8_array = np.frombuffer(data, dtype=np.uint8)
            return await self.js_upload_binary(uint8_array, mime_type, metadata or {})
        else:
            raise RuntimeError("Binary upload not available in this environment")
    
    async def upload_if_needed(self, data: bytes, mime_type: str, threshold: int = 16384) -> dict:
        """Upload if over threshold, return MediaContainer"""
        if len(data) > threshold:
            artifact_id = await self.upload_binary(data, mime_type)
            return {
                "type": "artifact",
                "artifactId": artifact_id,
                "metadata": {"byteLength": len(data), "mimeType": mime_type}
            }
        else:
            return {
                "type": "inline", 
                "data": data
            }

# Global instance
artifact = ArtifactUploader()

# Set up the JavaScript bridge when available
def setup_artifact_bridge():
    """Connect to JavaScript upload functions"""
    try:
        import js
        if hasattr(js, 'js_upload_binary'):
            artifact.js_upload_binary = js.js_upload_binary
            print("Artifact upload bridge connected")
        else:
            print("Artifact upload not available - using fallback")
    except Exception as e:
        print(f"Could not set up artifact bridge: {e}")

# Updated matplotlib capture
def _capture_matplotlib_show(block=None):
    """Capture matplotlib plots with direct binary upload"""
    if plt.get_fignums():
        fig = plt.gcf()
        png_buffer = io.BytesIO()

        try:
            fig.savefig(
                png_buffer,
                format="png",
                bbox_inches="tight",
                facecolor="white",
                edgecolor="none",
                dpi=150,
            )
            png_data = png_buffer.getvalue()
            png_buffer.close()

            # Try direct upload first
            if len(png_data) > 16384 and hasattr(artifact, 'js_upload_binary') and artifact.js_upload_binary:
                try:
                    import asyncio
                    loop = asyncio.get_event_loop()
                    artifact_id = loop.run_until_complete(
                        artifact.upload_binary(png_data, "image/png", {"source": "matplotlib"})
                    )
                    
                    # Display artifact reference
                    import js
                    if hasattr(js, 'display_artifact'):
                        js.display_artifact(artifact_id, "image/png", {"source": "matplotlib"})
                    else:
                        # Fallback to base64 display
                        import base64
                        from IPython.display import display
                        png_base64 = base64.b64encode(png_data).decode("ascii")
                        display_data = {"image/png": png_base64}
                        display(display_data, raw=True)
                        
                except Exception as e:
                    print(f"Direct upload failed, using fallback: {e}")
                    # Fallback to base64 display
                    import base64
                    from IPython.display import display
                    png_base64 = base64.b64encode(png_data).decode("ascii")
                    display_data = {"image/png": png_base64}
                    display(display_data, raw=True)
            else:
                # Use base64 display for small images or when upload unavailable
                import base64
                from IPython.display import display
                png_base64 = base64.b64encode(png_data).decode("ascii")
                display_data = {"image/png": png_base64}
                display(display_data, raw=True)

            plt.clf()
        except Exception as e:
            print(f"Error capturing plot: {e}")

# Set up the bridge on initialization
setup_artifact_bridge()
```

### Testing Phase 2

1. **Start development environment:**
   ```bash
   cd anode && pnpm dev:sync &
   cd anode && pnpm dev &
   cd runt && NOTEBOOK_ID=test-notebook pnpm dev:runtime
   ```

2. **Test direct upload in Python:**
   ```python
   import matplotlib.pyplot as plt
   import numpy as np
   
   # Generate large plot
   fig, axes = plt.subplots(5, 5, figsize=(15, 15))
   for i, ax in enumerate(axes.flat):
       ax.plot(np.random.randn(100))
       ax.set_title(f'Plot {i}')
   plt.tight_layout()
   plt.show()  # Should use direct binary upload
   ```

3. **Verify binary content:**
   ```bash
   # Check that artifact contains PNG binary data, not base64 text
   curl -s "http://localhost:8787/api/artifacts/{artifact-id}?token=insecure-token-change-me" | file -
   # Should show: "PNG image data" not "ASCII text"
   ```

### Validation Checklist

- [ ] Binary upload methods added to ExecutionContext
- [ ] JavaScript bridge functions working in Python
- [ ] Large matplotlib plots uploaded as binary artifacts
- [ ] Small plots still use inline display
- [ ] Artifacts contain actual binary data, not base64 text
- [ ] Frontend displays binary artifacts correctly
- [ ] Fallback to base64 display when upload fails

---

## Phase 3: Enhanced Frontend

### Goals

- Improve artifact rendering performance
- Add user file upload capabilities
- Enhance error handling and user feedback
- Add progressive loading for large artifacts

### Implementation Steps

#### 1. Enhanced ArtifactRenderer

```typescript
// Add to anode/src/components/notebook/ArtifactRenderer.tsx

interface ArtifactRendererProps {
  artifactId: string;
  mimeType: string;
  metadata?: {
    byteLength?: number;
    dimensions?: { width: number; height: number };
    [key: string]: unknown;
  };
  className?: string;
  showProgress?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export const ArtifactRenderer: React.FC<ArtifactRendererProps> = ({
  artifactId,
  mimeType,
  metadata,
  className = "",
  showProgress = true,
  onLoad,
  onError,
}) => {
  // Enhanced loading with progress
  // Thumbnail generation for large images
  // Better error states
  // Download options
};
```

#### 2. User Upload Component

Create `anode/src/components/notebook/ArtifactUploader.tsx`:

```typescript
interface ArtifactUploaderProps {
  notebookId: string;
  onUpload: (artifactId: string, mimeType: string, metadata: any) => void;
  acceptedTypes?: string[];
  maxSize?: number;
}

export const ArtifactUploader: React.FC<ArtifactUploaderProps> = ({
  notebookId,
  onUpload,
  acceptedTypes = ['image/*', 'text/*', 'application/json'],
  maxSize = 100 * 1024 * 1024, // 100MB
}) => {
  // Drag & drop interface
  // File browser integration
  // Progress indicators
  // Error handling
};
```

#### 3. Enhanced Hooks

Update `anode/src/hooks/useArtifact.ts`:

```typescript
export function useArtifactWithProgress(
  artifactId: string | null,
  options: UseArtifactOptions & {
    onProgress?: (loaded: number, total: number) => void;
  } = {}
): UseArtifactResult & {
  progress: number;
} {
  // Progress tracking
  // Incremental loading
  // Better error recovery
}
```

### Testing Phase 3

1. **Test enhanced rendering:**
   - Large images should show progress indicators
   - Error states should be user-friendly
   - Download options should work for unsupported types

2. **Test user uploads:**
   - Drag & drop files into notebook
   - Paste images from clipboard
   - Upload progress indicators

### Validation Checklist

- [ ] Progress indicators for large artifacts
- [ ] User file upload working
- [ ] Enhanced error handling
- [ ] Download options for unsupported types
- [ ] Thumbnail generation for images
- [ ] Clipboard paste support

---

## Phase 4: Production Optimizations

### Goals

- CDN integration for fast global delivery
- Automatic compression and optimization
- Garbage collection for orphaned artifacts
- Monitoring and analytics

### Implementation Steps

#### 1. CDN Integration

Update `anode/src/backend/sync.ts`:

```typescript
// Add CDN URL generation
function generateCdnUrl(artifactId: string, env: any): string {
  if (env.ARTIFACT_CDN_URL) {
    return `${env.ARTIFACT_CDN_URL}/${artifactId}`;
  }
  return `/api/artifacts/${artifactId}`;
}
```

#### 2. Compression

```typescript
// Add compression for text-based artifacts
if (mimeType.startsWith('text/') || mimeType.includes('json')) {
  const compressed = await gzip(fileData);
  if (compressed.length < fileData.length * 0.9) {
    // Use compressed version if significantly smaller
    await env.ARTIFACT_BUCKET.put(artifactId, compressed, {
      httpMetadata: {
        contentType: mimeType,
        contentEncoding: 'gzip',
      },
    });
  }
}
```

#### 3. Garbage Collection

```typescript
// Scheduled cleanup of orphaned artifacts
export async function cleanupOrphanedArtifacts(env: any) {
  // Find artifacts not referenced in any events
  // Delete artifacts older than retention period
  // Log cleanup statistics
}
```

#### 4. Monitoring

```typescript
// Add analytics for artifact usage
function trackArtifactMetrics(event: string, metadata: any) {
  // Track upload/download patterns
  // Monitor error rates
  // Measure performance
}
```

### Validation Checklist

- [ ] CDN URLs working for artifact delivery
- [ ] Compression reducing storage costs
- [ ] Garbage collection removing orphaned artifacts
- [ ] Monitoring showing usage patterns
- [ ] Performance metrics within targets

---

## Rollback Procedures

### Phase 1 Rollback

1. **Disable artifact uploads:**
   ```bash
   # Set threshold very high to disable uploads
   ARTIFACT_THRESHOLD=999999999
   ```

2. **Revert frontend changes:**
   ```bash
   git revert <artifact-renderer-commit>
   ```

### Phase 2 Rollback

1. **Disable direct binary upload:**
   ```python
   # In ipython-setup.py, always use base64 fallback
   USE_DIRECT_UPLOAD = False
   ```

2. **Remove ExecutionContext methods:**
   ```typescript
   // Comment out uploadBinary and related methods
   ```

### Phase 3 Rollback

1. **Disable enhanced features:**
   ```typescript
   // Fallback to basic ArtifactRenderer
   const ENABLE_ENHANCED_RENDERER = false;
   ```

### Phase 4 Rollback

1. **Disable CDN:**
   ```bash
   unset ARTIFACT_CDN_URL
   ```

2. **Disable compression:**
   ```typescript
   const ENABLE_COMPRESSION = false;
   ```

---

## Support and Troubleshooting

### Common Issues

#### "Artifact not found" errors
- Check authentication tokens
- Verify artifact ID format
- Check network connectivity

#### Upload failures
- Verify file size is under limits
- Check MIME type support
- Review authentication

#### Performance issues
- Enable CDN for production
- Check artifact sizes
- Monitor cache hit rates

### Debug Commands

```bash
# Check artifact storage
curl -v "http://localhost:8787/api/artifacts/{id}?token={token}"

# Test upload
curl -X POST -F "file=@test.png" -F "notebookId=test" -F "authToken=token" \
  http://localhost:8787/api/artifacts

# Check worker logs
wrangler tail --env production
```

### Performance Monitoring

Track these metrics:
- Upload success rate (target: >99%)
- Download success rate (target: >99.5%)
- Average upload time (target: <2s for 10MB)
- Cache hit rate (target: >80%)
- Storage usage growth
- Error rates by type

This migration guide provides a comprehensive roadmap for implementing the artifact system while maintaining stability and backward compatibility throughout the process.