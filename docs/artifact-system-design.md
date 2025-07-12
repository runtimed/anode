# Artifact System Design

This document describes the design and implementation of the artifact system for Anode notebooks, which enables efficient handling of large outputs by storing them externally instead of embedding them in LiveStore events.

## Overview

The artifact system solves the problem of large outputs (images, data files, HTML) bloating the LiveStore event log and hitting database size limits. Instead of storing large content inline, the system uploads content to an object store and references it via artifact IDs.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Python        │    │  Runtime Agent  │    │  Sync Worker    │
│   Runtime       │───▶│  (TypeScript)   │───▶│  (Cloudflare)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       ▼
         │                       │              ┌─────────────────┐
         │                       │              │   Artifact      │
         │                       │              │   Storage       │
         │                       │              │   (R2/Local)    │
         │                       │              └─────────────────┘
         │                       ▼
         │              ┌─────────────────┐
         │              │   LiveStore     │
         │              │   Events        │
         │              └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Frontend      │
│   (Artifact     │◀───│   (Event        │
│   Renderer)     │    │   Processor)    │
└─────────────────┘    └─────────────────┘
```

## Current Implementation Status

### ✅ Completed Components

#### Backend (Cloudflare Workers)
- **POST /api/artifacts** - Upload endpoint with authentication
- **GET /api/artifacts/{id}** - Content serving with auth tokens
- Support for both form data and raw binary uploads
- Content-addressed storage with notebook scoping (`{notebookId}/{sha256}`)
- R2 storage backend with local simulation for development
- Size threshold enforcement (configurable, default 16KB)

#### Runtime Client (`@runt/lib`)
- `uploadArtifact()` - Direct upload functionality
- `uploadArtifactIfNeeded()` - Automatic threshold checking
- `getArtifactContentUrl()` - URL generation with authentication
- Type-safe interfaces with proper error handling
- Caching to prevent duplicate uploads

#### Frontend (React Components)
- `ArtifactRenderer` - Display component supporting multiple MIME types
- `useArtifact` hooks - React hooks for artifact loading
- `RichOutput` integration - Automatic artifact detection and rendering
- Support for images, HTML, JSON, text, and markdown
- Loading states and error handling

### 🔄 Current Issue: Double Conversion

The current implementation suffers from inefficient double conversion:

1. **Python generates binary data** (PNG, etc.)
2. **IPython converts to base64** for display system
3. **Runtime detects large base64** and uploads as artifact
4. **Artifact service stores base64 text** instead of binary
5. **Frontend receives broken content** (text instead of binary)

## Proposed Solution: Direct Binary Upload API

### Problem Analysis

The root cause is that IPython's display system was designed for notebook formats that embed base64 content. This creates:
- **Performance overhead** (~33% size increase from base64 encoding)
- **Display issues** (base64 text stored instead of binary data)
- **Complex processing** (unnecessary encode/decode cycles)

### Proposed Architecture

```
Current Flow (Broken):
Python Binary → IPython Base64 → Display Event → Artifact Upload (Text) → Frontend (Broken)

Proposed Flow (Efficient):
Python Binary → Direct Upload → Artifact Reference → Display Event → Frontend (Working)
```

## Implementation Plan

### Phase 1: Core Infrastructure
**Target**: Add binary upload capabilities to `@runt/lib`

#### New ExecutionContext Methods
```typescript
interface ExecutionContext {
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

#### Supporting Types
```typescript
interface ArtifactMetadata {
  byteLength?: number;
  dimensions?: { width: number; height: number };
  source?: string; // "matplotlib", "user-upload", etc.
  [key: string]: unknown;
}

interface ArtifactReference {
  artifactId: string;
  url: string; // Pre-authenticated URL
  metadata: ArtifactMetadata;
}
```

**Files to modify:**
- `runt/packages/lib/src/types.ts`
- `runt/packages/lib/src/runtime-agent.ts`
- `runt/packages/lib/src/media/types.ts`

### Phase 2: Python Integration
**Target**: Provide direct upload API in Python environment

#### JavaScript Bridge Functions
```python
# Injected into Python environment
class ArtifactUploader:
    async def upload_binary(self, data: bytes, mime_type: str, metadata: dict = None) -> str:
        """Upload binary data, return artifact ID"""
        
    async def upload_if_needed(self, data: bytes, mime_type: str, threshold: int = 16384) -> dict:
        """Upload if over threshold, return MediaContainer"""

# Global instance
artifact = ArtifactUploader()
```

#### Modified Matplotlib Integration
```python
def _capture_matplotlib_show(block=None):
    """Capture matplotlib plots with direct binary upload"""
    if plt.get_fignums():
        fig = plt.gcf()
        png_data = fig_to_png_bytes(fig)
        
        if len(png_data) > 16384:
            # Direct upload for large images
            artifact_id = await artifact.upload_binary(png_data, "image/png")
            js.display_artifact(artifact_id, "image/png", {"width": 800, "height": 600})
        else:
            # Use normal IPython display for small images
            display(Image(data=png_data))
```

**Files to modify:**
- `runt/packages/pyodide-runtime-agent/src/pyodide-worker.ts`
- `runt/packages/pyodide-runtime-agent/src/ipython-setup.py`

### Phase 3: Enhanced Frontend
**Target**: Optimize artifact rendering and user experience

#### Enhanced ArtifactRenderer
- **Progressive loading** for large artifacts
- **Thumbnail generation** for images
- **Preview modes** for different content types
- **Download options** for unsupported formats

#### User Upload Support
- **Drag & drop** file upload to artifacts
- **Paste image** support from clipboard
- **File browser** integration

**Files to modify:**
- `anode/src/components/notebook/ArtifactRenderer.tsx`
- `anode/src/hooks/useArtifact.ts`
- New: `anode/src/components/notebook/ArtifactUploader.tsx`

### Phase 4: Production Optimizations
**Target**: Scalability and performance improvements

#### CDN Integration
- **Pre-signed URLs** for R2 storage
- **Global distribution** via Cloudflare CDN
- **Automatic compression** for text-based artifacts

#### Advanced Features
- **Streaming uploads** for very large files
- **Artifact compression** (gzip for text, optimized images)
- **Garbage collection** for orphaned artifacts
- **Usage analytics** and monitoring

## File Organization

```
anode/
├── docs/
│   ├── artifact-system-design.md (this file)
│   ├── artifact-api-reference.md
│   └── artifact-migration-guide.md
├── src/
│   ├── components/notebook/
│   │   ├── ArtifactRenderer.tsx
│   │   └── ArtifactUploader.tsx (new)
│   ├── hooks/
│   │   └── useArtifact.ts
│   └── util/
│       └── artifacts.ts

runt/packages/
├── lib/src/
│   ├── types.ts
│   ├── runtime-agent.ts
│   └── media/
│       ├── types.ts
│       └── binary-upload.ts (new)
└── pyodide-runtime-agent/src/
    ├── pyodide-worker.ts
    ├── pyodide-agent.ts
    └── ipython-setup.py
```

## Benefits

### Performance
- **33% size reduction** - No base64 overhead
- **Faster notebook sync** - Small events with artifact references
- **Better memory usage** - No large content in SQLite
- **Reduced bandwidth** - Binary content cached and compressed

### User Experience
- **Faster loading** - Optimized content delivery
- **Reliable display** - No conversion artifacts
- **Progressive enhancement** - Automatic optimization
- **Offline capability** - Cached artifacts available

### Developer Experience
- **Simple API** - Direct upload methods
- **Type safety** - Full TypeScript support
- **Error handling** - Clear failure modes
- **Debugging** - Structured logging and monitoring

## Migration Strategy

### Backward Compatibility
- **Existing notebooks continue working** - No breaking changes
- **Gradual adoption** - New API optional
- **Feature detection** - Runtime capability checking

### Rollout Process
1. **Phase 1 deployment** - Core infrastructure
2. **Phase 2 deployment** - Python integration
3. **Phase 3 deployment** - Enhanced frontend
4. **Phase 4 deployment** - Production optimizations

Each phase can be deployed independently, ensuring stable incremental progress.

## Success Metrics

### Technical Metrics
- **Event size reduction** - Target 90% reduction for image-heavy notebooks
- **Upload performance** - Target <2s for 10MB artifacts
- **Display reliability** - Target 99% successful artifact renders
- **Cache hit rate** - Target 80% for frequently accessed content

### User Metrics
- **Notebook load time** - Target 50% improvement for large notebooks
- **User satisfaction** - Measure via feedback and usage analytics
- **Error rates** - Target <1% artifact-related errors

This design provides a solid foundation for eliminating the double conversion issue while opening up new possibilities for rich content handling in Anode notebooks.