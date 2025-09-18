/**
 * Practical Example Implementation: Improved Runtime Registry using @agent-core
 *
 * This file demonstrates how to build a runtime registry system that properly
 * leverages the mature RuntimeAgent foundation instead of reinventing runtime management.
 */

import {
  RuntimeAgent,
  RuntimeConfig,
  logger,
  type ExecutionHandler,
  type ExecutionContext,
  type RuntimeCapabilities,
  type RuntimeAgentOptions,
} from "@runtimed/agent-core";

import {
  queryDb,
  tables,
  events,
  type Store,
  type RuntimeSessionData
} from "@runtimed/schema";

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export type RuntimeType = "html" | "python" | "javascript";

export interface RuntimeTypeDefinition {
  type: RuntimeType;
  displayName: string;
  description: string;
  icon: string;
  capabilities: RuntimeCapabilities;
  priority: number;
  isAvailable: boolean;
  createExecutionHandler: () => ExecutionHandler;
}

export interface AgentRegistryConfig {
  syncUrl: string;
  authToken: string;
  userId: string;
  maxConcurrentAgents?: number;
}

// =============================================================================
// EXECUTION HANDLERS - Business logic for different runtime types
// =============================================================================

/**
 * HTML Execution Handler - Renders HTML directly in notebook outputs
 */
export const createHtmlExecutionHandler = (): ExecutionHandler => {
  return async (context: ExecutionContext) => {
    const { cell } = context;

    // Validate cell type
    if (cell.cellType !== "code") {
      return {
        success: false,
        error: "HTML handler only supports code cells",
      };
    }

    try {
      context.clear(); // Clear previous outputs

      // Emit HTML output using the rich ExecutionContext API
      await context.display({
        "text/html": cell.source,
        "text/plain": `HTML: ${cell.source.slice(0, 100)}...`,
      });

      logger.debug("HTML cell executed", {
        cellId: cell.id,
        sourceLength: cell.source.length
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      context.error("HTMLRenderError", errorMessage, []);

      return {
        success: false,
        error: errorMessage,
      };
    }
  };
};

/**
 * JavaScript Execution Handler - Evaluates JavaScript in a sandbox
 */
export const createJavaScriptExecutionHandler = (): ExecutionHandler => {
  return async (context: ExecutionContext) => {
    const { cell } = context;

    if (cell.cellType !== "code") {
      return { success: false, error: "JavaScript handler only supports code cells" };
    }

    try {
      context.clear();

      // Create sandboxed execution environment
      const sandbox = {
        console: {
          log: (...args: any[]) => context.stdout(args.join(" ") + "\n"),
          error: (...args: any[]) => context.stderr(args.join(" ") + "\n"),
        },
        // Add safe globals here
      };

      // Execute JavaScript with limited scope
      const func = new Function(
        ...Object.keys(sandbox),
        `"use strict"; return (async () => { ${cell.source} })()`
      );

      const result = await func(...Object.values(sandbox));

      if (result !== undefined) {
        await context.result({
          "application/json": result,
          "text/plain": String(result),
        });
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      context.error("JavaScriptError", errorMessage, []);
      return { success: false, error: errorMessage };
    }
  };
};

/**
 * External Python Handler - Delegates to external Python runtime agent
 * This handler is mostly a pass-through since the actual execution
 * happens in the external process via LiveStore events
 */
export const createPythonExecutionHandler = (): ExecutionHandler => {
  return async (context: ExecutionContext) => {
    // For external agents, the RuntimeAgent framework handles execution
    // through LiveStore event sourcing. This handler just indicates success.
    // The real Python execution happens in the external process.

    logger.debug("Python execution delegated to external agent", {
      cellId: context.cell.id,
      sessionId: context.sessionId,
    });

    return { success: true };
  };
};

// =============================================================================
// RUNTIME AGENT REGISTRY - Core registry managing RuntimeAgent instances
// =============================================================================

export class RuntimeAgentRegistry {
  private agents = new Map<string, RuntimeAgent>();
  private runtimeTypes = new Map<RuntimeType, RuntimeTypeDefinition>();
  private subscriptions: (() => void)[] = [];

  constructor(
    private store: Store,
    private config: AgentRegistryConfig
  ) {
    this.setupDefaultRuntimeTypes();
    this.setupEventSubscriptions();
  }

  private setupDefaultRuntimeTypes(): void {
    // Register HTML runtime
    this.registerRuntimeType({
      type: "html",
      displayName: "HTML Renderer",
      description: "Render HTML content directly in the browser",
      icon: "🌐",
      capabilities: {
        canExecuteCode: true,
        canExecuteSql: false,
        canExecuteAi: false,
      },
      priority: 100, // Highest priority
      isAvailable: true,
      createExecutionHandler: createHtmlExecutionHandler,
    });

    // Register JavaScript runtime
    this.registerRuntimeType({
      type: "javascript",
      displayName: "JavaScript Engine",
      description: "Execute JavaScript in a sandboxed environment",
      icon: "🟨",
      capabilities: {
        canExecuteCode: true,
        canExecuteSql: false,
        canExecuteAi: false,
      },
      priority: 90,
      isAvailable: true,
      createExecutionHandler: createJavaScriptExecutionHandler,
    });

    // Register external Python runtime
    this.registerRuntimeType({
      type: "python",
      displayName: "Python Agent",
      description: "Full Python with AI capabilities via external agent",
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
          },
        ],
      },
      priority: 80,
      isAvailable: true,
      createExecutionHandler: createPythonExecutionHandler,
    });
  }

  private setupEventSubscriptions(): void {
    // Monitor runtime sessions to clean up terminated agents
    const runtimeSessionQuery = queryDb(
      tables.runtimeSessions.select()
    );

    const unsubscribe = this.store.subscribe(runtimeSessionQuery, {
      onUpdate: (sessions: readonly RuntimeSessionData[]) => {
        this.handleRuntimeSessionChanges(sessions);
      },
    });

    this.subscriptions.push(unsubscribe);
  }

  private handleRuntimeSessionChanges(sessions: readonly RuntimeSessionData[]): void {
    // Clean up agents for terminated sessions
    for (const [notebookId, agent] of this.agents.entries()) {
      const hasActiveSession = sessions.some(
        session => session.isActive &&
        this.store.metadata?.storeId === notebookId // Notebook maps to storeId
      );

      if (!hasActiveSession && !agent.isShuttingDown) {
        logger.info("Cleaning up agent for terminated session", { notebookId });
        agent.shutdown().catch(error => {
          logger.error("Error shutting down agent", error, { notebookId });
        });
        this.agents.delete(notebookId);
      }
    }
  }

  registerRuntimeType(definition: RuntimeTypeDefinition): void {
    this.runtimeTypes.set(definition.type, definition);
    logger.info("Registered runtime type", {
      type: definition.type,
      displayName: definition.displayName
    });
  }

  getAvailableRuntimeTypes(): RuntimeTypeDefinition[] {
    return Array.from(this.runtimeTypes.values())
      .filter(def => def.isAvailable)
      .sort((a, b) => b.priority - a.priority);
  }

  getRuntimeType(type: RuntimeType): RuntimeTypeDefinition | undefined {
    return this.runtimeTypes.get(type);
  }

  async getOrCreateAgent(
    notebookId: string,
    runtimeType: RuntimeType
  ): Promise<RuntimeAgent> {
    // Check for existing agent
    const existingAgent = this.agents.get(notebookId);
    if (existingAgent && !existingAgent.isShuttingDown) {
      return existingAgent;
    }

    // Get runtime type definition
    const typeDefinition = this.runtimeTypes.get(runtimeType);
    if (!typeDefinition) {
      throw new Error(`Unknown runtime type: ${runtimeType}`);
    }

    if (!typeDefinition.isAvailable) {
      throw new Error(`Runtime type ${runtimeType} is not available`);
    }

    // Create RuntimeConfig using @agent-core
    const agentOptions: RuntimeAgentOptions = {
      runtimeId: `${runtimeType}-${crypto.randomUUID()}`,
      runtimeType,
      capabilities: typeDefinition.capabilities,
      syncUrl: this.config.syncUrl,
      authToken: this.config.authToken,
      notebookId,
      userId: this.config.userId,
      adapter: this.store.adapter, // Use store's adapter for LiveStore integration
    };

    const config = new RuntimeConfig(agentOptions);

    // Create RuntimeAgent with execution handler
    const agent = new RuntimeAgent(
      config,
      typeDefinition.capabilities,
      {
        onStartup: async () => {
          logger.info("Runtime agent starting", {
            notebookId,
            runtimeType,
            runtimeId: config.runtimeId,
          });
        },
        onConnected: async () => {
          logger.info("Runtime agent connected", {
            notebookId,
            runtimeType,
          });
        },
        onShutdown: async () => {
          logger.info("Runtime agent shutting down", {
            notebookId,
            runtimeType,
          });
          this.agents.delete(notebookId);
        },
        onExecutionError: async (error, context) => {
          logger.error("Execution error", error, {
            cellId: context.cell.id,
            notebookId,
            runtimeType,
          });
        },
      }
    );

    // Register execution handler
    const executionHandler = typeDefinition.createExecutionHandler();
    agent.onExecution(executionHandler);

    // Store agent and start it
    this.agents.set(notebookId, agent);

    try {
      await agent.start();
      logger.info("Runtime agent started successfully", {
        notebookId,
        runtimeType,
        sessionId: config.sessionId,
      });
      return agent;
    } catch (error) {
      // Clean up on failure
      this.agents.delete(notebookId);
      logger.error("Failed to start runtime agent", error, {
        notebookId,
        runtimeType,
      });
      throw error;
    }
  }

  getAgent(notebookId: string): RuntimeAgent | undefined {
    return this.agents.get(notebookId);
  }

  async shutdownAgent(notebookId: string): Promise<void> {
    const agent = this.agents.get(notebookId);
    if (agent) {
      await agent.shutdown();
      this.agents.delete(notebookId);
    }
  }

  async shutdownAll(): Promise<void> {
    const shutdownPromises = Array.from(this.agents.values()).map(agent =>
      agent.shutdown().catch(error => {
        logger.error("Error shutting down agent", error);
      })
    );

    await Promise.all(shutdownPromises);
    this.agents.clear();

    // Clean up subscriptions
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];
  }

  // Get runtime health information
  getRegistryStatus() {
    const activeAgents = Array.from(this.agents.entries()).map(([notebookId, agent]) => ({
      notebookId,
      runtimeType: agent.config.runtimeType,
      sessionId: agent.config.sessionId,
      isActive: !agent.isShuttingDown,
    }));

    return {
      totalAgents: this.agents.size,
      availableTypes: this.getAvailableRuntimeTypes().map(def => def.type),
      activeAgents,
      registeredTypes: Array.from(this.runtimeTypes.keys()),
    };
  }
}

// =============================================================================
// FACTORY & SINGLETON MANAGEMENT
// =============================================================================

let registryInstance: RuntimeAgentRegistry | null = null;

export function createRuntimeAgentRegistry(
  store: Store,
  config: AgentRegistryConfig
): RuntimeAgentRegistry {
  if (registryInstance) {
    logger.warn("Runtime agent registry already exists, returning existing instance");
    return registryInstance;
  }

  registryInstance = new RuntimeAgentRegistry(store, config);
  return registryInstance;
}

export function getRuntimeAgentRegistry(): RuntimeAgentRegistry {
  if (!registryInstance) {
    throw new Error("Runtime agent registry not initialized. Call createRuntimeAgentRegistry first.");
  }
  return registryInstance;
}

// =============================================================================
// REACT HOOKS - Clean interface for UI components
// =============================================================================

import { useState, useEffect } from "react";
import { useStore } from "@livestore/react";

export function useRuntimeAgent(notebookId: string) {
  const { store } = useStore();
  const [agent, setAgent] = useState<RuntimeAgent | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registry = getRuntimeAgentRegistry();

  // Check for existing agent on mount
  useEffect(() => {
    const existingAgent = registry.getAgent(notebookId);
    if (existingAgent) {
      setAgent(existingAgent);
    }
  }, [notebookId, registry]);

  const startAgent = async (runtimeType: RuntimeType) => {
    setIsStarting(true);
    setError(null);

    try {
      const newAgent = await registry.getOrCreateAgent(notebookId, runtimeType);
      setAgent(newAgent);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      logger.error("Failed to start runtime agent", err, { notebookId, runtimeType });
    } finally {
      setIsStarting(false);
    }
  };

  const stopAgent = async () => {
    if (agent) {
      try {
        await registry.shutdownAgent(notebookId);
        setAgent(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        logger.error("Failed to stop runtime agent", err, { notebookId });
      }
    }
  };

  return {
    agent,
    isStarting,
    error,
    isActive: agent && !agent.isShuttingDown,
    availableTypes: registry.getAvailableRuntimeTypes(),
    startAgent,
    stopAgent,
  };
}

// =============================================================================
// EXAMPLE USAGE IN COMPONENTS
// =============================================================================

/*
// In a React component:

import { useRuntimeAgent } from "./runtime-agent-registry";

export function RuntimePanel({ notebookId }: { notebookId: string }) {
  const {
    agent,
    isStarting,
    error,
    isActive,
    availableTypes,
    startAgent,
    stopAgent
  } = useRuntimeAgent(notebookId);

  if (error) {
    return <div className="error">Runtime Error: {error}</div>;
  }

  if (isActive && agent) {
    return (
      <div className="runtime-active">
        <h3>🟢 {agent.config.runtimeType} Runtime Active</h3>
        <p>Session: {agent.config.sessionId.slice(-8)}</p>
        <button onClick={stopAgent}>Stop Runtime</button>
      </div>
    );
  }

  return (
    <div className="runtime-selector">
      <h3>Choose Runtime Type</h3>
      {availableTypes.map(type => (
        <button
          key={type.type}
          onClick={() => startAgent(type.type)}
          disabled={isStarting}
        >
          {type.icon} {type.displayName}
        </button>
      ))}
      {isStarting && <div>Starting runtime...</div>}
    </div>
  );
}

// In app setup:

import { createRuntimeAgentRegistry } from "./runtime-agent-registry";

function AppWithRuntimes() {
  const { store } = useStore();
  const auth = useAuth();

  useEffect(() => {
    if (store && auth.token) {
      createRuntimeAgentRegistry(store, {
        syncUrl: "wss://app.runt.run",
        authToken: auth.token,
        userId: auth.userId,
      });
    }
  }, [store, auth]);

  return <YourNotebookApp />;
}
*/

// =============================================================================
// KEY BENEFITS OF THIS DESIGN
// =============================================================================

/*
1. **Leverages @agent-core**: Uses proven RuntimeAgent, RuntimeConfig, ExecutionContext
2. **Event Sourcing**: Proper LiveStore integration with materialized state
3. **Composition**: Runtime types are just configuration + execution handlers
4. **Type Safety**: Full TypeScript integration with @runtimed/schema
5. **Testable**: ExecutionHandlers are pure functions, easy to unit test
6. **Extensible**: Easy to add new runtime types without changing core code
7. **Reliable**: Built-in error handling, logging, and cleanup from @agent-core
8. **Performance**: Efficient reactive updates and proper resource management
9. **Developer Experience**: Clean React hooks and simple component integration
10. **Production Ready**: Proven patterns for monitoring, debugging, and scaling
*/
