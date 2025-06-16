// Test script to verify enhanced display functionality
import { PyodideKernel } from '../src/pyodide-kernel.js';

async function testDisplayFunctionality() {
  console.log('🧪 Testing enhanced PyodideKernel display functionality...\n');

  const kernel = new PyodideKernel('test-notebook-display');

  try {
    // Initialize the kernel
    console.log('Initializing kernel...');
    await kernel.initialize();
    console.log('✅ Kernel initialized\n');

    // Test 1: Basic execution result
    console.log('Test 1: Basic execution result');
    const result1 = await kernel.execute('2 + 2');
    console.log('Result:', JSON.stringify(result1, null, 2));
    console.log('');

    // Test 2: IPython.display.display() function
    console.log('Test 2: IPython.display.display() function');
    const result2 = await kernel.execute(`
from IPython.display import display, HTML, Markdown
display(HTML('<h3>Hello HTML!</h3>'))
display(Markdown('**Bold text** and *italic text*'))
`);
    console.log('Result:', JSON.stringify(result2, null, 2));
    console.log('');

    // Test 3: Pandas DataFrame
    console.log('Test 3: Pandas DataFrame rich display');
    const result3 = await kernel.execute(`
import pandas as pd
df = pd.DataFrame({
    'Name': ['Alice', 'Bob', 'Charlie'],
    'Age': [25, 30, 35],
    'City': ['New York', 'London', 'Tokyo']
})
df
`);
    console.log('Result:', JSON.stringify(result3, null, 2));
    console.log('');

    // Test 4: Matplotlib plot
    console.log('Test 4: Matplotlib SVG plot');
    const result4 = await kernel.execute(`
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 2*np.pi, 100)
y = np.sin(x)

plt.figure(figsize=(8, 4))
plt.plot(x, y, 'b-', label='sin(x)')
plt.xlabel('x')
plt.ylabel('y')
plt.title('Simple Sine Wave')
plt.legend()
plt.grid(True)
plt.show()
`);
    console.log('Result:', JSON.stringify(result4, null, 2));
    console.log('');

    // Test 5: Multiple outputs in one cell
    console.log('Test 5: Multiple outputs in one cell');
    const result5 = await kernel.execute(`
print("First, some stdout output")
display(HTML('<p style="color: blue;">Blue HTML text</p>'))
print("More stdout after display")
42  # This should be the execution result
`);
    console.log('Result:', JSON.stringify(result5, null, 2));
    console.log('');

    // Test 6: Error handling
    console.log('Test 6: Error handling');
    const result6 = await kernel.execute(`
print("This will print before the error")
1 / 0  # This will cause an error
`);
    console.log('Result:', JSON.stringify(result6, null, 2));
    console.log('');

    // Test 7: Clear output
    console.log('Test 7: Clear output functionality');
    const result7 = await kernel.execute(`
from IPython.display import display, clear_output
import time

display(HTML('<p>Initial output</p>'))
clear_output(wait=True)
display(HTML('<p>Cleared and replaced output</p>'))
`);
    console.log('Result:', JSON.stringify(result7, null, 2));
    console.log('');

    console.log('✅ All display tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await kernel.terminate();
  }
}

// Function to test specific display features
async function testSpecificFeatures() {
  console.log('\n🔬 Testing specific display features...\n');

  const kernel = new PyodideKernel('test-specific-features');

  try {
    await kernel.initialize();

    // Test rich representations
    console.log('Testing rich representations:');
    const richTest = await kernel.execute(`
class RichObject:
    def _repr_html_(self):
        return '<div style="background: yellow; padding: 10px;">Rich HTML representation</div>'

    def _repr_markdown_(self):
        return '## Rich Markdown\\n\\nThis is **markdown** representation'

    def __repr__(self):
        return 'RichObject(text_repr)'

obj = RichObject()
obj
`);
    console.log('Rich object result:', JSON.stringify(richTest, null, 2));
    console.log('');

    // Test JSON display
    console.log('Testing JSON display:');
    const jsonTest = await kernel.execute(`
import json
from IPython.display import display, JSON

data = {
    "name": "Test Data",
    "values": [1, 2, 3, 4, 5],
    "nested": {"key": "value", "number": 42}
}

display(JSON(data))
`);
    console.log('JSON display result:', JSON.stringify(jsonTest, null, 2));

  } catch (error) {
    console.error('❌ Specific feature test failed:', error);
  } finally {
    await kernel.terminate();
  }
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  testDisplayFunctionality()
    .then(() => testSpecificFeatures())
    .then(() => {
      console.log('\n🎉 All tests completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

export { testDisplayFunctionality, testSpecificFeatures };
