# Anode Testing Infrastructure

This document describes the comprehensive testing setup for the Anode project.

## Overview

Anode now has a robust testing infrastructure built on:
- **Vitest 3.x** - Fast test runner with great TypeScript support
- **@effect/vitest** - Effect-specific testing utilities
- **Happy DOM** - Lightweight DOM implementation for browser-like testing
- **Comprehensive mocking** - For external dependencies like Pyodide

## Test Structure

```
anode/
├── test/                          # Root-level tests
│   ├── setup.ts                   # Global test configuration
│   ├── fixtures/                  # Mock data and test helpers
│   ├── integration/               # End-to-end integration tests
│   ├── basic.test.ts              # Sanity checks
│   └── schema-validation.test.ts  # Event schema validation
├── packages/
│   ├── schema/test/               # Schema-specific tests
│   └── dev-server-kernel-ls-client/test/  # Kernel client tests
└── vitest.config.ts               # Global test configuration
```

## Test Categories

### 1. Schema Validation Tests
- **Location**: `test/schema-validation.test.ts`
- **Purpose**: Validates all LiveStore event schemas
- **Coverage**: 
  - Event structure validation
  - Data type checking
  - Optional field handling
  - Error scenarios
  - Naming conventions

### 2. Kernel Integration Tests
- **Location**: `packages/dev-server-kernel-ls-client/test/`
- **Purpose**: Tests kernel lifecycle and execution flow
- **Coverage**:
  - Kernel session management
  - Execution queue processing
  - Reactive query subscriptions (debugging reactivity issues)
  - Error handling and recovery

### 3. End-to-End Integration Tests
- **Location**: `test/integration/`
- **Purpose**: Full workflow testing
- **Coverage**:
  - Complete notebook execution cycles
  - Multi-kernel concurrency
  - State consistency across components
  - Memory leak prevention

### 4. Reactivity Debugging Tests
- **Location**: `test/integration/reactivity-debugging.test.ts`
- **Purpose**: Specifically targets the "reactivity errors" you mentioned
- **Coverage**:
  - Query subscription lifecycle
  - Memory management
  - Error recovery
  - Performance under load

## Key Testing Features

### Mocking Strategy
- **Pyodide**: Fully mocked to avoid runtime dependencies
- **LiveStore adapters**: In-memory implementations for fast tests
- **External APIs**: Mocked with predictable responses

### Test Utilities
- **Fixtures**: Pre-built test data in `test/fixtures/`
- **Helpers**: Async utilities, resource cleanup, error testing
- **Factory functions**: Dynamic test data generation

### Reactivity Testing
Special focus on the server-side client reactivity issues:

```typescript
// Example: Testing query subscription cleanup
it('should properly clean up subscriptions on query disposal', async () => {
  const subscription = store.subscribe(query$, { onUpdate: callback })
  
  // Trigger updates
  store.commit(events.cellCreated({ ... }))
  
  // Clean up subscription (critical for preventing memory leaks)
  subscription()
  
  // Verify no more callbacks after cleanup
  store.commit(events.cellDeleted({ ... }))
  expect(callback).not.toHaveBeenCalledAfter(cleanup)
})
```

## Running Tests

### Basic Commands
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run specific test file
pnpm test:run test/schema-validation.test.ts

# Run with UI
pnpm test:ui

# Run with coverage
pnpm test:coverage

# Use interactive UI for debugging
pnpm test:ui
```

### Package-Specific Tests
```bash
# Schema tests only
pnpm test:schema

# Kernel client tests only
pnpm test:kernel

# Integration tests
pnpm test:integration

# Reactivity debugging specifically (for your main issue)
pnpm test:reactivity
```

### Debug Mode
```bash
# Run with detailed logging
pnpm test:debug
```

## Test Configuration

### Environment Variables
Tests automatically set:
- `NODE_ENV=test`
- Mock LiveStore sync URLs
- Disabled console output (unless `DEBUG_TESTS=true`)

### Custom Matchers
- Date validation helpers
- LiveStore event structure checking
- Async state verification utilities

## Debugging Tests

### Reactivity Issues
The tests include specific scenarios for debugging the server-side reactivity errors:

1. **Memory Leaks**: Tests for proper subscription cleanup
2. **Error Recovery**: Handling query failures gracefully
3. **State Consistency**: Ensuring reactive queries stay in sync
4. **Performance**: High-frequency update handling

### Useful Debug Patterns
```bash
# Run with debug output
pnpm test:debug

# Run single test with verbose output
pnpm test:run test/integration/reactivity-debugging.test.ts -t "subscription lifecycle"

# Interactive debugging with UI
pnpm test:ui

# Watch mode for development
pnpm test:watch
```

## Test Data

### Fixtures
Pre-built test data includes:
- Mock notebook and cell structures
- Kernel session configurations
- Execution queue entries
- Python code samples for testing

### Factory Functions
Dynamic data generation:
```typescript
import { createMockCell, createTestSessionId } from '../test/setup.js'

const cell = createMockCell({ 
  cellType: 'code',
  source: 'print("Hello, World!")'
})
```

## Performance Testing

Tests include performance benchmarks for:
- Query subscription overhead
- Memory usage patterns
- Event processing latency
- Concurrent execution handling

## Best Practices

### Writing New Tests
1. Use descriptive test names
2. Include both positive and negative test cases
3. Clean up resources in `afterEach`
4. Mock external dependencies
5. Test error scenarios explicitly

### Debugging Reactivity
1. Use `waitFor` for async state changes
2. Track subscription counts and cleanup
3. Test rapid state changes
4. Verify memory usage patterns

### CI/CD Integration
Tests are designed to be:
- Fast (< 30 seconds for full suite)
- Reliable (no flaky tests)
- Comprehensive (high coverage)
- Isolated (no external dependencies)

## Known Issues & Solutions

### Schema Import Issues
- Solution: Use relative imports for built packages
- Example: `import { events } from "../packages/schema/dist/index.js"`
- Make sure to build schema first: `pnpm build:schema`

### Date Handling
- Effect schemas convert ISO strings to Date objects
- Tests verify instance types rather than exact equality

### Async Testing
- Use `waitFor` helper for state changes
- Properly clean up subscriptions and resources
- Test timeout handling

### HTML Reports
- Currently disabled due to Vitest 3.x configuration complexity
- Use `pnpm test:ui` for interactive test results instead
- Coverage reports still work with `pnpm test:coverage`

## Future Enhancements

Planned testing improvements:
- Browser automation tests (Playwright)
- Performance regression detection
- Visual regression testing
- Property-based testing for edge cases

## Contributing

When adding new tests:
1. Follow existing patterns in similar test files
2. Add appropriate fixtures to `test/fixtures/`
3. Update this README if adding new test categories
4. Ensure tests pass in CI environment

## Troubleshooting

### Common Issues
- **Import errors**: Check that schema package is built (`pnpm build:schema`)
- **Timeout errors**: Increase timeout in `vitest.config.ts`
- **Memory issues**: Verify resource cleanup in `afterEach`

### Getting Help
- Check test output for specific error messages
- Use `DEBUG_TESTS=true` for verbose logging
- Review existing test patterns for guidance