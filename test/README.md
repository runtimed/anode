# Anode Testing Infrastructure

**Status: ✅ Stable** - Robust testing for notebook interface and real-time collaboration, with ongoing enhancements.

## Overview

Anode has a robust testing infrastructure built on:

- **Vitest 3.x** - Fast test runner with excellent TypeScript support
- **@effect/vitest** - Effect-specific testing utilities for LiveStore
  integration
- **Happy DOM** - Lightweight DOM implementation for browser-like testing
- **Real LiveStore integration** - Tests actual collaboration features
- **58 passing tests** - Complete validation of UI and sync functionality

## Test Structure

```
anode/
├── test/                          # Root-level tests
│   ├── setup.ts                   # Global test configuration
│   ├── fixtures/                  # Mock data and test helpers
│   ├── integration/               # End-to-end integration tests
│   ├── basic.test.ts              # Basic setup tests
│   └── edge-cases.test.ts         # Edge cases and stress tests
├── src/                           # Application source
│   └── components/                # UI components with tests
└── vitest.config.ts               # Global test configuration
```

## Test Categories

### Basic Setup Tests
- **Location**: `test/basic.test.ts`
- **Purpose**: Infrastructure validation and smoke tests
- **Coverage**: Environment configuration, TypeScript compilation, basic test utilities.

### Edge Cases & Stress Tests
- **Location**: `test/edge-cases.test.ts`
- **Purpose**: Boundary conditions and performance limits
- **Coverage**: Concurrent cell operations, large data handling, Unicode and special characters, error recovery scenarios.

### Integration Tests
- **Location**: `test/integration/`
- **Purpose**: End-to-end notebook workflows
- **Coverage**: Complete notebook lifecycle (`execution-flow.test.ts`), real-time collaboration scenarios, LiveStore state consistency, memory management (`reactivity-debugging.test.ts`).

### UI Component Tests
- **Location**: Component files with `.test.ts` suffix
- **Purpose**: React component behavior validation
- **Coverage**: Rendering and interaction, props validation, event handling, accessibility features.

## Key Testing Features

### Testing Strategy
- **Real LiveStore**: Uses actual LiveStore for collaboration testing.
- **Mock External APIs**: Network requests and authentication.
- **Happy DOM**: Browser simulation for React components.

### Test Utilities
- **Fixtures**: Pre-built test data in `test/fixtures/`.
- **Helpers**: Async utilities, resource cleanup, error testing.
- **Factory functions**: Dynamic test data generation.

### Collaboration Testing
Validates real-time notebook collaboration, including concurrent cell modifications, memory management, error recovery, state consistency, and performance.

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
```

### Specific Test Categories
```bash
# Integration tests only
pnpm test:integration

# Debug mode with verbose output
pnpm test:debug

# Run specific test file
pnpm test test/basic.test.ts
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
Tests automatically set `NODE_ENV=test`, mock LiveStore sync URLs, and disable console output (unless `DEBUG_TESTS=true`).

### Custom Matchers
Includes date validation helpers, LiveStore event structure checking, and async state verification utilities.

## Debugging Tests

### Collaboration Testing
Tests validate real-time collaborative notebook features:
1. **Multi-User Editing**: Concurrent cell modifications without conflicts.
2. **Memory Management**: Proper subscription cleanup and resource management.
3. **Error Recovery**: Handling connection failures and race conditions.
4. **State Consistency**: LiveStore event sourcing maintains perfect sync.
5. **Performance**: High-frequency collaborative updates.

### Useful Debug Patterns
```bash
# Run with debug output
pnpm test:debug

# Run single test with verbose output
pnpm test:run test/integration/execution-flow.test.ts -t "execution cycle"

# Interactive debugging with UI
pnpm test:ui

# Watch mode for development
pnpm test:watch
```

## Test Data

### Fixtures
Pre-built test data includes mock notebook and cell structures, runtime session configurations, execution queue entries, and Python code samples for testing.

### Factory Functions
Dynamic data generation using `createMockCell` and `createTestSessionId` from `../test/setup.js`.

## Performance Testing
Validates zero-latency query subscription overhead, memory usage patterns, event processing latency (targeting <1ms for execution triggers), concurrent execution handling and scaling, and AI integration performance (planned for next phase).

## Best Practices

### Writing New Tests
1. Use descriptive test names.
2. Include both positive and negative test cases.
3. Clean up resources in `afterEach`.
4. Mock external dependencies.
5. Test error scenarios explicitly.

### Collaboration Testing
1. Use `waitFor` for async state changes validation.
2. Track subscription counts and proper cleanup.
3. Test rapid state changes and collaborative updates.
4. Verify real-time synchronization performance.
5. Validate memory usage patterns in multi-user scenarios.

### CI/CD Integration
Tests are designed to be fast (~2 seconds for full suite), reliable (no flaky tests), comprehensive (58 tests), and self-contained (minimal external dependencies).

## Known Issues & Solutions

### Schema Import Issues
- **Solution**: Use JSR imports for schema (e.g., `import { events } from "@runt/schema"`). No build step needed - direct TypeScript imports from JSR package.

### Date Handling
- Effect schemas convert ISO strings to Date objects.
- Tests verify instance types rather than exact equality.

### Async Testing
- Use `waitFor` helper for state changes.
- Properly clean up subscriptions and resources.
- Test timeout handling.

### HTML Reports
- Currently disabled due to Vitest 3.x configuration complexity.
- Use `pnpm test:ui` for interactive test dashboard.
- Coverage reports available with `pnpm test:coverage`.

## Future Enhancements
For future testing priorities and the overall project roadmap, please refer to the main [ROADMAP.md](../../ROADMAP.md) file.

## Contributing
When adding new tests:
1. Follow existing patterns in similar test files.
2. Add appropriate fixtures to `test/fixtures/`.
3. Update this README if adding new test categories.
4. Ensure tests pass in CI environment.

## Troubleshooting

### Common Issues
- **Import errors**: Check that schema import is correct (`@runt/schema`).
- **Type errors**: TypeScript catches invalid queries at compile time.
- **Timeout errors**: Increase timeout in `vitest.config.ts`.
- **Memory issues**: Verify store cleanup in `afterEach`.

### Getting Help
- Check test output for specific error messages.
- Use `DEBUG_TESTS=true` for verbose logging.
- Review existing test patterns in `test/` directory.
- Focus on UI component testing and collaboration scenarios.

### Python Runtime Testing
**Note**: Python execution and AI features are now tested in the separate `@runt` packages.
- Runtime testing: https://github.com/runtimed/runt
- This repository focuses on notebook interface and collaboration testing
