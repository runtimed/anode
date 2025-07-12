# Artifact Service UI Implementation

This document summarizes the UI-side implementation for the artifact service, which enables the frontend to display large outputs that are stored as external artifacts instead of being embedded in LiveStore events.

## What's Implemented

### 1. Backend Integration (✅ Complete)
- **POST /api/artifacts** - Upload endpoint with authentication
- **GET /api/artifacts/{id}** - Content serving with auth tokens
- Both form data and raw binary upload support
- Content-addressed storage with notebook scoping
- R2 storage backend support

### 2. Runtime Client Utilities (✅ Complete)
- Upload utilities in `@runt/lib` for runtime agents
- Automatic threshold checking (16KB default)
- Type-safe interfaces with error handling

### 3. Frontend UI Components (✅ Complete)

#### Core Infrastructure
- **`src/util/artifacts.ts`** - Core artifact fetching utilities
  - `fetchArtifact()` - Fetch artifact content as Blob
  - `getArtifactUrl()` - Generate authenticated URLs
  - `uploadArtifact()` - Upload files from frontend
  - `fetchArtifactCached()` - Cached fetching to avoid duplicates
  - `blobToDataUrl()` / `blobToText()` - Content conversion utilities

#### React Hooks
- **`src/hooks/useArtifact.ts`** - React hooks for artifact loading
  - `useArtifact()` - Main hook with flexible options
  - `useArtifactDataUrl()` - Simplified hook for images
  - `useArtifactText()` - Simplified hook for text content
  - Loading states, error handling, and caching

#### UI Components
- **`src/components/notebook/ArtifactRenderer.tsx`** - Display component
  - Handles different MIME types (images, HTML, JSON, text, markdown)
  - Loading spinners and error states
  - File size display
  - Fallback for unsupported types

#### Integration
- **Updated `RichOutput.tsx`** - Modified to detect and render artifacts
  - Detects `MediaContainer` with `type: "artifact"`
  - Routes to `ArtifactRenderer` for artifact content
  - Maintains backward compatibility with inline content

## How It Works

### Flow for Displaying Artifacts

1. **Event Processing**: Output events contain `MediaContainer` objects:
   ```typescript
   {
     type: "artifact",
     artifactId: "notebook123/abc456",
     metadata: { byteLength: 50000, mimeType: "image/png" }
   }
   ```

2. **Detection**: `RichOutput` component detects artifact containers and extracts:
   - `artifactId` - Content identifier
   - `mimeType` - Content type for proper rendering
   - `metadata` - Additional info like file size

3. **Rendering**: `ArtifactRenderer` component:
   - Uses appropriate hook based on content type
   - Fetches content with authentication
   - Displays loading/error states
   - Renders content based on MIME type

4. **Caching**: Artifacts are cached to prevent duplicate fetches

### Supported Content Types

- **Images**: `image/png`, `image/jpeg`, `image/svg+xml`
  - Rendered as `<img>` elements with data URLs
  - Lazy loading support

- **Text Content**: `text/html`, `text/markdown`, `text/plain`
  - HTML rendered with `dangerouslySetInnerHTML`
  - Markdown shown as formatted text
  - Plain text in code blocks

- **JSON Data**: `application/json`, `*+json`
  - Pretty-printed JSON with syntax highlighting
  - Error handling for invalid JSON

- **Fallback**: Unsupported types show metadata and download info

### Authentication

- Uses `getCurrentAuthToken()` from existing auth system
- Supports both Google OAuth tokens and fallback tokens
- Auth tokens passed as URL parameters for content requests
- Error handling for authentication failures

## Benefits

### For Users
- **Fast Loading**: Large outputs don't slow down notebook sync
- **Rich Display**: Full support for images, plots, tables
- **Responsive UI**: Loading states and error handling
- **Caching**: Artifacts load once and are cached

### For Developers  
- **Type Safety**: Full TypeScript support with proper error types
- **Extensible**: Easy to add new MIME type support
- **Reusable**: Hooks and utilities can be used elsewhere
- **Maintainable**: Clear separation of concerns

## Implementation Details

### Error Handling
- Network failures show retry options
- Authentication errors redirect to login
- Unsupported content types show helpful placeholders
- File size warnings for very large artifacts

### Performance Optimizations
- **Lazy Loading**: Images load only when visible
- **Caching**: Content cached by artifact ID + auth token
- **Async Loading**: Non-blocking with loading states
- **Memory Management**: Proper cleanup of blob URLs

### Security
- **Authentication Required**: All artifact access requires valid tokens
- **Notebook Scoping**: Users can only access artifacts from notebooks they have permission to view
- **Content Validation**: MIME type validation and safe rendering

## What's Missing (Future Enhancements)

1. **Progressive Loading**: For very large artifacts, consider streaming
2. **Offline Support**: Cache artifacts in IndexedDB for offline viewing
3. **Compression**: Automatic compression for text-based artifacts
4. **CDN Integration**: For production deployments with global distribution
5. **Artifact Management UI**: User interface for viewing/managing artifacts
6. **Garbage Collection**: Cleanup of orphaned artifacts

## Integration with Runtime Agents

Runtime agents can now use the artifact system:

```typescript
import { uploadArtifactIfNeeded } from "@runt/lib";

const config = {
  syncUrl: "https://api.example.com",
  authToken: "user-token",
  notebookId: "notebook-123"
};

// Automatically uploads if over threshold
const representation = await uploadArtifactIfNeeded(
  largePlotData, 
  "image/png", 
  config
);

// Use in output event
emit("multimediaDisplayOutputAdded", {
  representations: {
    "image/png": representation
  }
});
```

## Testing

The implementation includes:
- Unit tests for artifact utilities
- React hook testing with mock data
- Error handling validation
- Type safety verification

All core functionality is tested and working, ready for production use.