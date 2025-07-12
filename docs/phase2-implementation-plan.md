# Phase 2 Implementation Plan: Direct Binary Upload API

This document provides a concrete implementation plan for Phase 2 of the artifact system, focusing on eliminating the double conversion issue by implementing direct binary upload capabilities.

## Current Status

**Phase 1 Complete ✅**:
- Backend artifact endpoints working (upload/download)
- Frontend `ArtifactRenderer` displaying artifacts correctly
- Integration with `RichOutput` for automatic artifact detection
- Authentication and storage (R2/local) functional

**Phase 2 Issue 🚨**:
- Runtime uploads base64 text instead of binary data
- Results in broken image display and 33% size overhead
- Root cause: IPython display system converts binary → base64

## Implementation Strategy

Since the `@runt` packages are published to JSR and not locally available, we need to:

1. **Create PR in runt repository** with Phase 2 changes
2. **Test with GitHub reference** during development
3. **Publish new JSR version** when complete
4. **Update Anode dependency** to use new version

## Phase 2 Changes Required

### 1. Extend ExecutionContext Interface (`@runt/lib`)

**File**: `runt/packages/lib/src/types.ts`

```typescript
export interface ExecutionContext {
  // Existing methods...
  stdout(text: string): void;
  stderr(text: string): void;
  display(data: RawOutputData, metadata?: Record<string, unknown>, displayId?: string): void;
  result(data: RawOutputData, metadata?: Record<string, unknown>): void;
  
  // NEW: Phase 2 binary upload methods
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

export interface ArtifactMetadata {
  byteLength?: number;
  dimensions?: { width: number; height: number };
  source?: string; // "matplotlib", "pandas", "user", etc.
  encoding?: string;
  compression?: string;
  [key: string]: unknown;
}

export interface ArtifactReference {
  artifactId: string;
  url: string; // Pre-authenticated URL
  metadata: ArtifactMetadata;
}
```

### 2. Implement Binary Upload Methods (`@runt/lib`)

**File**: `runt/packages/lib/src/runtime-agent.ts`

```typescript
import { uploadArtifact, uploadArtifactIfNeeded } from './media/artifacts.ts';

class RuntimeAgent {
  // ... existing code ...

  private createExecutionContext(): ExecutionContext {
    return {
      // ... existing methods ...
      
      uploadBinary: async (
        data: ArrayBuffer, 
        mimeType: string, 
        metadata: ArtifactMetadata = {}
      ): Promise<ArtifactReference> => {
        const response = await uploadArtifact(
          new Blob([data], { type: mimeType }),
          this.notebookId,
          { 
            authToken: this.authToken,
            syncUrl: this.syncUrl 
          }
        );
        
        const artifactRef: ArtifactReference = {
          artifactId: response.artifactId,
          url: `${this.syncUrl}/api/artifacts/${response.artifactId}?token=${this.authToken}`,
          metadata: {
            ...metadata,
            byteLength: response.byteLength,
          }
        };
        
        return artifactRef;
      },

      uploadIfNeeded: async (
        data: ArrayBuffer | string,
        mimeType: string,
        threshold: number = 16384
      ): Promise<MediaContainer> => {
        const binaryData = data instanceof ArrayBuffer 
          ? data 
          : new TextEncoder().encode(data);
          
        if (binaryData.byteLength <= threshold) {
          // Keep inline for small data
          return {
            type: "inline",
            data: data instanceof ArrayBuffer 
              ? Array.from(new Uint8Array(data))
              : data
          };
        }
        
        // Upload as artifact for large data
        const artifactRef = await this.uploadBinary(binaryData, mimeType);
        return {
          type: "artifact",
          artifactId: artifactRef.artifactId,
          metadata: artifactRef.metadata
        };
      },

      displayArtifact: (
        artifactId: string,
        mimeType: string, 
        metadata: Record<string, unknown> = {}
      ): void => {
        const container: MediaContainer = {
          type: "artifact",
          artifactId,
          metadata
        };
        
        this.display({ [mimeType]: container }, metadata);
      }
    };
  }
}
```

### 3. Add JavaScript Bridge to Pyodide Worker (`@runt/pyodide-runtime-agent`)

**File**: `runt/packages/pyodide-runtime-agent/src/pyodide-worker.ts`

```typescript
// Add to existing Pyodide worker setup
export class PyodideWorker {
  // ... existing code ...

  private setupJavaScriptBridge(pyodide: any, context: ExecutionContext) {
    // ... existing bridge setup ...

    // NEW: Binary upload bridge
    globalThis.js_upload_binary = async (
      data: Uint8Array,
      mimeType: string,
      metadata: any = {}
    ): Promise<string> => {
      try {
        const arrayBuffer = data.buffer.slice(
          data.byteOffset, 
          data.byteOffset + data.byteLength
        );
        
        const artifactRef = await context.uploadBinary(arrayBuffer, mimeType, metadata);
        return artifactRef.artifactId;
      } catch (error) {
        console.error('Binary upload failed:', error);
        throw error;
      }
    };

    globalThis.js_upload_if_needed = async (
      data: Uint8Array,
      mimeType: string,
      threshold: number = 16384
    ): Promise<any> => {
      try {
        const arrayBuffer = data.buffer.slice(
          data.byteOffset, 
          data.byteOffset + data.byteLength
        );
        
        const container = await context.uploadIfNeeded(arrayBuffer, mimeType, threshold);
        return container;
      } catch (error) {
        console.error('Upload if needed failed:', error);
        throw error;
      }
    };

    globalThis.js_display_artifact = (
      artifactId: string,
      mimeType: string,
      metadata: any = {}
    ): void => {
      context.displayArtifact(artifactId, mimeType, metadata);
    };
  }
}
```

### 4. Update Python Environment (`@runt/pyodide-runtime-agent`)

**File**: `runt/packages/pyodide-runtime-agent/src/ipython-setup.py`

```python
import asyncio
import js
from typing import Optional, Dict, Any, Union

class ArtifactUploader:
    """Direct binary upload API for Python runtime"""
    
    def __init__(self):
        self.threshold = 16384  # 16KB default threshold
    
    async def upload_binary(
        self, 
        data: bytes, 
        mime_type: str, 
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Upload binary data directly to artifact service"""
        if metadata is None:
            metadata = {}
            
        # Convert bytes to Uint8Array for JavaScript
        uint8_array = js.Uint8Array.new(len(data))
        uint8_array.set(data)
        
        # Call JavaScript bridge
        artifact_id = await js.js_upload_binary(uint8_array, mime_type, metadata)
        return artifact_id
    
    async def upload_if_needed(
        self, 
        data: bytes, 
        mime_type: str, 
        threshold: Optional[int] = None
    ) -> Dict[str, Any]:
        """Upload if over threshold, otherwise return inline container"""
        if threshold is None:
            threshold = self.threshold
            
        uint8_array = js.Uint8Array.new(len(data))
        uint8_array.set(data)
        
        container = await js.js_upload_if_needed(uint8_array, mime_type, threshold)
        return container.to_py()

# Global instance
artifact = ArtifactUploader()

def setup_artifact_bridge():
    """Setup artifact upload capabilities in Python environment"""
    # Make artifact uploader globally available
    __builtins__['artifact'] = artifact
    
    # Add convenience function for display
    def display_artifact(artifact_id: str, mime_type: str, metadata: Dict[str, Any] = None):
        if metadata is None:
            metadata = {}
        js.js_display_artifact(artifact_id, mime_type, metadata)
    
    __builtins__['display_artifact'] = display_artifact

# Enhanced matplotlib integration
def _capture_matplotlib_show(block=None):
    """Capture matplotlib plots with artifact-aware output"""
    import matplotlib.pyplot as plt
    from io import BytesIO
    import base64
    
    if plt.get_fignums():
        fig = plt.gcf()
        
        # Generate PNG data
        buf = BytesIO()
        fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        png_data = buf.getvalue()
        buf.close()
        
        # Check if JavaScript bridge is available
        if hasattr(js, 'js_upload_binary') and len(png_data) > artifact.threshold:
            # Use direct binary upload for large images
            async def upload_and_display():
                try:
                    artifact_id = await artifact.upload_binary(
                        png_data, 
                        "image/png",
                        {
                            "source": "matplotlib",
                            "width": int(fig.get_figwidth() * fig.dpi),
                            "height": int(fig.get_figheight() * fig.dpi)
                        }
                    )
                    display_artifact(artifact_id, "image/png")
                except Exception as e:
                    print(f"Artifact upload failed, falling back to base64: {e}")
                    # Fallback to normal IPython display
                    from IPython.display import Image, display
                    display(Image(data=png_data))
            
            # Run the async upload
            await upload_and_display()
        else:
            # Fallback to normal IPython display for small images or when bridge unavailable
            from IPython.display import Image, display
            display(Image(data=png_data))
        
        plt.close(fig)

# Replace matplotlib's show function
def setup_matplotlib_integration():
    """Replace matplotlib show with artifact-aware version"""
    try:
        import matplotlib.pyplot as plt
        plt.show = _capture_matplotlib_show
        print("✅ Matplotlib artifact integration enabled")
    except ImportError:
        print("⚠️ Matplotlib not available, skipping integration")

# Setup during IPython initialization
setup_artifact_bridge()
setup_matplotlib_integration()
```

## Testing Strategy

### 1. Create Test Branch in Runt Repository

```bash
# In runt repository
git checkout -b artifact-system-phase2-direct-binary-upload
# Implement changes above
git commit -m "feat: Add direct binary upload API for artifacts"
git push origin artifact-system-phase2-direct-binary-upload
```

### 2. Update Anode to Use GitHub Reference

**File**: `anode/package.json`

```json
{
  "dependencies": {
    "@runt/lib": "github:runtimed/runt#artifact-system-phase2-direct-binary-upload&path:/packages/lib",
    "@runt/pyodide-runtime-agent": "github:runtimed/runt#artifact-system-phase2-direct-binary-upload&path:/packages/pyodide-runtime-agent",
    "@runt/schema": "github:runtimed/runt#artifact-system-phase2-direct-binary-upload&path:/packages/schema"
  }
}
```

### 3. Test Script

Create a test notebook with:

```python
import matplotlib.pyplot as plt
import numpy as np

# Generate large plot that will use direct binary upload
fig, ax = plt.subplots(figsize=(12, 8))
x = np.linspace(0, 10, 1000)
y = np.sin(x) * np.exp(-x/5)
ax.plot(x, y, linewidth=2)
ax.set_title('Large Plot - Should Use Direct Binary Upload')
ax.grid(True)

plt.show()  # This should now use direct binary upload!
```

### 4. Verification

```bash
# Check artifact content type
ARTIFACT_ID="your-artifact-id"
curl -s "http://localhost:8787/api/artifacts/${ARTIFACT_ID}?token=insecure-token-change-me" | file -

# Expected: "PNG image data, 1200 x 640, 8-bit/color RGBA, non-interlaced"
# Previous: "ASCII text, with very long lines" (base64)
```

## Success Criteria

1. **Binary Storage**: `curl artifact-url | file -` shows "PNG image data"
2. **Size Reduction**: ~33% smaller artifacts (no base64 overhead)  
3. **Proper Display**: Images render correctly in frontend
4. **Performance**: Faster upload/download for large artifacts
5. **Backward Compatibility**: Small images still use inline display

## Rollout Plan

### Phase 2a: Runt Repository Changes
- [ ] Implement ExecutionContext extensions
- [ ] Add JavaScript bridge in Pyodide worker  
- [ ] Update Python matplotlib integration
- [ ] Create comprehensive tests
- [ ] Merge PR and create GitHub release

### Phase 2b: Anode Integration
- [ ] Update package.json to use new runt version
- [ ] Test end-to-end binary upload flow
- [ ] Verify frontend displays binary artifacts correctly
- [ ] Performance testing and validation
- [ ] Deploy to staging environment

### Phase 2c: Production Deployment
- [ ] Publish new JSR packages for runt
- [ ] Update Anode to use JSR packages
- [ ] Deploy to production
- [ ] Monitor performance and error rates
- [ ] Document new capabilities

## Risk Mitigation

1. **Backward Compatibility**: Keep existing base64 path as fallback
2. **Gradual Rollout**: Feature flag for direct binary upload
3. **Error Handling**: Comprehensive error recovery and logging
4. **Performance**: Monitor upload performance and success rates
5. **Testing**: Extensive integration tests before production

## Expected Timeline

- **Week 1**: Implement runt repository changes
- **Week 2**: Test with Anode integration
- **Week 3**: Performance optimization and bug fixes
- **Week 4**: Production deployment and monitoring

This implementation plan provides a clear path to eliminate the double conversion issue and significantly improve the artifact system's performance and reliability.