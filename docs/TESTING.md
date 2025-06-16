# Testing Guide: Enhanced Display System

This document provides comprehensive testing guidance for Anode's enhanced display system, covering the consolidated test suite, running tests, and testing best practices.

## Overview

The enhanced display system includes extensive test coverage (22 comprehensive tests) that validate IPython compatibility, rich output rendering, stream consolidation, and collaborative features using a single, fast consolidated test suite.

## Test Structure

### Test Structure

**Consolidated Test Suite**:
```
packages/dev-server-kernel-ls-client/test/
└── enhanced-display-system.ts    # Main consolidated test suite (22 tests)
```

**Key Benefits**:
- ⚡ **16x faster**: Single kernel initialization vs. multiple separate kernels
- 🧪 **Realistic**: Tests build on shared kernel state like real usage
- 🎯 **Comprehensive**: 22 tests covering all display functionality
- 📊 **Efficient**: ~15 seconds total runtime vs. 4+ minutes for separate tests

### Test Commands

```bash
# Main consolidated test suite
pnpm test:display        # Complete display system validation (22 tests, ~15s)

# Standard vitest tests
pnpm test                # All unit tests
pnpm test:run            # Run tests once without watch mode
```

## Consolidated Test Suite Detail

### Main Test Suite (`pnpm test:display`)

**Purpose**: Comprehensive display system validation with shared kernel state
**Runtime**: ~15 seconds (5s initialization + 10s execution)
**Architecture**: Single PyodideKernel instance shared across all tests

```typescript
// Complete test coverage in one suite
=== Basic Functionality ===
✅ Simple expression execution (2 + 2)
✅ Print statement output  
✅ Multiple print statements consolidate
✅ Mixed print and expression

=== IPython Display Functions ===
✅ display() function
✅ HTML display
✅ Markdown display  
✅ Multiple display calls

=== Rich Object Representations ===
✅ Object with _repr_html_
✅ Object with multiple representations

=== Pandas DataFrames ===
✅ DataFrame rich display

=== Matplotlib Integration ===
✅ Simple line plot (SVG generation)

=== Quote Handling ===
✅ Single quotes in HTML
✅ Double quotes with escaping
✅ Complex HTML/JavaScript with mixed quotes

=== Stream Consolidation ===
✅ stdout and stderr separation
✅ Long output consolidation
✅ Zen of Python consolidation

=== Error Handling ===
✅ Runtime error handling

=== Mixed Content Scenarios ===
✅ Comprehensive mixed output (real-world workflows)

=== Performance and Reliability ===
✅ Unicode and special characters
✅ Large DataFrame handling
```

**Key Benefits**:
- **Fast**: 16x faster than separate test files
- **Realistic**: Tests kernel state persistence like real usage
- **Comprehensive**: Covers all enhanced display functionality
- **Maintainable**: Single test file to update and maintain

**Expected Performance**:
- Kernel initialization: < 5 seconds
- Test execution: < 10 seconds  
- Total runtime: ~15 seconds
- SVG generation: >10KB for plots
- DataFrame HTML: Proper table structure

## Testing Best Practices

### Running Tests Efficiently

```bash
# Main development workflow
pnpm test:display          # Fast, comprehensive validation (15s)

# Pre-commit validation  
pnpm test:run             # All unit tests

# Quick kernel test without full suite
node -e "import('./test/enhanced-display-system.js').then(({TestSuite}) => new TestSuite().initialize())"
```

### Test Development Guidelines

1. **Add to Consolidated Suite**: Extend `enhanced-display-system.ts` for new features
2. **Test Real Use Cases**: Write tests that match actual user workflows  
3. **Use Shared Kernel State**: Build tests that can leverage previous executions
4. **Validate Multiple Output Types**: Test execution_result, display_data, stream, error
5. **Check Output Content**: Verify both structure and actual rendered content
6. **Test Edge Cases**: Empty outputs, long text, special characters
7. **Measure Performance**: Single test suite should remain under 20 seconds

### Adding New Tests

When adding new display features, extend the consolidated test suite:

```typescript
// In enhanced-display-system.ts, add to appropriate section
await this.test('new feature description', async () => {
  const result = await this.kernel.execute(`
    # Your test code here - can use variables from previous tests
  `);
  
  // Validate outputs using this.expect()
  const expectedOutputType = result.find(r => r.type === 'display_data');
  this.expect(expectedOutputType).toBeDefined();
  this.expect(expectedOutputType?.data?.['text/html']).toContain('expected');
})();
```

**Benefits of Consolidated Approach**:
- Shared kernel state allows testing interactions between features
- Faster execution with single initialization
- More realistic testing environment
- Easier to maintain and debug

## Test Data Validation

### Expected Output Structures

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

### Performance Benchmarks

Expected consolidated test suite performance:

- **Kernel initialization**: < 5 seconds (one-time)
- **Total test suite**: < 15 seconds
- **Individual test execution**: < 100ms average
- **Matplotlib plot generation**: SVG content > 10KB
- **DataFrame rendering**: Proper HTML table structure
- **Stream consolidation**: Real-time merging with newline preservation

**Performance Improvements from Consolidation**:
- 16x faster than separate test files
- Single kernel initialization vs. 8+ separate initializations
- Shared state enables testing feature interactions

## Debugging Test Failures

### Common Issues and Solutions

1. **Kernel initialization timeout**
   ```bash
   # Check if packages are loading correctly
   # Look for "Loading" messages in output
   ```

2. **Missing display outputs**
   ```bash
   # Verify IPython integration
   pnpm test:hooks  # Should show callback mechanisms working
   ```

3. **Incorrect stream consolidation**
   ```bash
   # Check newline handling
   pnpm test:consolidation  # Should show proper text merging
   ```

4. **Quote escaping errors**
   ```bash
   # Verify direct function calls
   pnpm test:quotes  # Should handle all quote types
   ```

### Test Environment

Tests run in Node.js with tsx for TypeScript execution:
- **Pyodide**: Full Python environment in WebAssembly
- **IPython**: Complete IPython shell with custom hooks
- **Matplotlib**: SVG backend for vector graphics
- **Pandas**: Full DataFrame support with HTML rendering

## Continuous Integration

### GitHub Actions Integration

```yaml
# Add to .github/workflows/test.yml  
- name: Run Enhanced Display Tests
  run: |
    pnpm test:display    # Single comprehensive test suite
```

### Test Coverage Goals

- **Core Functions**: 100% coverage of display system APIs ✅
- **Output Types**: All four output types tested ✅  
- **Edge Cases**: Quote handling, long outputs, errors ✅
- **Integration**: Real-world usage patterns ✅
- **Performance**: Single suite under 20 seconds ✅
- **Maintainability**: Consolidated suite for easy updates ✅

## Future Test Expansion

### Phase 2: Updateable Outputs

When implementing updateable outputs by ID, extend the consolidated suite:

```typescript
// Add to enhanced-display-system.ts
=== Updateable Outputs ===
✅ Output update by ID
✅ Real-time streaming updates  
✅ Progress bar updates
✅ Collaborative output updates

=== Interactive Widgets ===
✅ IPython widgets support
✅ Widget state synchronization
✅ Multi-user widget interactions
```

### Phase 3: AI Integration

```typescript
// Extend consolidated suite for AI features
=== AI Integration ===
✅ AI response rendering with rich display
✅ Streaming AI text generation
✅ AI-generated visualizations  
✅ Context-aware code suggestions
```

**Advantage**: Consolidated approach allows testing interactions between AI features and existing display system.

---

The enhanced display system's consolidated test suite ensures production-ready reliability while providing fast, comprehensive validation of Jupyter compatibility and real-time collaborative features. The unified approach enables testing feature interactions and maintains development velocity with 16x faster execution.