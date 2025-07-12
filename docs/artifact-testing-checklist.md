# Artifact Service Testing Checklist

This checklist covers testing the complete artifact service implementation across backend, runtime agents, and frontend UI.

## Prerequisites

### Environment Setup
- [ ] Anode development environment running (`pnpm dev`)
- [ ] Sync worker running (`pnpm dev:sync`)
- [ ] Runtime agent available (`NOTEBOOK_ID=test pnpm dev:runtime`)
- [ ] Environment variables configured:
  - [ ] `ARTIFACT_THRESHOLD=16384` (or custom value)
  - [ ] `ARTIFACT_STORAGE=r2` (production) or `local` (dev)
  - [ ] `ARTIFACT_BUCKET` configured if using R2
  - [ ] Auth tokens properly configured

## Backend API Testing

### POST /api/artifacts (Upload)

#### Form Data Upload
- [ ] **Small file rejection**: Upload file under threshold, expect 400 error
- [ ] **Large file upload**: Upload file over threshold, expect 201 with artifact ID
- [ ] **Missing notebookId**: Upload without notebook ID, expect 400 error
- [ ] **Missing authToken**: Upload without auth token, expect 401 error
- [ ] **Invalid authToken**: Upload with invalid token, expect 401 error
- [ ] **Invalid notebookId**: Upload with invalid characters in notebook ID, expect 400 error

#### Raw Binary Upload
- [ ] **Binary upload**: POST raw binary data with headers:
  ```
  Content-Type: image/png
  X-Notebook-ID: test-notebook
  X-Auth-Token: valid-token
  ```
- [ ] **Large binary**: Upload large binary data, verify artifact creation
- [ ] **Text content**: Upload text with `Content-Type: text/plain`

#### Content Addressing
- [ ] **Duplicate upload**: Upload same content twice, verify same artifact ID
- [ ] **Different notebooks**: Upload same content to different notebooks, verify different artifact IDs
- [ ] **SHA256 verification**: Verify artifact ID format: `notebookId/sha256hash`

### GET /api/artifacts/{id} (Content Serving)

#### Content Retrieval
- [ ] **Valid artifact**: GET existing artifact with valid token, expect content
- [ ] **Missing artifact**: GET non-existent artifact, expect 404
- [ ] **Missing token**: GET without token parameter, expect 401
- [ ] **Invalid token**: GET with invalid token, expect 401
- [ ] **Wrong notebook**: Try to access artifact from different notebook, verify access control

#### Content Headers
- [ ] **Proper MIME type**: Verify `Content-Type` header matches uploaded content
- [ ] **Content-Length**: Verify `Content-Length` header is correct
- [ ] **CORS headers**: Verify CORS headers present for browser access

## Runtime Agent Integration

### Upload Utilities (Deno)
```bash
cd runt
deno test packages/lib/src/media/artifact.test.ts --allow-net --allow-env
```

- [ ] **Threshold checking**: Small data stays inline, large data uploads
- [ ] **Error handling**: Network failures properly caught and reported
- [ ] **URL generation**: Correct URLs generated for artifact access
- [ ] **Type safety**: All TypeScript types compile correctly

### Python Runtime Integration
- [ ] **Large matplotlib plots**: Generate plot over threshold, verify artifact upload
- [ ] **Large pandas DataFrames**: Create large DataFrame HTML, verify artifact upload
- [ ] **Multiple representations**: Single output with both inline text and artifact image
- [ ] **Error outputs**: Large traceback becomes artifact if over threshold

## Frontend UI Testing

### Artifact Utilities
- [ ] **Auth integration**: `getCurrentAuthToken()` returns valid token
- [ ] **URL generation**: `getArtifactUrl()` creates correct authenticated URLs
- [ ] **Fetch functionality**: `fetchArtifact()` retrieves content successfully
- [ ] **Caching**: Multiple calls to same artifact use cache
- [ ] **Error handling**: Network errors properly handled and displayed

### React Hooks
- [ ] **useArtifact hook**: Loading states, error states, and success states work
- [ ] **useArtifactDataUrl**: Images load as data URLs
- [ ] **useArtifactText**: Text content loads properly
- [ ] **Cache invalidation**: Auth token changes clear cache
- [ ] **Cleanup**: Hooks properly cleanup on unmount

### UI Components

#### ArtifactRenderer
- [ ] **Image display**: PNG/JPEG images render correctly
- [ ] **SVG display**: SVG content renders properly
- [ ] **HTML display**: HTML content renders with proper styling
- [ ] **JSON display**: JSON pretty-prints correctly
- [ ] **Text display**: Plain text shows in code blocks
- [ ] **Markdown display**: Markdown renders as formatted text
- [ ] **Loading states**: Spinner shows while loading
- [ ] **Error states**: Errors display user-friendly messages
- [ ] **File size display**: Metadata shows file size correctly
- [ ] **Unsupported types**: Unknown MIME types show helpful placeholder

#### RichOutput Integration
- [ ] **Artifact detection**: MediaContainer with `type: "artifact"` detected
- [ ] **Fallback compatibility**: Inline content still works
- [ ] **Multiple representations**: Artifact and inline content in same output
- [ ] **Preference order**: Artifact content preferred over inline when both present

## Integration Testing

### End-to-End Workflow
1. [ ] **Runtime generates large output** (e.g., matplotlib plot > 16KB)
2. [ ] **Runtime uploads as artifact** (POST /api/artifacts)
3. [ ] **Runtime emits event** with artifact reference
4. [ ] **Frontend receives event** via LiveStore sync
5. [ ] **Frontend detects artifact** in MediaContainer
6. [ ] **Frontend fetches content** (GET /api/artifacts/{id})
7. [ ] **Frontend displays content** with proper rendering

### Notebook Collaboration
- [ ] **Multi-user access**: Multiple users can view same artifacts
- [ ] **Real-time updates**: New artifacts appear immediately for all users
- [ ] **Authentication**: Each user's auth token works for shared artifacts
- [ ] **Access control**: Users can only access artifacts from notebooks they can view

## Error Scenarios

### Network Issues
- [ ] **Upload failures**: Handle network errors during upload gracefully
- [ ] **Download failures**: Handle network errors during content fetch
- [ ] **Retry logic**: Failed requests can be retried
- [ ] **Offline behavior**: Graceful degradation when offline

### Authentication Issues
- [ ] **Token expiry**: Expired tokens trigger re-authentication
- [ ] **Invalid tokens**: Clear error messages for auth failures
- [ ] **Permission changes**: Handle when user loses access to notebook

### Storage Issues
- [ ] **Storage full**: Handle storage quota exceeded errors
- [ ] **Corrupted artifacts**: Handle artifacts that can't be retrieved
- [ ] **Missing artifacts**: Handle references to deleted artifacts

## Performance Testing

### Large Files
- [ ] **Upload performance**: Large files (>10MB) upload without timeout
- [ ] **Download performance**: Large files download efficiently
- [ ] **Memory usage**: Large files don't cause memory leaks
- [ ] **Progress indicators**: Long operations show progress

### Caching
- [ ] **Cache effectiveness**: Repeated access uses cached content
- [ ] **Cache invalidation**: Cache clears when appropriate
- [ ] **Memory limits**: Cache doesn't grow unbounded

## Security Testing

### Access Control
- [ ] **Notebook isolation**: Can't access artifacts from other notebooks
- [ ] **Token validation**: Invalid tokens rejected consistently
- [ ] **Input validation**: Malicious inputs handled safely

### Content Security
- [ ] **HTML sanitization**: Dangerous HTML content properly isolated
- [ ] **XSS prevention**: User content can't execute scripts
- [ ] **File type validation**: Upload content matches declared MIME type

## Production Readiness

### Configuration
- [ ] **Environment variables**: All config options properly documented
- [ ] **R2 integration**: Production storage backend works correctly
- [ ] **Scaling**: Multiple concurrent uploads/downloads work
- [ ] **Monitoring**: Error rates and performance metrics available

### Deployment
- [ ] **Build process**: Artifact code builds without errors
- [ ] **Type checking**: All TypeScript compiles cleanly
- [ ] **Linting**: Code passes linting rules
- [ ] **Tests**: All unit and integration tests pass

## Success Criteria

- [ ] **Backend endpoints** work with proper authentication and error handling
- [ ] **Runtime agents** can upload large outputs as artifacts automatically
- [ ] **Frontend UI** displays artifacts with proper loading and error states
- [ ] **End-to-end flow** works from Python execution to browser display
- [ ] **Performance** is acceptable for typical notebook usage
- [ ] **Security** protects against unauthorized access and XSS
- [ ] **Documentation** is complete and accurate

## Notes

- Test with various file sizes: 1KB, 16KB, 100KB, 1MB, 10MB
- Test with different MIME types: images, text, JSON, HTML, unknown types
- Test with multiple browsers and devices
- Test with slow network connections
- Test with different authentication methods (Google OAuth, service tokens)
- Monitor browser console for errors or warnings
- Verify no memory leaks with long-running sessions