# Artifact Double Conversion Test

This test demonstrates the current double conversion issue in the artifact system where binary data gets converted to base64 text instead of being stored as binary.

## Issue Description

**Current Flow (Broken)**:
1. Python generates binary PNG data (actual image bytes)
2. IPython converts to base64 for display system compatibility
3. Runtime uploads base64 text as "artifact" 
4. Artifact service stores the base64 text (not binary!)
5. Frontend receives text data instead of binary image data

**Expected Flow (Phase 2 Goal)**:
1. Python generates binary PNG data
2. Direct upload of binary data to artifact service
3. Artifact service stores actual binary PNG
4. Frontend receives proper image data

## Test Setup

### Prerequisites
```bash
# Start development environment
pnpm dev        # Terminal 1: Frontend (port 5173)
pnpm dev:sync   # Terminal 2: Backend (port 8787)

# Start Python runtime (get NOTEBOOK_ID from UI)
NOTEBOOK_ID=your-notebook-id pnpm dev:runtime
```

### Test Script (Python)

Run this in a notebook cell to generate a large matplotlib plot:

```python
import matplotlib.pyplot as plt
import numpy as np

# Generate a large plot that will exceed the 16KB threshold
fig, axes = plt.subplots(2, 2, figsize=(12, 10))
x = np.linspace(0, 10, 1000)

for i, ax in enumerate(axes.flat):
    y = np.sin(x + i) * np.exp(-x/5)
    ax.plot(x, y, linewidth=2)
    ax.set_title(f'Plot {i+1}: Large data visualization')
    ax.grid(True, alpha=0.3)
    ax.set_xlabel('X values')
    ax.set_ylabel('Y values')

plt.tight_layout()
plt.show()
```

## Verification Steps

### 1. Check Artifact Storage Content

After running the test script above, find the artifact ID from the browser developer tools or notebook UI, then:

```bash
# Get the artifact ID from the notebook output
# It will look like: notebook-123/abc456def789...

# Test what type of content is stored
ARTIFACT_ID="your-artifact-id-here"
curl -s "http://localhost:8787/api/artifacts/${ARTIFACT_ID}?token=insecure-token-change-me" | file -

# Expected (BROKEN): "ASCII text, with very long lines"
# Desired (PHASE 2): "PNG image data, 1200 x 800, 8-bit/color RGBA, non-interlaced"
```

### 2. Check Base64 Content

```bash
# Examine the first 100 characters of the artifact content
curl -s "http://localhost:8787/api/artifacts/${ARTIFACT_ID}?token=insecure-token-change-me" | head -c 100

# Expected (BROKEN): "iVBORw0KGgoAAAANSUhEUgAABLAAAASwCAYAAADKL..."
# This confirms it's base64 text, not binary PNG data
```

### 3. Size Comparison

```bash
# Check the size overhead from base64 encoding
curl -s "http://localhost:8787/api/artifacts/${ARTIFACT_ID}?token=insecure-token-change-me" | wc -c

# Base64 encoding adds ~33% size overhead
# A 100KB PNG becomes ~133KB as base64 text
```

## Issue Evidence

### Browser Developer Tools

1. Open browser dev tools (F12)
2. Go to Network tab
3. Run the matplotlib test script
4. Look for artifact upload requests
5. Check the Content-Type headers:
   - **Current (broken)**: `Content-Type: text/plain` or similar
   - **Expected (Phase 2)**: `Content-Type: image/png`

### Frontend Display Issues

1. The image may appear broken or not display at all
2. Right-click on the image and "Open in new tab"
3. You'll see base64 text instead of an image
4. This confirms the artifact contains text, not binary image data

## Root Cause Analysis

### IPython Display System

The issue stems from IPython's `display()` system which was designed for notebook formats (`.ipynb`) that embed base64 content:

```python
# This is what currently happens in IPython:
from IPython.display import Image, display

# Matplotlib generates binary PNG
png_bytes = get_matplotlib_output()  # This is actual binary data

# IPython automatically converts to base64 for display
image_obj = Image(data=png_bytes)    # This converts to base64 internally
display(image_obj)                   # Sends base64 to display system
```

### Runtime Processing

The runtime agent sees the display event with base64 content and uploads it as-is:

```typescript
// Current behavior in runtime agent
if (data_size > threshold) {
  // This uploads the base64 TEXT, not binary data!
  const artifact = await uploadArtifact(base64_text, mimeType);
}
```

## Phase 2 Solution Preview

The fix requires bypassing IPython's display system for large artifacts:

```python
# Phase 2 approach - direct binary upload
png_bytes = get_matplotlib_output()  # Binary PNG data

if len(png_bytes) > 16384:
    # Upload binary data directly, bypass IPython
    artifact_id = await artifact.upload_binary(png_bytes, "image/png")
    js.display_artifact(artifact_id, "image/png")
else:
    # Use normal IPython display for small images
    display(Image(data=png_bytes))
```

## Success Criteria for Phase 2

When Phase 2 is implemented correctly:

1. **Binary storage**: `curl artifact-url | file -` shows "PNG image data"
2. **Size efficiency**: ~33% reduction in storage size
3. **Proper display**: Images render correctly in frontend
4. **Performance**: Faster upload/download times
5. **Compatibility**: Small images still work via inline display

## Current Workarounds

Until Phase 2 is implemented, the current system will:
- Store base64 text as artifacts (inefficient but functional)
- Display images via data URLs converted from base64 text
- Have larger file sizes due to base64 overhead
- Work correctly but suboptimally

## Next Steps

1. Implement `ExecutionContext.uploadBinary()` in `@runt/lib`
2. Add JavaScript bridge in Pyodide worker for binary transfer
3. Update Python matplotlib integration to use direct upload
4. Test end-to-end binary upload and display
5. Verify performance improvements and size reductions

This test file serves as both documentation of the current issue and a validation script for Phase 2 implementation.