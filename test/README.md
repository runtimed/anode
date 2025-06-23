# Anode Testing Infrastructure

**Status: ✅ Fully Operational** - Good testing infrastructure supporting zero-latency reactive architecture.

## Overview

Anode has a robust testing infrastructure built on:
- **Vitest 3.x** - Fast test runner with excellent TypeScript support
- **@effect/vitest** - Effect-specific testing utilities for LiveStore integration
- **Happy DOM** - Lightweight DOM implementation for browser-like testing
- **Comprehensive mocking** - External dependencies (Pyodide, LiveStore adapters)
- **68 passing tests** - Good validation of working system

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
- **Purpose**: Tests zero-latency kernel execution and lifecycle
- **Coverage**:
  - Kernel session management and isolation
  - Zero-latency execution queue processing
  - Reactive query subscriptions
  - Error handling and recovery scenarios

### 3. End-to-End Integration Tests
- **Location**: `test/integration/`
- **Purpose**: Full workflow testing
- **Coverage**:
  - Complete notebook execution cycles
  - Multi-kernel concurrency
  - State consistency across components
  - Memory leak prevention

### 4. Reactivity Tests
- **Location**: `test/integration/reactivity-debugging.test.ts`
- **Purpose**: Validates zero-latency reactive architecture
- **Coverage**:
  - Zero-latency query subscription lifecycle
  - Memory management and cleanup
  - Error recovery and resilience
  - Performance validation under load

## Key Testing Features

### Mocking Strategy
- **Pyodide**: Fully mocked to avoid runtime dependencies
- **LiveStore adapters**: In-memory implementations for fast tests
- **External APIs**: Mocked with predictable responses

### Test Utilities
- **Fixtures**: Pre-built test data in `test/fixtures/`
- **Helpers**: Async utilities, resource cleanup, error testing
- **Factory functions**: Dynamic test data generation

### Zero-Latency Reactive Testing
Validation of instant execution architecture:

```typescript
// Example: Testing zero-latency execution flow
it('should execute cells instantly via reactive subscriptions', async () => {
  const subscription = store.subscribe(executionQueue$, { onUpdate: callback })
  
  // Trigger execution
  store.commit(events.executionRequested({ cellId, source: 'print("hello")' }))
  
  // Verify instant response (no polling delays)
  await waitFor(() => expect(callback).toHaveBeenCalledWith(
    expect.arrayContaining([expect.objectContaining({ status: 'assigned' })])
  ))
  
  // Clean up subscription
  subscription()
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
# Run with detailed logging for troubleshooting
pnpm test:debug

# Run AI integration tests (when available)
pnpm test:ai
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

### Reactivity Validation
The tests validate the zero-latency reactive architecture:

1. **Zero-Latency Execution**: Validates instant cell execution without polling delays
2. **Memory Management**: Tests proper subscription cleanup and resource management
3. **Error Recovery**: Handling query failures and race conditions gracefully
4. **State Consistency**: Ensuring reactive queries maintain perfect sync
5. **Performance**: High-frequency update handling

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

Performance validation includes:
- Zero-latency query subscription overhead
- Memory usage patterns and leak detection
- Event processing latency (targeting <1ms for execution triggers)
- Concurrent execution handling and scaling
- AI integration performance (planned for next phase)

## Best Practices

### Writing New Tests
1. Use descriptive test names
2. Include both positive and negative test cases
3. Clean up resources in `afterEach`
4. Mock external dependencies
5. Test error scenarios explicitly

### Reactive Testing
1. Use `waitFor` for async state changes validation
2. Track subscription counts and proper cleanup
3. Test rapid state changes and high-frequency updates
4. Verify zero-latency execution performance
5. Validate memory usage patterns

### CI/CD Integration
Tests are designed to be:
- Fast (< 30 seconds for full suite)
- Reliable (no flaky tests)
- Good coverage
- Isolated (no external dependencies)

## Known Issues & Solutions

### Schema Import Issues
- Solution: Use relative imports for built packages
- Example: `import { events } from "@runt/schema"`
- No build step needed - direct TypeScript imports from JSR schema package

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

## Future Enhancements - AI Integration Focus

Next phase testing priorities:
- **Re-enable skipped tests one by one** - good opportunity now that major issues are resolved
- **AI cell integration tests** - Context extraction and LLM provider validation
- **Code completion tests** - LSP integration and kernel-based suggestions
- **Authentication flow tests** - Google OAuth and session management
- Browser automation tests (Playwright) for full E2E workflows
- Performance regression detection for AI workloads

## Contributing

When adding new tests:
1. Follow existing patterns in similar test files
2. Add appropriate fixtures to `test/fixtures/`
3. Update this README if adding new test categories
4. Ensure tests pass in CI environment

## Troubleshooting

### Common Issues
- **Import errors**: Check that schema import is correct (`@runt/schema`)
- **Type errors**: TypeScript catches invalid queries at compile time
- **Timeout errors**: Increase timeout in `vitest.config.ts`
- **Memory issues**: Verify resource cleanup in `afterEach`

### Getting Help
- Check test output for specific error messages
- Use `DEBUG_TESTS=true` for verbose logging
- Review existing test patterns for guidance
- Focus on re-enabling skipped tests and AI integration testing patterns as the next development phase