# Runtime Registry System

A clean, extensible runtime management system for Anode that replaces the hardcoded `HtmlRuntimeManager` with a registry-based architecture supporting multiple runtime types.

## Overview

The Runtime Registry system provides a unified interface for managing different types of code execution runtimes in Anode notebooks. It supports local browser-based runtimes (like HTML rendering) and remote external runtimes (like Python agents).

## Architecture

### Core Components

```
Runtime Registry System
├── Types & Interfaces (types.ts)
├── Base Runtime Class (BaseRuntime.ts)
├── Runtime Registry (RuntimeRegistry.ts)
├── Runtime Factory (RuntimeFactory.ts)
├── React Integration (RuntimeRegistryProvider.tsx)
├── Runtime Implementations
│   ├── HTML Runtime (HtmlRuntime.ts)
│   ├── Pyodide Runtime (placeholder)
│   └── External Runtime (placeholder)
└── UI Components
    ├── Runtime Panel V2 (RuntimePanelV2.tsx)
    └── Compatibility Wrapper (RuntimeRegistryWrapper.tsx)
```

### Key Abstractions

- **Runtime**: Base interface for all execution environments
- **LocalRuntime**: Browser-based runtimes (HTML, Pyodide)
- **RemoteRuntime**: External process runtimes (Python agents)
- **RuntimeRegistry**: Central registry managing runtime lifecycle
- **RuntimeFactory**: Creates and configures runtime instances

## Current Implementation Status

### ✅ Completed

- **Core Registry System**: Full runtime registration, lifecycle management
- **HTML Runtime**: Complete browser-based HTML rendering implementation
- **React Integration**: Hooks and providers for component integration
- **Factory System**: Automatic runtime creation and registration
- **Type Safety**: Complete TypeScript interfaces and implementations
- **Backwards Compatibility**: Drop-in replacement for existing `HtmlRuntimeManager`
- **Error Handling**: Centralized error management and state tracking
- **UI Components**: New RuntimePanelV2 with support for multiple runtime types

### ⏳ Placeholders (Future Implementation)

- **Pyodide Runtime**: Python-in-browser execution (marked as "coming soon")
- **External Runtime**: Enhanced external agent management
- **Runtime Health Monitoring**: Automatic ping/health checks for remote runtimes
- **Runtime Orchestration**: Advanced scheduling and resource management

## Quick Start

### Basic Usage

```tsx
import { RuntimeRegistryWrapper } from "@/runtime/registry";

// Drop-in replacement for HtmlRuntimeManager
<RuntimeRegistryWrapper notebookId={notebookId}>
  <NotebookContent />
</RuntimeRegistryWrapper>;
```

### Using Registry Hooks

```tsx
import { useRuntimeRegistry, useRuntimeOperations } from "@/runtime/registry";

const MyComponent = () => {
  const { availableRuntimes, activeRuntime } = useRuntimeRegistry();
  const { startRuntime, stopRuntime } = useRuntimeOperations();

  return (
    <div>
      {availableRuntimes.map((runtime) => (
        <button
          key={runtime.metadata.id}
          onClick={() => startRuntime(runtime.metadata.id, notebookId)}
        >
          Start {runtime.metadata.name}
        </button>
      ))}
    </div>
  );
};
```

### New Runtime Panel

```tsx
import { RuntimePanelV2 } from "@/components/notebook/sidebar-panels/RuntimePanelV2";

// Automatically shows all available runtimes with dynamic UI
<RuntimePanelV2 notebook={notebook} />;
```

## Runtime Types

### HTML Runtime (`html`)

- **Status**: ✅ Complete
- **Description**: Browser-based HTML rendering
- **Capabilities**: HTML rendering, immediate execution
- **Priority**: 100 (highest)

### Pyodide Runtime (`pyodide`)

- **Status**: ⏳ Placeholder
- **Description**: Python execution in browser via Pyodide
- **Capabilities**: Python code, scientific computing
- **Priority**: 90

### External Runtime (`external`)

- **Status**: ⏳ Placeholder
- **Description**: External Python agent processes
- **Capabilities**: Full Python, AI tools, SQL execution
- **Priority**: 80

## Configuration

### Registry Configuration

```tsx
<RuntimeRegistryProvider config={{
  maxConcurrentRuntimes: 1,              // One runtime per notebook
  allowMultipleRuntimesOfSameType: false,
  defaultRuntimeType: 'html',
}}>
```

### Factory Setup

```tsx
const factory = createRuntimeFactory({
  store: liveStoreInstance,
  userId: authenticatedUserId,
  registryConfig: {
    maxConcurrentRuntimes: 1,
    runtimeConfigs: {
      html: { maxExecutionTime: 30000 },
    },
  },
});
```

## API Reference

### Registry Hooks

#### `useRuntimeRegistry()`

```tsx
const {
  availableRuntimes, // Runtime[] - All registered runtimes
  activeRuntimes, // Runtime[] - Currently running runtimes
  activeRuntime, // Runtime | undefined - Primary active runtime
  canStartRuntime, // () => boolean - Can start new runtime
} = useRuntimeRegistry();
```

#### `useRuntimeOperations()`

```tsx
const {
  startRuntime, // (id: string, notebookId: string) => Promise<void>
  stopRuntime, // (id: string) => Promise<void>
  stopAllRuntimes, // () => Promise<void>
  isLoading, // boolean - Operation in progress
  error, // string | null - Last error
} = useRuntimeOperations();
```

#### `useRuntimesByType(type)`

```tsx
const htmlRuntimes = useRuntimesByType("html");
const activeHtml = useActiveRuntimeOfType("html");
const runtimeState = useRuntimeState("html-runtime");
```

### Runtime Interface

```tsx
interface Runtime {
  readonly metadata: RuntimeMetadata;
  readonly capabilities: RuntimeCapabilities;

  getState(): RuntimeState;
  getConfiguration(): RuntimeConfiguration;

  start(notebookId: string): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
}
```

## Backwards Compatibility

### Option 1: Direct Replacement

```tsx
// Replace this import:
import { HtmlRuntimeManager } from "@/runtime/managers/HtmlRuntimeManager";

// With this:
import { RuntimeRegistryWrapper as HtmlRuntimeManager } from "@/runtime/registry";
```

### Option 2: Compatibility Hook

```tsx
import { useHtmlRuntime } from "@/runtime/registry";

// Same interface as the old hook
const { runtimeState, startRuntime, stopRuntime } = useHtmlRuntime();
```

## Benefits

### Over Previous System

- **Extensible**: Easy to add new runtime types
- **Type Safe**: Full TypeScript support throughout
- **Testable**: Mockable interfaces and dependency injection
- **Maintainable**: Clean separation of concerns
- **Scalable**: Handles multiple concurrent runtimes
- **User Friendly**: Better error handling and loading states

### Architecture Benefits

- **Single Responsibility**: Each component has a clear purpose
- **Open/Closed Principle**: Easy to extend, hard to break
- **Dependency Inversion**: Components depend on abstractions
- **Interface Segregation**: Clean, focused interfaces

## Migration Guide

See [MIGRATION.md](./MIGRATION.md) for detailed migration instructions from the old `HtmlRuntimeManager` system.

## Development

### Adding New Runtime Types

1. **Implement Runtime Class**:

```tsx
class MyRuntime extends BaseRuntime {
  protected async doStart(notebookId: string) {
    // Implementation
  }

  protected async doStop() {
    // Implementation
  }
}
```

2. **Register in Factory**:

```tsx
// RuntimeFactory.ts
case 'my-type':
  return new MyRuntime(config);
```

3. **Runtime appears automatically in UI**

### Testing

```bash
# Run registry system tests
pnpm test src/runtime/registry

# Type check
pnpm type-check

# Integration test with UI
pnpm test RuntimePanelV2
```

## File Structure

```
src/runtime/registry/
├── index.ts                     # Main exports
├── types.ts                     # Core interfaces
├── BaseRuntime.ts               # Abstract base class
├── RuntimeRegistry.ts           # Core registry implementation
├── RuntimeFactory.ts            # Runtime creation and setup
├── RuntimeRegistryProvider.tsx  # React context and hooks
├── RuntimeRegistryWrapper.tsx   # Backwards compatibility
├── useHtmlRuntimeCompat.ts      # Legacy hook compatibility
└── HtmlRuntime.ts              # HTML runtime implementation
```

## Future Enhancements

- **Runtime Templates**: Pre-configured runtime setups
- **Runtime Plugins**: Extension system for runtime capabilities
- **Performance Monitoring**: Runtime execution metrics
- **Resource Limits**: Memory and CPU constraints
- **Runtime Snapshots**: Save/restore runtime state
- **Multi-notebook Runtimes**: Shared runtime instances

## Contributing

When adding new runtime types:

1. Extend `BaseRuntime` class
2. Implement required abstract methods
3. Add to `RuntimeFactory`
4. Update UI components if needed
5. Add tests for new functionality
6. Update documentation

For questions or contributions, see the main Anode repository.
