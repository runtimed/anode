/**
 * Runtime Factory
 *
 * Factory for creating and registering runtime instances.
 * Handles dependency injection and default runtime setup.
 */

import type { LiveStore } from "./types.js";
import { HtmlRuntime, type HtmlRuntimeConfig } from "./HtmlRuntime.js";
import { RuntimeRegistry, getRuntimeRegistry } from "./RuntimeRegistry.js";
import type {
  Runtime,
  RuntimeFactory as RuntimeFactoryInterface,
  RuntimeType,
  RuntimeConfiguration,
  RuntimeRegistryConfig,
  RemoteRuntime,
  RuntimeMetadata,
  RuntimeCapabilities,
} from "./types.js";
import { BaseRuntime } from "./BaseRuntime.js";

export interface RuntimeFactoryConfig {
  /** LiveStore instance for runtime state management */
  store: LiveStore;
  /** Authenticated user ID */
  userId: string;
  /** Registry configuration */
  registryConfig?: RuntimeRegistryConfig;
}

export class RuntimeFactory implements RuntimeFactoryInterface {
  private store: LiveStore;
  private userId: string;
  private registry: RuntimeRegistry;

  constructor(config: RuntimeFactoryConfig) {
    this.store = config.store;
    this.userId = config.userId;
    // Always use singleton registry instance to avoid conflicts
    this.registry = getRuntimeRegistry();

    // Apply configuration if provided
    if (config.registryConfig) {
      console.log(
        "ℹ️ Registry config provided but using existing singleton instance"
      );
    }
  }

  createRuntime(type: RuntimeType, config?: RuntimeConfiguration): Runtime {
    switch (type) {
      case "html":
        return this.createHtmlRuntime(config);

      case "pyodide":
        return this.createPyodideRuntime(config);

      case "external":
        return this.createExternalRuntime(config);

      default:
        throw new Error(`Unsupported runtime type: ${type}`);
    }
  }

  getSupportedTypes(): RuntimeType[] {
    return ["html", "pyodide", "external"];
  }

  private createHtmlRuntime(config?: RuntimeConfiguration): Runtime {
    const htmlConfig: HtmlRuntimeConfig = {
      store: this.store,
      userId: this.userId,
      ...config,
    };

    return new HtmlRuntime(htmlConfig);
  }

  private createPyodideRuntime(config?: RuntimeConfiguration): Runtime {
    // Pyodide runtime placeholder - will be implemented later
    const metadata: RuntimeMetadata = {
      id: "pyodide-runtime",
      name: "Pyodide Agent",
      description: "Python in the browser (coming soon)",
      icon: "🐍",
      type: "pyodide",
      version: "1.0.0",
      isLocal: true,
      isAvailable: false, // Not available yet
      priority: 90,
    };

    const capabilities: RuntimeCapabilities = {
      canExecuteCode: true,
      canExecuteSql: false,
      canExecuteAi: false,
      supportedLanguages: ["python"],
      supportsInterruption: true,
      supportsRestart: true,
    };

    return new PlaceholderRuntime(metadata, capabilities, config);
  }

  private createExternalRuntime(config?: RuntimeConfiguration): Runtime {
    const metadata: RuntimeMetadata = {
      id: "external-runtime",
      name: "External Agent",
      description: "Full Python + AI capabilities",
      icon: "🔌",
      type: "external",
      version: "1.0.0",
      isLocal: false,
      isAvailable: true,
      priority: 80,
    };

    const capabilities: RuntimeCapabilities = {
      canExecuteCode: true,
      canExecuteSql: true,
      canExecuteAi: true,
      supportedLanguages: ["python", "sql"],
      supportsInterruption: true,
      supportsRestart: true,
    };

    return new ExternalRuntime(metadata, capabilities, config);
  }

  /**
   * Set up default runtimes and register them with the registry
   */
  setupDefaultRuntimes(): void {
    console.log("🏭 Setting up default runtimes");

    try {
      // Create and register HTML runtime
      if (!this.registry.getRuntime("html-runtime")) {
        const htmlRuntime = this.createRuntime("html");
        this.registry.register(htmlRuntime);
        console.log("✅ HTML runtime registered");
      } else {
        console.log("ℹ️ HTML runtime already registered, skipping");
      }

      // Create and register Pyodide runtime (disabled for now)
      if (!this.registry.getRuntime("pyodide-runtime")) {
        const pyodideRuntime = this.createRuntime("pyodide");
        this.registry.register(pyodideRuntime);
        console.log("⏳ Pyodide runtime registered (disabled)");
      } else {
        console.log("ℹ️ Pyodide runtime already registered, skipping");
      }

      // Create and register External runtime
      if (!this.registry.getRuntime("external-runtime")) {
        const externalRuntime = this.createRuntime("external");
        this.registry.register(externalRuntime);
        console.log("✅ External runtime registered");
      } else {
        console.log("ℹ️ External runtime already registered, skipping");
      }
    } catch (error) {
      console.error("❌ Error setting up default runtimes:", error);
      throw error;
    }

    console.log("🎉 Default runtimes setup complete");
  }

  /**
   * Get the registry instance
   */
  getRegistry(): RuntimeRegistry {
    return this.registry;
  }

  /**
   * Create a factory instance and set up default runtimes
   * Uses singleton registry to prevent duplicate registrations
   */
  static createWithDefaults(config: RuntimeFactoryConfig): RuntimeFactory {
    const factory = new RuntimeFactory(config);

    // Only setup if runtimes aren't already registered
    const registry = factory.getRegistry();
    if (registry.getAvailableRuntimes().length === 0) {
      console.log("🏭 Setting up default runtimes for the first time");
      factory.setupDefaultRuntimes();
    } else {
      console.log("ℹ️ Default runtimes already exist, skipping setup");
    }

    return factory;
  }
}

/**
 * Placeholder runtime for runtimes that aren't implemented yet
 */
class PlaceholderRuntime extends BaseRuntime {
  protected async doStart(): Promise<void> {
    throw new Error(`${this.metadata.name} is not yet implemented`);
  }

  protected async doStop(): Promise<void> {
    // No-op for placeholder
  }

  getSetupInstructions(): string | null {
    return `${this.metadata.name} is coming soon!`;
  }
}

/**
 * External runtime implementation that tracks remote runtime sessions
 */
class ExternalRuntime extends BaseRuntime implements RemoteRuntime {
  public readonly metadata: RuntimeMetadata & { isLocal: false };

  constructor(
    metadata: RuntimeMetadata,
    capabilities: RuntimeCapabilities,
    config?: RuntimeConfiguration
  ) {
    super(metadata, capabilities, config);
    this.metadata = { ...metadata, isLocal: false };
  }

  protected async doStart(notebookId: string): Promise<void> {
    // External runtimes don't start directly - they connect via external processes
    // This method will be triggered when an external runtime connects
    console.log(
      `🔌 External runtime session started for notebook ${notebookId}`
    );
  }

  protected async doStop(): Promise<void> {
    // External runtimes are stopped by terminating the external process
    console.log("🔌 External runtime session stopped");
  }

  async ping(): Promise<boolean> {
    // TODO: Implement actual ping to external runtime
    // For now, check if there's an active session via LiveStore
    return false;
  }

  getSetupInstructions(): string {
    // TODO: Get this from runtime-command utility
    return `NOTEBOOK_ID=<notebook-id> RUNT_API_KEY=<your-key> deno run --allow-all jsr:@runt/pyodide-runtime-agent/src/mod.ts`;
  }

  getConnectionInfo() {
    // TODO: Implement connection info tracking
    return null;
  }
}

// Export factory creator helper
export const createRuntimeFactory = (
  config: RuntimeFactoryConfig
): RuntimeFactory => {
  return RuntimeFactory.createWithDefaults(config);
};
