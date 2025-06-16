// Consolidated test suite for enhanced display system using tsx
import { PyodideKernel } from '../src/pyodide-kernel.js';
import type { OutputData } from '../src/pyodide-kernel.js';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

class TestSuite {
  private kernel: PyodideKernel;
  private results: TestResult[] = [];

  constructor() {
    this.kernel = new PyodideKernel('test-enhanced-display-system');
  }

  async initialize() {
    console.log('🐍 Initializing PyodideKernel for consolidated test suite...');
    await this.kernel.initialize();
    console.log('✅ PyodideKernel ready for testing');
  }

  async cleanup() {
    if (this.kernel) {
      await this.kernel.terminate();
      console.log('🧹 PyodideKernel terminated');
    }
  }

  private test(name: string, testFn: () => Promise<void>) {
    return async () => {
      try {
        await testFn();
        this.results.push({ name, passed: true });
        console.log(`✅ ${name}`);
      } catch (error) {
        this.results.push({
          name,
          passed: false,
          error: error instanceof Error ? error.message : String(error)
        });
        console.log(`❌ ${name}: ${error}`);
      }
    };
  }

  private expect(actual: any) {
    return {
      toBe: (expected: any) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, got ${actual}`);
        }
      },
      toEqual: (expected: any) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
      },
      toHaveLength: (length: number) => {
        if (!actual || actual.length !== length) {
          throw new Error(`Expected length ${length}, got ${actual?.length || 'undefined'}`);
        }
      },
      toContain: (substring: string) => {
        if (!String(actual).includes(substring)) {
          throw new Error(`Expected "${actual}" to contain "${substring}"`);
        }
      },
      toBeDefined: () => {
        if (actual === undefined) {
          throw new Error(`Expected value to be defined`);
        }
      },
      toBeGreaterThan: (value: number) => {
        if (actual <= value) {
          throw new Error(`Expected ${actual} to be greater than ${value}`);
        }
      },
      toBeGreaterThanOrEqual: (value: number) => {
        if (actual < value) {
          throw new Error(`Expected ${actual} to be greater than or equal to ${value}`);
        }
      },
      toBeLessThan: (value: number) => {
        if (actual >= value) {
          throw new Error(`Expected ${actual} to be less than ${value}`);
        }
      }
    };
  }

  async runTests() {
    console.log('\n🧪 Running Enhanced Display System Tests\n');

    // Basic Functionality Tests
    console.log('=== Basic Functionality ===');

    await this.test('simple expression execution', async () => {
      const result = await this.kernel.execute('2 + 2');
      this.expect(result.length).toBeGreaterThanOrEqual(1);

      const executeResult = result.find(r => r.type === 'execute_result');
      this.expect(executeResult).toBeDefined();
      this.expect(executeResult?.data).toEqual({ 'text/plain': '4' });
    })();

    await this.test('print statement output', async () => {
      const result = await this.kernel.execute('print("Hello, World!")');
      this.expect(result).toHaveLength(1);
      this.expect(result[0].type).toBe('stream');
      this.expect((result[0].data as any).text).toBe('Hello, World!');
    })();

    await this.test('multiple print statements consolidate', async () => {
      const result = await this.kernel.execute(`
print("Line 1")
print("Line 2")
print("Line 3")
`);
      this.expect(result).toHaveLength(1);
      this.expect(result[0].type).toBe('stream');

      const text = (result[0].data as any).text;
      this.expect(text).toContain('Line 1');
      this.expect(text).toContain('Line 2');
      this.expect(text).toContain('Line 3');
    })();

    await this.test('mixed print and expression', async () => {
      const result = await this.kernel.execute(`
print("Before")
x = 42
print("After")
x
`);
      this.expect(result.length).toBeGreaterThanOrEqual(2);

      const executeResult = result.find(r => r.type === 'execute_result');
      this.expect(executeResult).toBeDefined();
      this.expect(executeResult?.data).toEqual({ 'text/plain': '42' });
    })();

    // IPython Display Functions
    console.log('\n=== IPython Display Functions ===');

    await this.test('display() function', async () => {
      const result = await this.kernel.execute('display("Simple display test")');
      this.expect(result).toHaveLength(1);
      this.expect(result[0].type).toBe('display_data');
      this.expect(result[0].data).toEqual({ 'text/plain': "'Simple display test'" });
    })();

    await this.test('HTML display', async () => {
      const result = await this.kernel.execute(`
from IPython.display import display, HTML
display(HTML('<h3>Hello HTML!</h3>'))
`);
      this.expect(result).toHaveLength(1);
      this.expect(result[0].type).toBe('display_data');
      const data = result[0].data as any;
      this.expect(data['text/html']).toBe('<h3>Hello HTML!</h3>');
    })();

    await this.test('Markdown display', async () => {
      const result = await this.kernel.execute(`
from IPython.display import display, Markdown
display(Markdown('**Bold text** and *italic text*'))
`);
      this.expect(result).toHaveLength(1);
      this.expect(result[0].type).toBe('display_data');
      const data = result[0].data as any;
      this.expect(data['text/markdown']).toBe('**Bold text** and *italic text*');
    })();

    await this.test('multiple display calls', async () => {
      const result = await this.kernel.execute(`
display("First")
display("Second")
display("Third")
`);
      this.expect(result).toHaveLength(3);
      this.expect(result.every(r => r.type === 'display_data')).toBe(true);
    })();

    // Rich Object Representations
    console.log('\n=== Rich Object Representations ===');

    await this.test('object with _repr_html_', async () => {
      const result = await this.kernel.execute(`
class RichHTML:
    def _repr_html_(self):
        return '<div style="color: blue;">Rich HTML</div>'
    def __repr__(self):
        return 'RichHTML()'

obj = RichHTML()
obj
`);
      const executeResult = result.find(r => r.type === 'execute_result');
      this.expect(executeResult).toBeDefined();
      const data = executeResult?.data as any;
      this.expect(data['text/html']).toBe('<div style="color: blue;">Rich HTML</div>');
    })();

    await this.test('object with multiple representations', async () => {
      const result = await this.kernel.execute(`
class MultiRepr:
    def _repr_html_(self):
        return '<p><strong>HTML</strong></p>'
    def _repr_markdown_(self):
        return '**Markdown**'
    def __repr__(self):
        return 'MultiRepr()'

obj = MultiRepr()
obj
`);
      const executeResult = result.find(r => r.type === 'execute_result');
      this.expect(executeResult).toBeDefined();
      const data = executeResult?.data as any;
      this.expect(data['text/html']).toBe('<p><strong>HTML</strong></p>');
      this.expect(data['text/markdown']).toBe('**Markdown**');
    })();

    // Pandas DataFrames
    console.log('\n=== Pandas DataFrames ===');

    await this.test('DataFrame rich display', async () => {
      const result = await this.kernel.execute(`
import pandas as pd

df = pd.DataFrame({
    'Name': ['Alice', 'Bob'],
    'Age': [25, 30]
})
df
`);
      const executeResult = result.find(r => r.type === 'execute_result');
      this.expect(executeResult).toBeDefined();
      const data = executeResult?.data as any;
      this.expect(data['text/html']).toContain('<table');
      this.expect(data['text/html']).toContain('Alice');
    })();

    // Matplotlib Integration
    console.log('\n=== Matplotlib Integration ===');

    await this.test('simple line plot', async () => {
      const result = await this.kernel.execute(`
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 2*np.pi, 10)
y = np.sin(x)

plt.figure(figsize=(6, 4))
plt.plot(x, y, 'b-')
plt.title('Simple Plot')
plt.show()
`);
      const displayOutput = result.find(r => r.type === 'display_data');
      this.expect(displayOutput).toBeDefined();
      const data = displayOutput?.data as any;
      this.expect(data['image/svg+xml']).toContain('<svg');
      this.expect(data['image/svg+xml']).toContain('Simple Plot');
    })();

    // Quote Handling
    console.log('\n=== Quote Handling ===');

    await this.test('single quotes in HTML', async () => {
      const result = await this.kernel.execute(`
class QuoteHTML:
    def _repr_html_(self):
        return "<p>Hello 'world' with quotes</p>"

obj = QuoteHTML()
obj
`);
      const executeResult = result.find(r => r.type === 'execute_result');
      this.expect(executeResult).toBeDefined();
      const data = executeResult?.data as any;
      this.expect(data['text/html']).toBe("<p>Hello 'world' with quotes</p>");
    })();

    await this.test('double quotes with escaping', async () => {
      const result = await this.kernel.execute(`
message = "Hello \\"world\\" with escaped quotes"
print(message)
`);
      const streamOutput = result.find(r => r.type === 'stream');
      this.expect(streamOutput).toBeDefined();
      this.expect((streamOutput?.data as any).text).toContain('Hello "world" with escaped quotes');
    })();

    await this.test('complex HTML with mixed quotes', async () => {
      const result = await this.kernel.execute(`
from IPython.display import display, HTML

html_content = '''
<div class="container">
    <h1>Title with "quotes" and 'apostrophes'</h1>
</div>
'''

display(HTML(html_content))
`);
      const displayOutput = result.find(r => r.type === 'display_data');
      this.expect(displayOutput).toBeDefined();
      const data = displayOutput?.data as any;
      this.expect(data['text/html']).toContain('class="container"');
    })();

    // Stream Consolidation
    console.log('\n=== Stream Consolidation ===');

    await this.test('stdout and stderr separation', async () => {
      const result = await this.kernel.execute(`
import sys
print("stdout message")
sys.stderr.write("stderr message\\n")
print("more stdout")
`);
      const streamOutputs = result.filter(r => r.type === 'stream');
      const stdoutOutputs = streamOutputs.filter(r => (r.data as any).name === 'stdout');
      const stderrOutputs = streamOutputs.filter(r => (r.data as any).name === 'stderr');

      this.expect(stdoutOutputs.length).toBeGreaterThan(0);
      this.expect(stderrOutputs).toHaveLength(1);
    })();

    await this.test('long output consolidation', async () => {
      const result = await this.kernel.execute(`
for i in range(5):
    print(f"Line {i}")
`);
      const streamOutputs = result.filter(r => r.type === 'stream');
      this.expect(streamOutputs).toHaveLength(1);

      const text = (streamOutputs[0].data as any).text;
      this.expect(text).toContain('Line 0');
      this.expect(text).toContain('Line 4');
    })();

    await this.test('Zen of Python consolidation', async () => {
      const result = await this.kernel.execute('import this');
      const streamOutputs = result.filter(r => r.type === 'stream');
      this.expect(streamOutputs).toHaveLength(1);

      const text = (streamOutputs[0].data as any).text;
      this.expect(text).toContain('Zen of Python');
      this.expect(text).toContain('Beautiful is better than ugly');
    })();

    // Error Handling
    console.log('\n=== Error Handling ===');

    await this.test('runtime error handling', async () => {
      const result = await this.kernel.execute(`
try:
    result = 1 / 0
except ZeroDivisionError as e:
    print(f"Caught: {e}")
    "Error handled"
`);
      const streamOutput = result.find(r => r.type === 'stream');
      this.expect(streamOutput).toBeDefined();
      this.expect((streamOutput?.data as any).text).toContain('Caught:');
    })();

    // Mixed Content Scenarios
    console.log('\n=== Mixed Content Scenarios ===');

    await this.test('comprehensive mixed output', async () => {
      const result = await this.kernel.execute(`
print("=== Report ===")

from IPython.display import display, Markdown
display(Markdown("## Summary\\n\\nAnalysis **complete**."))

df_summary = pd.DataFrame({'Metric': ['Count'], 'Value': [42]})
print("Done!")

# Return the DataFrame as the last expression
df_summary
`);
      this.expect(result.length).toBeGreaterThan(2);

      const streamOutputs = result.filter(r => r.type === 'stream');
      const displayOutputs = result.filter(r => r.type === 'display_data');
      const executeResults = result.filter(r => r.type === 'execute_result');

      this.expect(streamOutputs.length).toBeGreaterThan(0);
      this.expect(displayOutputs.length).toBeGreaterThanOrEqual(1);
      this.expect(executeResults).toHaveLength(1);
    })();

    // Performance and Reliability
    console.log('\n=== Performance and Reliability ===');

    await this.test('unicode and special characters', async () => {
      const result = await this.kernel.execute(`
unicode_text = "Hello 🌍 World! ñáéíóú"
print(unicode_text)
unicode_text
`);
      const streamOutput = result.find(r => r.type === 'stream');
      const executeResult = result.find(r => r.type === 'execute_result');

      this.expect((streamOutput?.data as any).text).toContain('🌍');
      this.expect((executeResult?.data as any)['text/plain']).toContain('🌍');
    })();

    await this.test('large DataFrame handling', async () => {
      const result = await this.kernel.execute(`
large_df = pd.DataFrame({
    'ID': range(100),
    'Value': [i * 2 for i in range(100)]
})
large_df.head(3)  # Just first 3 rows
`);
      const executeResult = result.find(r => r.type === 'execute_result');
      this.expect(executeResult).toBeDefined();
      const data = executeResult?.data as any;
      this.expect(data['text/html']).toContain('<table');
    })();

    // Summary
    console.log('\n=== Test Summary ===');
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    console.log(`\n📊 Results: ${passed}/${total} tests passed`);

    if (failed > 0) {
      console.log('\n❌ Failed tests:');
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    }

    if (passed === total) {
      console.log('\n🎉 All tests passed! Enhanced display system is working perfectly.');
    } else {
      console.log(`\n⚠️  ${failed} test(s) failed. Check the errors above.`);
    }

    return { passed, failed, total };
  }
}

// Main execution
async function main() {
  const suite = new TestSuite();

  try {
    await suite.initialize();
    const results = await suite.runTests();

    // Exit with appropriate code
    process.exit(results.failed === 0 ? 0 : 1);
  } catch (error) {
    console.error('💥 Test suite failed to initialize:', error);
    process.exit(1);
  } finally {
    await suite.cleanup();
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { TestSuite };
