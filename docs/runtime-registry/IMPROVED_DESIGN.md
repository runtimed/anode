# Improved Runtime Registry Design Using @agent-core

## Overview

This document outlines an improved runtime registry design that properly leverages the mature `@agent-core` package instead of reimplementing runtime management from scratch. The current registry system has architectural issues that can be solved by building on the proven foundations of `RuntimeAgent`, `RuntimeConfig`, and LiveStore integration patterns.

## Problems with Current Registry System

### 1. **Duplicate Abstractions**
- **Current**: Custom `BaseRuntime` class with inheritance hierarchy
- **Problem**: Reimplements lifecycle management, state tracking, configuration
- **Solution**: Use `RuntimeAgent` as the foundation with composition

### 2. **Poor LiveStore Integration**
- **Current**: Generic `LiveStore` interface with basic `commit()` and `query()`
- **Problem**: Doesn't use event-sourcing patterns, materialized tables, reactive queries
- **Solution**: Leverage `@runtimed/schema` events and materialized runtime sessions

### 3. **Configuration Management**
- **Current**: Custom `RuntimeConfiguration` interface
- **Problem**: Doesn't validate required fields, no artifact support, no auth handling
- **Solution**: Use `RuntimeConfig` and `RuntimeAgentOptions` from `@agent-core`

### 4. **Missing Advanced Features**
- **Current**: Basic start/stop with text output
- **Problem**: No artifact upload, no streaming outputs, no tool calling
- **Solution**: Full `ExecutionContext` with artifact client integration

## Improved Architecture

### Core Design Principles

1. **Composition over Inheritance**: Runtime types are configurations of `RuntimeAgent`, not subclasses
2. **Event Sourcing**: All runtime state flows through LiveStore events
3. **Dependency Injection**: Runtime capabilities injected via adapters and handlers
4. **Type Safety**: Full TypeScript integration with `@runtimed/schema`

### Architecture Overview

```
Improved Runtime Registry
├── RuntimeAgentRegistry (singleton)
│   ├── Maps notebook → RuntimeAgent instances
│   ├── Handles agent lifecycle
│   └── Subscribes to runtime session events
├── RuntimeAgentFactory
│   ├── Creates RuntimeAgent with proper config
│   ├── Injects execution handlers by type
│   └── Sets up adapters and artifact clients
├── Execution Handlers (by type)
│   ├── HtmlExecutionHandler
│   ├── PyodideExecutionHandler (future)
│   └── RemoteAgentHandler (for external agents)
└── React Integration
    ├── useRuntimeAgent(notebookId)
    ├── useRuntimeAgentFactory()
    └── RuntimeAgentProvider
```

## Implementation Plan

### Phase 1: Foundation Types

```typescript
// src/runtime/agent-registry/types.ts

import type {
  RuntimeAgent,
  RuntimeConfig,
  ExecutionHandler,
  RuntimeCapabilities,
  RuntimeAgentOptions,
} from "@runtimed/agent-core";

export type RuntimeType = "html" | "pyodide" | "external";

export interface RuntimeTypeConfig {
  type: RuntimeType;
  displayName: string;
  description: string;
  icon: string;
  capabilities: RuntimeCapabilities;
  priority: number;
  isAvailable: boolean;
  executionHandler: ExecutionHandler;
}

export interface RuntimeAgentRegistryConfig {
  maxConcurrentAgents?: number;
  defaultRuntimeType?: RuntimeType;
  syncUrl?: string;
  artifactServiceUrl?: string;
}
```

### Phase 2: Runtime Agent Registry

```typescript
// src/runtime/agent-registry/RuntimeAgentRegistry.ts

import { RuntimeAgent, RuntimeConfig } from "@runtimed/agent-core";
import { queryDb, tables } from "@runtimed/schema";

export class RuntimeAgentRegistry {
  private agents = new Map<string, RuntimeAgent>();
  private typeConfigs = new Map<RuntimeType, RuntimeTypeConfig>();
  
  // Register runtime types (HTML, Python, etc.)
  registerRuntimeType(config: RuntimeTypeConfig): void {
    this.typeConfigs.set(config.type, config);
  }
  
  // Get or create RuntimeAgent for a notebook
  async getOrCreateAgent(
    notebookId: string, 
    runtimeType: RuntimeType,
    options: Partial<RuntimeAgentOptions>
  ): Promise<RuntimeAgent> {
    
    const existingAgent = this.agents.get(notebookId);
    if (existingAgent && !existingAgent.isShuttingDown) {
      return existingAgent;
    }
    
    const typeConfig = this.typeConfigs.get(runtimeType);
    if (!typeConfig) {
      throw new Error(`Runtime type ${runtimeType} not registered`);
    }
    
    // Create RuntimeConfig using @agent-core
    const config = new RuntimeConfig({
      runtimeId: `${runtimeType}-${crypto.randomUUID()}`,
      runtimeType,
      capabilities: typeConfig.capabilities,
      notebookId,
      ...options,
    });
    
    // Create RuntimeAgent with execution handler
    const agent = new RuntimeAgent(config, typeConfig.capabilities);
    agent.onExecution(typeConfig.executionHandler);
    
    // Store and start
    this.agents.set(notebookId, agent);
    await agent.start();
    
    // Clean up when agent shuts down
    agent.onShutdown(() => {
      this.agents.delete(notebookId);
    });
    
    return agent;
  }
  
  // Get active agent for notebook
  getAgent(notebookId: string): RuntimeAgent | undefined {
    return this.agents.get(notebookId);
  }
  
  // Get all available runtime types
  getAvailableTypes(): RuntimeTypeConfig[] {
    return Array.from(this.typeConfigs.values())
      .filter(config => config.isAvailable)
      .sort((a, b) => b.priority - a.priority);
  }
  
  // Subscribe to runtime session changes via LiveStore
  subscribeToRuntimeSessions(
    store: Store, 
    callback: (sessions: RuntimeSessionData[]) => void
  ): () => void {
    const query = queryDb(
      tables.runtimeSessions.select().where({ isActive: true })
    );
    
    return store.subscribe(query, {
      onUpdate: callback
    });
  }
}
```

### Phase 3: Execution Handlers

```typescript
// src/runtime/agent-registry/handlers/HtmlExecutionHandler.ts

import type { ExecutionHandler, ExecutionContext } from "@runtimed/agent-core";

export const createHtmlExecutionHandler = (): ExecutionHandler => {
  return async (context: ExecutionContext) => {
    const { cell } = context;
    
    // Clear previous outputs
    context.clear();
    
    if (cell.cellType !== "code" || cell.language !== "html") {
      return {
        success: false,
        error: "HTML handler only supports HTML code cells",
      };
    }
    
    try {
      // Emit HTML output using context.display()
      await context.display({
        "text/html": cell.source,
        "text/plain": cell.source,
      });
      
      return { success: true };
    } catch (error) {
      context.error(
        "HTMLError", 
        error instanceof Error ? error.message : String(error),
        []
      );
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };
};
```

### Phase 4: Factory Setup

```typescript
// src/runtime/agent-registry/RuntimeAgentFactory.ts

import { RuntimeAgentRegistry } from "./RuntimeAgentRegistry";
import { createHtmlExecutionHandler } from "./handlers/HtmlExecutionHandler";
import type { Store } from "@runtimed/schema";

export class RuntimeAgentFactory {
  private registry = new RuntimeAgentRegistry();
  
  constructor(
    private store: Store,
    private userId: string,
    private authToken: string,
    private syncUrl: string = "wss://app.runt.run"
  ) {
    this.setupDefaultRuntimeTypes();
  }
  
  private setupDefaultRuntimeTypes(): void {
    // Register HTML runtime
    this.registry.registerRuntimeType({
      type: "html",
      displayName: "HTML Renderer",
      description: "Render HTML content directly",
      icon: "🌐",
      capabilities: {
        canExecuteCode: true,
        canExecuteSql: false,
        canExecuteAi: false,
      },
      priority: 100,
      isAvailable: true,
      executionHandler: createHtmlExecutionHandler(),
    });
    
    // Register Python runtime (external)
    this.registry.registerRuntimeType({
      type: "external",
      displayName: "Python Agent",
      description: "Full Python + AI capabilities",
      icon: "🐍",
      capabilities: {
        canExecuteCode: true,
        canExecuteSql: true,
        canExecuteAi: true,
        availableAiModels: [
          {
            name: "gpt-4o-mini",
            displayName: "GPT-4o Mini",
            provider: "openai",
            capabilities: ["completion", "tools", "vision"],
          }
        ],
      },
      priority: 90,
      isAvailable: true,
      executionHandler: this.createExternalAgentHandler(),
    });
  }
  
  private createExternalAgentHandler(): ExecutionHandler {
    // For external agents, the ExecutionHandler is mostly a no-op
    // The actual execution happens in the external process
    return async (context: ExecutionContext) => {
      // External agents handle execution through LiveStore events
      // This handler just marks the execution as delegated
      return { success: true };
    };
  }
  
  async createRuntimeAgent(
    notebookId: string,
    runtimeType: RuntimeType
  ): Promise<RuntimeAgent> {
    return this.registry.getOrCreateAgent(notebookId, runtimeType, {
      syncUrl: this.syncUrl,
      authToken: this.authToken,
      userId: this.userId,
      adapter: this.store.adapter, // Use store's adapter
    });
  }
  
  getRegistry(): RuntimeAgentRegistry {
    return this.registry;
  }
}
```

### Phase 5: React Integration

```typescript
// src/runtime/agent-registry/RuntimeAgentProvider.tsx

import { createContext, useContext, useEffect, useState } from "react";
import { useStore } from "@livestore/react";
import { RuntimeAgentFactory } from "./RuntimeAgentFactory";
import type { RuntimeAgent } from "@runtimed/agent-core";

interface RuntimeAgentContextValue {
  factory: RuntimeAgentFactory | null;
  getAgent: (notebookId: string, runtimeType: RuntimeType) => Promise<RuntimeAgent>;
  availableTypes: RuntimeTypeConfig[];
}

const RuntimeAgentContext = createContext<RuntimeAgentContextValue | null>(null);

export function RuntimeAgentProvider({ 
  children, 
  userId, 
  authToken 
}: {
  children: React.ReactNode;
  userId: string;
  authToken: string;
}) {
  const { store } = useStore();
  const [factory, setFactory] = useState<RuntimeAgentFactory | null>(null);
  
  useEffect(() => {
    if (store) {
      const newFactory = new RuntimeAgentFactory(store, userId, authToken);
      setFactory(newFactory);
    }
  }, [store, userId, authToken]);
  
  const contextValue: RuntimeAgentContextValue = {
    factory,
    getAgent: async (notebookId: string, runtimeType: RuntimeType) => {
      if (!factory) throw new Error("Factory not initialized");
      return factory.createRuntimeAgent(notebookId, runtimeType);
    },
    availableTypes: factory?.getRegistry().getAvailableTypes() ?? [],
  };
  
  return (
    <RuntimeAgentContext.Provider value={contextValue}>
      {children}
    </RuntimeAgentContext.Provider>
  );
}

export function useRuntimeAgent(notebookId: string) {
  const context = useContext(RuntimeAgentContext);
  if (!context) throw new Error("useRuntimeAgent must be used within RuntimeAgentProvider");
  
  const [agent, setAgent] = useState<RuntimeAgent | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  
  const startAgent = async (runtimeType: RuntimeType) => {
    if (!context.factory) return;
    
    setIsStarting(true);
    try {
      const newAgent = await context.getAgent(notebookId, runtimeType);
      setAgent(newAgent);
    } finally {
      setIsStarting(false);
    }
  };
  
  const stopAgent = async () => {
    if (agent) {
      await agent.shutdown();
      setAgent(null);
    }
  };
  
  return {
    agent,
    isStarting,
    availableTypes: context.availableTypes,
    startAgent,
    stopAgent,
  };
}
```

## Migration Strategy

### Step 1: Parallel Implementation
- Implement new system alongside current registry
- Use feature flag to switch between implementations
- Maintain current API surface for backwards compatibility

### Step 2: Component Migration  
- Update `RuntimeHelper` to use new `useRuntimeAgent` hook
- Replace registry-based components with agent-based ones
- Test thoroughly with existing notebooks

### Step 3: Cleanup
- Remove old registry system once new system is stable
- Update documentation and examples
- Remove feature flags

## Benefits of New Design

### Technical Benefits
1. **Proven Foundation**: Builds on battle-tested `RuntimeAgent` architecture
2. **Event Sourcing**: Proper LiveStore integration with materialized state
3. **Artifact Support**: Built-in large output handling via artifact service
4. **Type Safety**: Full integration with `@runtimed/schema` types
5. **Streaming Outputs**: Real-time output emission during execution
6. **Tool Support**: Framework for AI tool calling and external integrations

### Developer Experience  
1. **Simpler Model**: Runtime types are just configuration + execution handler
2. **Better Testing**: ExecutionHandlers are pure functions, easy to test
3. **Clear Separation**: UI logic separated from runtime management
4. **Composition**: Easy to add new capabilities without inheritance
5. **Debugging**: Rich logging and state tracking from `@agent-core`

### Production Benefits
1. **Reliability**: Proven error handling and recovery patterns
2. **Observability**: Built-in OpenTelemetry integration for monitoring
3. **Performance**: Efficient event sourcing and reactive updates
4. **Scalability**: Proper resource management and cleanup
5. **Security**: Validated configuration and secure defaults

## Implementation Timeline

- **Week 1**: Core types and RuntimeAgentRegistry  
- **Week 2**: HTML execution handler and factory setup
- **Week 3**: React integration and hooks
- **Week 4**: Migration strategy and backwards compatibility
- **Week 5**: Testing and documentation
- **Week 6**: Production deployment and monitoring

This design leverages the mature `@agent-core` foundation while providing the registry abstraction needed for UI components. The result is a more robust, maintainable, and feature-rich runtime system.