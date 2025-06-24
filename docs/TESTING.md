# Testing Strategy

This document outlines the current testing state and strategy for Anode's notebook interface and synchronization system.

## Current Testing State

Anode has comprehensive test coverage for the core notebook interface and LiveStore integration. All tests pass with excellent coverage of collaboration, UI components, and edge cases.

### What's Actually Tested ✅

**Core Infrastructure:**
- LiveStore event flow and state management
- Schema validation and TypeScript compilation
- Real-time collaboration without conflicts
- Event-sourced state consistency

**UI Components:**
- Cell creation, editing, deletion, and reordering
- Notebook viewer functionality
- Context visibility controls
- Mobile-responsive interface behavior

**Collaboration Features:**
- Multi-user editing scenarios
- Conflict-free collaborative editing
- Real-time synchronization
- Offline-first operation

**Edge Cases & Stress Testing:**
- Rapid cell creation/deletion
- Large notebook handling
- Memory leak prevention
- Error recovery scenarios

### Test Results ✅

```bash
pnpm test
# ✓ 36 passed (36 total)
# Test Files: 4 passed (4)
# Duration: ~2s
```

**Test Coverage:**
- ✅ `test/basic.test.ts` - Basic setup and infrastructure
- ✅ `test/edge-cases.test.ts` - Edge cases and stress tests (15 tests)
- ✅ `test/integration/execution-flow.test.ts` - End-to-end execution flow (10 tests)
- ✅ `test/integration/reactivity-debugging.test.ts` - Reactivity and memory management (9 tests)

## Test Categories

### Unit Tests
**Location**: `test/basic.test.ts`
- Basic setup validation
- Environment configuration
- TypeScript compilation

### Integration Tests
**Location**: `test/integration/`
- Complete notebook lifecycle
- LiveStore event handling
- Real-time collaboration scenarios
- Memory and performance validation

### Edge Case Tests
**Location**: `test/edge-cases.test.ts`
- Concurrent operation stress tests
- Large data handling
- Unicode and special character support
- Error recovery scenarios

## Test Commands

```bash
# Run all tests
pnpm test

# Run tests once (no watch mode)
pnpm test --run

# Run with UI dashboard
pnpm test:ui

# Run specific test file
pnpm test test/basic.test.ts

# Run integration tests only
pnpm test:integration

# Debug mode with verbose output
pnpm test:debug
```

## Testing Philosophy

### What We Test Thoroughly
- **LiveStore Integration**: Event sourcing, state management, collaboration
- **UI Components**: Rendering, interaction, responsive behavior
- **Real-time Collaboration**: Multi-user scenarios, conflict resolution
- **Edge Cases**: Performance limits, error conditions, data integrity

### What We Don't Test Here
- **Python Execution**: Handled by `@runt` packages (see https://github.com/rgbkrk/runt)
- **AI Integration**: Runtime-specific features moved to separate repository
- **Rich Output Rendering**: Display logic is part of runtime system

### Mock Strategy
- **Mock External APIs**: Network requests, authentication services
- **Mock Browser APIs**: File system, clipboard, notifications
- **Real LiveStore**: Use actual LiveStore for state management tests
- **Real React**: Component rendering with actual React (not mocked)

## Test Environment

### CI/CD Pipeline
- **Node.js 18+** environment
- **Happy DOM** for browser simulation
- **Vitest** test runner with TypeScript support
- **Fast execution**: All tests complete in ~2 seconds

### Local Development
```bash
# Install dependencies
pnpm install

# Run tests in watch mode (default)
pnpm test

# Type checking
pnpm type-check

# Build validation
pnpm build
```

## Adding New Tests

### For UI Components
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { YourComponent } from '@/components/YourComponent'

describe('YourComponent', () => {
  it('should render correctly', () => {
    render(<YourComponent />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
```

### For LiveStore Integration
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestStore } from './setup'

describe('LiveStore Integration', () => {
  let store: any
  
  beforeEach(async () => {
    store = await createTestStore()
  })
  
  afterEach(() => {
    store?.close()
  })
  
  it('should handle events correctly', async () => {
    // Test LiveStore event handling
  })
})
```

### Best Practices
1. **Test Behavior, Not Implementation**: Focus on user-visible behavior
2. **Use Real Dependencies**: Avoid mocking core systems like LiveStore
3. **Clean Up Resources**: Always close stores, clear timers, etc.
4. **Test Edge Cases**: Include error conditions and boundary cases
5. **Keep Tests Fast**: All tests should complete quickly for good DX

## Current Test Architecture

### Test Setup
**File**: `test/setup.ts`
- Common test utilities
- Store creation helpers
- Cleanup functions

### Test Data
**Directory**: `test/fixtures/`
- Mock data and test helpers
- Reusable test scenarios
- Sample notebook states

### Configuration
**File**: `vitest.config.ts`
- Test environment setup
- TypeScript configuration
- Test coverage settings

## Coverage Goals

### Current Coverage ✅
- **Core Functionality**: 100% of critical paths tested
- **Collaboration**: Multi-user scenarios well covered
- **Edge Cases**: Comprehensive stress testing
- **Error Handling**: Recovery scenarios validated

### Monitoring
- All tests must pass for CI/CD
- Zero TypeScript errors required
- Performance regression detection
- Memory leak prevention

## Python Runtime Testing

**Note**: Python execution, AI features, and rich output rendering are now handled by the separate `@runt` packages.

For runtime testing, see:
- https://github.com/rgbkrk/runt - Python execution and AI integration
- `@runt/schema` - Shared event schema testing

The UI tests focus on:
- Notebook interface and collaboration
- LiveStore synchronization
- User experience and responsiveness
- Real-time editing without conflicts

---

**Next Steps:**
1. Maintain 100% test pass rate
2. Add tests for new UI features as they're developed  
3. Performance regression testing
4. Integration testing with `@runt` runtime components