# Anode Enhanced Display System

This document describes the enhanced display system for Anode notebooks, which provides full IPython compatibility with rich output rendering.

## Overview

The Anode display system has been upgraded to provide a Jupyter-compatible experience by integrating proper IPython display hooks with Anode's LiveStore architecture. This brings support for:

- `IPython.display.display()` function calls
- Rich object representations (`_repr_html_()`, `_repr_markdown_()`, etc.)
- Proper separation of execution results, display data, and streams
- SVG matplotlib plots with zero-latency rendering
- Custom Anode display utilities

## Architecture

### Python Side (PyodideKernel)

The enhanced `PyodideKernel` creates a proper IPython environment with custom display hooks:

```python
# Custom Display Publisher for handling display() calls
class LiteDisplayPublisher(DisplayPublisher):
    def publish(self, data, metadata=None, source=None, *, transient=None, update=False, **kwargs):
        if update and self.update_display_data_callback:
            self.update_display_data_callback(data, metadata, transient)
        elif self.display_data_callback:
            self.display_data_callback(data, metadata, transient)

# Custom Display Hook for execution results  
class LiteDisplayHook(DisplayHook):
    def finish_displayhook(self):
        if self.publish_execution_result and self.data:
            self.publish_execution_result(self.prompt_count, self.data, self.metadata)

# Custom Interactive Shell
shell = LiteInteractiveShell.instance(
    displayhook_class=LiteDisplayHook,
    display_pub_class=LiteDisplayPublisher,
)
```

**Key Components:**

1. **LiteDisplayPublisher**: Handles `IPython.display.display()` calls
2. **LiteDisplayHook**: Captures execution results with rich formatting
3. **LiteStream**: Captures stdout/stderr through IPython
4. **LiteInteractiveShell**: Provides full IPython environment

### JavaScript Side (Callbacks)

The Python display hooks communicate with JavaScript through registered callbacks:

```javascript
// Set up JavaScript callbacks that will be called from Python
(this.pyodide!.globals as any).set("publish_stream_callback",
  (name: string, text: string) => this.handleStream(name, text));

(this.pyodide!.globals as any).set("publish_display_data_callback",
  (data: any, metadata: any, transient: any) => this.handleDisplayData(data, metadata, transient));

(this.pyodide!.globals as any).set("publish_execution_result_callback",
  (execution_count: number, data: any, metadata: any) => this.handleExecutionResult(execution_count, data, metadata));
```

### Web Client (RichOutput Component)

The web client's `RichOutput` component handles rendering with media type priorities:

```typescript
const preferenceOrder = [
  'text/markdown',
  'text/html', 
  'image/svg+xml',
  'image/svg',
  'application/json',
  'text/plain'
]
```

## Usage Examples

### Basic IPython Display

```python
from IPython.display import display, HTML, Markdown, JSON

# Display HTML
display(HTML('<h3 style="color: blue;">Hello HTML!</h3>'))

# Display Markdown  
display(Markdown('**Bold text** and *italic text*'))

# Display JSON
display(JSON({"key": "value", "numbers": [1, 2, 3]}))
```

### Rich Object Representations

```python
class RichObject:
    def _repr_html_(self):
        return '<div style="border: 2px solid blue; padding: 10px;">Rich HTML</div>'
    
    def _repr_markdown_(self):
        return '## Rich Markdown\n\nThis is **bold** text.'
    
    def __repr__(self):
        return 'RichObject(fallback_text)'

obj = RichObject()
obj  # Displays using _repr_html_()
```

### Matplotlib Integration

```python
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 2*np.pi, 100)
y = np.sin(x)

plt.figure(figsize=(8, 4))
plt.plot(x, y, 'b-', label='sin(x)')
plt.xlabel('x')
plt.ylabel('y') 
plt.title('Sine Wave')
plt.legend()
plt.grid(True)
plt.show()  # Displays as crisp SVG
```

### Pandas DataFrames

```python
import pandas as pd

df = pd.DataFrame({
    'Name': ['Alice', 'Bob', 'Charlie'],
    'Age': [25, 30, 35],
    'City': ['New York', 'London', 'Tokyo']
})

df  # Displays as styled HTML table
```

### Multiple Outputs

```python
print("This is stdout")
display(HTML('<p style="background: yellow;">This is display_data</p>'))
print("More stdout")
42  # This is the execution result
```

## Custom Anode Utilities

The system includes custom display utilities for common use cases:

### Alert Messages

```python
anode_info("This is an informational message")
anode_success("Operation completed successfully!")
anode_warning("This is a warning message")
anode_error("This represents an error state")
```

### Data Tables

```python
data = [
    {'Product': 'Laptop', 'Price': 999, 'Stock': 50},
    {'Product': 'Mouse', 'Price': 25, 'Stock': 200}
]

show_table(data, caption="Product Inventory")
```

## Output Types

The system handles different output types according to Jupyter standards:

### 1. **execute_result**
- Generated when a cell's last expression has a value
- Includes execution count
- Uses rich representations when available

### 2. **display_data** 
- Generated by `display()` function calls
- Can occur multiple times per cell
- Supports rich media types

### 3. **stream**
- stdout/stderr output
- Captured through custom stream objects
- Displayed in real-time

### 4. **error**
- Python exceptions and tracebacks
- Proper error formatting
- Syntax highlighting for tracebacks

## Media Type Support

The system supports standard Jupyter media types:

| Media Type | Description | Example |
|------------|-------------|---------|
| `text/plain` | Plain text | `"Hello World"` |
| `text/html` | HTML content | `<div>Rich HTML</div>` |
| `text/markdown` | Markdown text | `**Bold** _italic_` |
| `image/svg+xml` | SVG graphics | Matplotlib plots |
| `application/json` | JSON data | `{"key": "value"}` |

## Integration with LiveStore

The display system integrates seamlessly with Anode's LiveStore architecture:

1. **Reactive Execution**: Kernels detect work through LiveStore subscriptions
2. **Event Sourcing**: All outputs are stored as events in the notebook's event stream
3. **Real-time Updates**: Display outputs appear instantly across all connected clients
4. **Offline Support**: Rich outputs work offline and sync when connected

## Error Handling

The system provides robust error handling:

### Python Exceptions
```python
try:
    result = 1 / 0
except Exception as e:
    # Proper traceback formatting
    # Syntax highlighting
    # Error type and message extraction
```

### Kernel Errors
- Initialization failures
- Memory issues
- Import errors

## Performance Considerations

### Efficient Rendering
- Media type prioritization reduces processing overhead
- SVG plots are vector-based for crisp rendering
- JSON output is syntax-highlighted efficiently

### Memory Management
- Display data is cleaned for JSON serialization
- Large outputs are truncated appropriately
- Matplotlib figures are cleared after capture

## Future Enhancements

The enhanced display system provides a foundation for:

### Interactive Widgets
- IPython widgets support
- Custom Anode interactive components
- Real-time data updates

### Advanced Visualizations
- 3D plots with three.js
- Interactive charts with D3.js
- Custom visualization libraries

### AI Integration
- Rich AI response formatting
- Code explanation displays
- Interactive AI assistance

## Migration from Previous System

The enhanced system is backward compatible:

### Old Approach
```python
# Manual output formatting
result = {"text/plain": str(obj)}
if hasattr(obj, '_repr_html_'):
    result["text/html"] = obj._repr_html_()
```

### New Approach
```python
# Automatic IPython integration
obj  # Rich representations handled automatically
display(obj)  # Explicit display calls work
```

## Troubleshooting

### Common Issues

1. **Rich representations not showing**
   - Ensure object has `_repr_html_()` or similar methods
   - Check browser console for JavaScript errors

2. **Matplotlib plots not appearing**
   - Verify matplotlib backend is set to 'svg'
   - Check that `plt.show()` is called

3. **Display calls not working**
   - Ensure IPython is properly initialized
   - Check that display callbacks are registered

### Debug Mode

Enable debug logging in the kernel:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## API Reference

### PyodideKernel Methods

```typescript
class PyodideKernel {
  async initialize(): Promise<void>
  async execute(code: string): Promise<OutputData[]>
  isInitialized(): boolean
  async terminate(): Promise<void>
}
```

### Output Data Structure

```typescript
interface OutputData {
  type: OutputType;
  data: RichOutputData | ErrorOutputData | StreamOutputData | unknown;
  metadata?: Record<string, unknown>;
  position: number;
}
```

### Rich Output Data

```typescript
interface RichOutputData {
  'text/plain'?: string;
  'text/html'?: string;
  'text/markdown'?: string;
  'image/svg+xml'?: string;
  'application/json'?: unknown;
  [key: string]: unknown;
}
```

## Conclusion

The enhanced display system brings Anode's notebook experience to full Jupyter compatibility while maintaining its unique real-time collaborative features. The integration of proper IPython display hooks with LiveStore's reactive architecture provides both rich output capabilities and zero-latency collaboration.

This foundation enables advanced features like interactive widgets, AI-generated content, and custom visualization libraries while preserving Anode's local-first architecture and offline capabilities.