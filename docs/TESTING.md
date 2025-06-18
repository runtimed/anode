# Testing Strategy

This document outlines the current testing state and strategy for Anode, including gaps that need to be addressed and plans for comprehensive integration testing.

## Current Testing State

Anode has basic test infrastructure but significant gaps in verifying core functionality. Most tests are smoke tests or use mocked dependencies, which doesn't prove the system works end-to-end.

### What's Actually Tested ✅

**Basic Infrastructure:**
- Schema validation and TypeScript compilation
- LiveStore event flow and state management
- React component rendering without errors
- Basic runtime lifecycle (with mocked Pyodide)

**Test Results:**
```bash
pnpm test
# ✓ 27 passed | 13 skipped (40 total)
# Includes: basic setup, mocked runtime tests, LiveStore integration
```

### Critical Testing Gaps ❌

**Python Execution:**
- No real Pyodide startup/initialization testing
- Rich output rendering unverified (matplotlib, pandas)
- IPython.display functions not tested end-to-end
- Performance claims unsubstantiated

**Integration Scenarios:**
- Runtime-to-UI communication not tested with real data
- Error handling with actual Python exceptions
- Memory usage and execution timeouts
- Multi-user collaboration with real execution

### Current Test Commands

```bash
# Basic test suite (mostly smoke tests)
pnpm test                # All current tests (27 passing, 13 skipped)
pnpm test:runtime         # Runtime tests (mocked Pyodide)
pnpm test:run            # Run tests once without watch mode
```

## Needed Integration Tests (Priority 1)

### Goal: Prove Core Functionality Works

**File to Create**: `packages/pyodide-runtime-agent/test/pyodide-integration.test.ts`

```typescript
describe('Pyodide Integration Tests', () => {
  let runtime: PyodideKernel
  
  beforeAll(async () => {
    runtime = new PyodideKernel('test-notebook')
    await runtime.initialize() // Real Pyodide startup
  }, 30000) // 30s timeout for Pyodide startup
  
  test('basic Python execution', async () => {
    const result = await runtime.execute('2 + 2')
    expect(result).toContainEqual(
      expect.objectContaining({
        type: 'execute_result',
        data: expect.objectContaining({
          'text/plain': '4'
        })
      })
    )
  })
  
  test('matplotlib plot generation', async () => {
    const code = `
import matplotlib.pyplot as plt
import numpy as np
x = np.linspace(0, 10, 100)
y = np.sin(x)
plt.plot(x, y)
plt.title('Test Plot')
plt.show()
`
    const result = await runtime.execute(code)
    const svgOutput = result.find(r => r.type === 'display_data')
    expect(svgOutput?.data).toHaveProperty('image/svg+xml')
    expect(svgOutput?.data['image/svg+xml']).toContain('<svg')
  })
  
  test('pandas DataFrame display', async () => {
    const code = `
import pandas as pd
df = pd.DataFrame({'A': [1, 2, 3], 'B': [4, 5, 6]})
df
`
    const result = await runtime.execute(code)
    const htmlOutput = result.find(r => r.type === 'execute_result')
    expect(htmlOutput?.data).toHaveProperty('text/html')
    expect(htmlOutput?.data['text/html']).toContain('<table')
  })
  
  test('IPython.display functions', async () => {
    const code = `
from IPython.display import HTML, Markdown, display
display(HTML('<h1>Test HTML</h1>'))
display(Markdown('**Bold text**'))
`
    const result = await runtime.execute(code)
    expect(result).toHaveLength(2)
    expect(result[0].data).toHaveProperty('text/html')
    expect(result[1].data).toHaveProperty('text/markdown')
  })
})
```

**Setup Requirements:**
- Real Pyodide loading (no mocks)
- Timeout handling for slow startup
- Memory cleanup between tests
- Proper error isolation

## Testing Strategy

### Mock Strategy

**When to Mock:**
- External API calls (OpenAI, databases)
- File system operations
- Network requests to sync backend

**When NOT to Mock:**
- Pyodide execution (core functionality)
- LiveStore state management
- React component rendering
- IPython display system

### Test Environment Setup

**CI Requirements:**
- Node.js 18+ environment
- Sufficient memory for Pyodide (>1GB)
- Timeout handling for slow tests
- Artifact collection for failed tests

**Local Development:**
```bash
# Install test dependencies
pnpm install

# Run quick smoke tests
pnpm test

# Run integration tests (when created)
pnpm test:integration --timeout 60000

# Run specific test
pnpm test --grep "basic Python execution"
```

### Performance Testing

**Goal**: Validate speed and memory claims

**Metrics to Track:**
- Pyodide startup time
- Execution latency for simple operations
- Rich output rendering time
- Memory usage during execution
- Collaboration sync delays

```typescript
describe('Performance Tests', () => {
  test('Pyodide startup under 10 seconds', async () => {
    const start = Date.now()
    const runtime = new PyodideKernel('perf-test')
    await runtime.initialize()
    const duration = Date.now() - start
    expect(duration).toBeLessThan(10000)
  })
  
  test('simple execution under 1 second', async () => {
    const start = Date.now()
    await runtime.execute('2 + 2')
    const duration = Date.now() - start
    expect(duration).toBeLessThan(1000)
  })
})
```

## Testing Roadmap

### Phase 1: Foundation (Next 2 weeks)
- [ ] Real Pyodide integration tests
- [ ] Rich output verification tests
- [ ] Basic performance benchmarks
- [ ] Error scenario testing

### Phase 2: Coverage (Next month)
- [ ] End-to-end browser tests
- [ ] Multi-user collaboration tests
- [ ] Runtime lifecycle tests
- [ ] Memory leak detection

### Phase 3: Production (Next quarter)
- [ ] Load testing with large notebooks
- [ ] Cross-browser compatibility tests
- [ ] Mobile device testing
- [ ] Security penetration testing

## Success Metrics

### Functionality
- All integration tests pass consistently
- Rich outputs render correctly
- Error handling works gracefully
- Multi-user sync maintains consistency

### Performance
- Pyodide startup: < 10 seconds
- Simple execution: < 1 second  
- Rich output rendering: < 2 seconds
- Memory usage: < 500MB per runtime

### Reliability
- Test suite completion: > 95%
- Flaky test rate: < 5%
- False positive rate: < 1%
- Coverage of critical paths: 100%

## Expected Output Structures

```typescript
// Execution Result
{
  type: "execute_result",
  data: { "text/plain": "42" },
  metadata: {},
  position: 0
}

// Display Data
{
  type: "display_data", 
  data: { 
    "text/html": "<h1>HTML Content</h1>",
    "text/plain": "Fallback text"
  },
  metadata: {},
  position: 0
}

// Stream Output
{
  type: "stream",
  data: {
    name: "stdout",
    text: "Consolidated text with\nnewlines preserved"
  },
  metadata: {},
  position: 0
}

// Error Output
{
  type: "error",
  data: {
    ename: "NameError",
    evalue: "name 'undefined_var' is not defined",
    traceback: ["Traceback (most recent call last):", ...]
  },
  position: 0
}
```

## Current Limitations

### Testing Gaps
- Most tests use mocked Pyodide, don't prove real execution works
- Rich output claims unverified through integration tests
- Performance benchmarks missing
- Error handling scenarios not thoroughly tested

### Test Environment Issues
- Long Pyodide startup time affects test execution
- Memory cleanup between tests needs attention
- Cross-browser testing not implemented
- Mobile compatibility untested

---

This testing strategy prioritizes proving that core functionality actually works before building advanced features. The immediate focus is on integration tests that verify real-world usage rather than unit tests that might miss integration issues.

**Next Steps**: Implement Phase 1 integration tests to verify current claims about Python execution and rich output rendering.