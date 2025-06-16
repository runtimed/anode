# Anode Enhanced Display System Examples

This document demonstrates the enhanced display functionality in Anode notebooks, showing how the system now properly supports IPython's display system with rich outputs.

## Overview

The enhanced PyodideKernel now includes:
- Proper IPython InteractiveShell integration
- Custom display hooks for rich output formatting
- Support for `IPython.display.display()` calls
- Enhanced matplotlib integration with SVG output
- Standard IPython display functionality

## Basic Display Examples

### 1. Simple Execution Results

```python
# Basic execution result
2 + 2
```

This should show `4` as an execution result with proper formatting.

### 2. IPython Display Functions

```python
from IPython.display import display, HTML, Markdown, JSON

# Display HTML
display(HTML('<h3 style="color: blue;">Hello HTML!</h3>'))

# Display Markdown
display(Markdown('**Bold text** and *italic text*'))

# Display JSON
data = {
    "name": "Anode",
    "version": "1.0",
    "features": ["real-time collaboration", "rich outputs", "AI integration"]
}
display(JSON(data))
```

### 3. Multiple Outputs in One Cell

```python
print("This is stdout output")
display(HTML('<p style="background: yellow; padding: 10px;">This is display_data</p>'))
print("More stdout after display")
42  # This becomes the execution result
```

## Rich Object Representations

### 4. Custom Rich Objects

```python
class RichDemo:
    def __init__(self, name):
        self.name = name

    def _repr_html_(self):
        return f'''
        <div style="border: 2px solid #007acc; padding: 15px; border-radius: 5px;">
            <h4>Rich HTML Representation</h4>
            <p>Name: <strong>{self.name}</strong></p>
            <p>This object has a custom HTML representation!</p>
        </div>
        '''

    def _repr_markdown_(self):
        return f'''
## Rich Markdown Representation

**Name:** {self.name}

This object also has a *markdown* representation with:
- Bullet points
- **Bold text**
- *Italic text*
        '''

    def __repr__(self):
        return f'RichDemo(name="{self.name}")'

# Create and display the object
obj = RichDemo("Test Object")
obj  # This will use the rich HTML representation
```

## Data Visualization

### 5. Matplotlib Plots

```python
import matplotlib.pyplot as plt
import numpy as np

# Create sample data
x = np.linspace(0, 2*np.pi, 100)
y1 = np.sin(x)
y2 = np.cos(x)

# Create the plot
plt.figure(figsize=(10, 6))
plt.plot(x, y1, 'b-', label='sin(x)', linewidth=2)
plt.plot(x, y2, 'r--', label='cos(x)', linewidth=2)
plt.xlabel('x')
plt.ylabel('y')
plt.title('Trigonometric Functions')
plt.legend()
plt.grid(True, alpha=0.3)
plt.show()  # This will display as SVG
```

### 6. Pandas DataFrames

```python
import pandas as pd
import numpy as np

# Create sample data
df = pd.DataFrame({
    'Name': ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'],
    'Age': [25, 30, 35, 28, 32],
    'City': ['New York', 'London', 'Tokyo', 'Paris', 'Sydney'],
    'Salary': [70000, 80000, 90000, 75000, 85000],
    'Department': ['Engineering', 'Marketing', 'Engineering', 'Design', 'Marketing']
})

# Display the DataFrame (should show rich HTML table)
df
```

### 7. Styled Pandas Output

```python
# Create a styled DataFrame
styled_df = df.style.apply(lambda x: ['background-color: lightblue'
                                     if x.name % 2 == 0
                                     else 'background-color: lightgray'
                                     for i in x], axis=1)

styled_df
```

## Advanced Display Features

### 10. Multiple Display Types in Sequence

```python
from IPython.display import display, clear_output
import time

# Show initial content
display(HTML('<h3>Loading data...</h3>'))

# Simulate some processing
for i in range(1, 4):
    time.sleep(0.5)  # In real usage, this would be actual work
    clear_output(wait=True)
    display(HTML(f'<h3>Processing step {i}/3...</h3>'))

# Final result
clear_output(wait=True)
display(HTML('<h3 style="color: green;">✅ Complete!</h3>'))
display(df.head())
```

### 11. Mixed Content Display

```python
# Display multiple types of content
print("=== Analysis Report ===")

display(Markdown("""
## Data Analysis Summary

The dataset contains **5 records** with the following characteristics:
"""))

display(HTML("""
<div style="background: #f0f8ff; padding: 10px; border-left: 4px solid #007acc; margin: 10px 0;">
    <strong>Key Insights:</strong>
    <ul>
        <li>Average age: 30 years</li>
        <li>Most common department: Engineering & Marketing (tie)</li>
        <li>Salary range: $70,000 - $90,000</li>
    </ul>
</div>
"""))

# Show the data
display(df)

print("\nAnalysis complete! 📊")
```

## Error Handling

### 12. Error Display

```python
print("This will print before the error")

# This will cause an error and should be displayed properly
result = 1 / 0  # ZeroDivisionError

print("This line should not execute")
```

## Testing Rich Representations

### 13. Object with Multiple Representations

```python
class MultiRepresentation:
    def __init__(self, data):
        self.data = data

    def _repr_html_(self):
        return f'<div style="color: blue; font-weight: bold;">HTML: {self.data}</div>'

    def _repr_markdown_(self):
        return f'**Markdown:** _{self.data}_'

    def _repr_json_(self):
        return {"type": "MultiRepresentation", "data": self.data}

    def __repr__(self):
        return f'MultiRepresentation(data="{self.data}")'

# Test the object
multi_obj = MultiRepresentation("Test Data")
multi_obj  # Should display the HTML representation
```

## Performance and Streaming

### 14. Large Data Handling

```python
# Test with larger dataset
large_df = pd.DataFrame({
    'ID': range(1000),
    'Value': np.random.randn(1000),
    'Category': np.random.choice(['A', 'B', 'C'], 1000),
    'Date': pd.date_range('2023-01-01', periods=1000, freq='D')
})

# This should handle large data gracefully
large_df.head(10)
```

### 15. Interactive Elements (Basic)

```python
from IPython.display import HTML

# Simple interactive element
interactive_html = """
<div style="border: 1px solid #ccc; padding: 20px; margin: 10px;">
    <h4>Interactive Demo</h4>
    <button onclick="this.style.background='lightgreen'; this.innerHTML='Clicked!'">
        Click me!
    </button>
    <p>This demonstrates basic interactivity in Anode displays.</p>
</div>
"""

display(HTML(interactive_html))
```

## Summary

This enhanced display system brings Anode much closer to the full Jupyter experience by:

1. **Proper IPython Integration**: Using real IPython display hooks instead of custom formatters
2. **Standard Display Functions**: `display()`, `clear_output()`, etc. work as expected
3. **Rich Object Support**: Objects with `_repr_html_()`, `_repr_markdown_()`, etc. display correctly
4. **Multiple Output Types**: Execution results, display data, and streams are handled separately
5. **Enhanced Error Handling**: Proper traceback formatting and display
6. **Custom Utilities**: Anode-specific display helpers for common use cases

The system now provides a foundation for advanced features like:
- Interactive widgets
- Real-time data streaming
- Custom visualization libraries
- Advanced AI-generated content display

All of this while maintaining standard IPython compatibility and Anode's real-time collaborative architecture.
