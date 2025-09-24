/**
 * AI Client Manager
 *
 * Reusable utility for managing AI clients across different runtime agents.
 * Handles automatic Anaconda provider detection, authentication setup,
 * and model discovery for any runtime agent implementation.
 *
 * ## Usage
 *
 * ```typescript
 * const aiManager = new AiClientManager(config.authToken);
 * await aiManager.setupAiClients();
 * const models = aiManager.getDiscoveredModels();
 * ```
 */

import {
  discoverAvailableAiModels,
  aiRegistry,
  AnacondaAIClient,
} from "@runtimed/ai-core";
import type { AiModel } from "@runtimed/agent-core";

import { getAiSetupStatus } from "../auth/AiClientSetup.js";

/**
 * Configuration for AI client management
 */
export interface AiClientManagerConfig {
  /** Authentication token for API access */
  authToken: string;
  /** Whether to perform initial model discovery (default: true) */
  discoverModelsOnSetup?: boolean;
  /** Whether to log setup progress (default: true) */
  enableLogging?: boolean;
}

/**
 * AI Client Manager for runtime agents
 *
 * Provides centralized management of AI clients including:
 * - Anaconda provider detection and authentication
 * - Automatic client registration
 * - Model discovery and refresh
 * - Fallback to Ollama for offline capability
 */
export class AiClientManager {
  private authToken: string;
  private discoveredModels: AiModel[] = [];
  private config: Required<AiClientManagerConfig>;

  constructor(authTokenOrConfig: string | AiClientManagerConfig) {
    if (typeof authTokenOrConfig === "string") {
      this.config = {
        authToken: authTokenOrConfig,
        discoverModelsOnSetup: true,
        enableLogging: true,
      };
    } else {
      this.config = {
        discoverModelsOnSetup: true,
        enableLogging: true,
        ...authTokenOrConfig,
      };
    }

    this.authToken = this.config.authToken;
  }

  /**
   * Check if we're using the Anaconda provider by checking build-time environment
   */
  private isUsingAnacondaProvider(): boolean {
    const authUri = import.meta.env.VITE_AUTH_URI;
    return authUri?.startsWith("https://auth.anaconda.com/") ?? false;
  }

  /**
   * Register appropriate AI clients for the current environment
   */
  private async registerEnvironmentClients(): Promise<void> {
    if (this.config.enableLogging) {
      console.log("🔧 Registering environment-specific AI clients...");
    }
    if (this.isUsingAnacondaProvider()) {
      // Register Anaconda client with authentication
      if (this.config.enableLogging) {
        console.log("🔑 Registering Anaconda AI client...");
        console.log("🔍 Auth token available:", !!this.authToken);
        console.log("🔍 Auth token length:", this.authToken?.length || 0);
      }

      const authToken = this.authToken;
      if (!authToken) {
        if (this.config.enableLogging) {
          console.warn("⚠️  No auth token available for Anaconda client");
        }
        return;
      }

      aiRegistry.register("anaconda", () => {
        return new AnacondaAIClient({
          apiKey: authToken,
        });
      });

      if (this.config.enableLogging) {
        console.log("✅ Anaconda AI client registered");
        console.log("🔍 Available providers:", aiRegistry.getProviders());

        // Test if we can actually create the client
        try {
          const testClient = aiRegistry.createClient("anaconda");
          console.log("✅ Anaconda client creation test: SUCCESS");
          console.log("🔍 Client isReady check:", await testClient.isReady());
        } catch (error) {
          console.error("❌ Anaconda client creation test: FAILED", error);
        }
      }
    } else {
      // Development mode - Ollama is available by default
      if (this.config.enableLogging) {
        console.log("🔧 Development mode - using Ollama client");
        console.log("🔍 Available providers:", aiRegistry.getProviders());
      }
    }
  }

  /**
   * Perform initial AI model discovery with user feedback
   */
  private async performInitialModelDiscovery(): Promise<void> {
    try {
      if (this.config.enableLogging) {
        console.log("🔍 Discovering available AI models...");
      }

      this.discoveredModels = await discoverAvailableAiModels();

      if (this.discoveredModels.length === 0) {
        if (this.config.enableLogging) {
          console.warn(
            "⚠️  No AI models discovered - check if Ollama is running or API keys are configured"
          );
        }
      } else if (this.config.enableLogging) {
        const providers = [
          ...new Set(this.discoveredModels.map((m) => m.provider)),
        ];
        console.log(
          `✅ Discovered ${this.discoveredModels.length} AI model${this.discoveredModels.length === 1 ? "" : "s"} from providers: ${providers.join(", ")}`
        );
      }
    } catch (error) {
      if (this.config.enableLogging) {
        console.error("❌ Failed to discover AI models", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      this.discoveredModels = [];
    }
  }

  /**
   * Setup AI clients for the runtime agent
   *
   * Runtime agents are responsible for registering their own AI clients
   * based on the environment (Anaconda vs development).
   */
  public async setupAiClients(): Promise<void> {
    if (this.config.enableLogging) {
      console.log("🔧 Setting up AI clients for runtime environment");
    }

    // Runtime agents always register their own clients
    await this.registerEnvironmentClients();

    if (this.config.enableLogging) {
      console.log("🔍 Post-registration debug:");
      console.log("   Available providers:", aiRegistry.getProviders());
      console.log("   Environment status:", getAiSetupStatus());
    }

    // Perform initial model discovery after client registration
    if (this.config.discoverModelsOnSetup) {
      if (this.config.enableLogging) {
        console.log(
          "🔄 Performing model discovery after client registration..."
        );
      }
      await this.performInitialModelDiscovery();
    }
  }

  /**
   * Refresh available AI models after registering new clients
   *
   * This updates the discovered models list and should be called
   * after registering AI clients with API keys.
   */
  public async refreshModels(): Promise<void> {
    try {
      if (this.config.enableLogging) {
        console.log("🔄 Refreshing AI models after authentication setup...");
      }

      this.discoveredModels = await discoverAvailableAiModels();

      if (this.config.enableLogging) {
        const providers = [
          ...new Set(this.discoveredModels.map((m) => m.provider)),
        ];
        console.log(
          `✅ Models refreshed: ${this.discoveredModels.length} available from ${providers.join(", ")}`
        );
      }
    } catch (error) {
      if (this.config.enableLogging) {
        console.error("❌ Failed to refresh AI models", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Get the currently discovered AI models
   */
  public getDiscoveredModels(): AiModel[] {
    return [...this.discoveredModels];
  }

  /**
   * Check if any AI models are available
   */
  public hasModels(): boolean {
    return this.discoveredModels.length > 0;
  }

  /**
   * Get available providers
   */
  public getAvailableProviders(): string[] {
    return [...new Set(this.discoveredModels.map((m) => m.provider))];
  }

  /**
   * Check if a specific provider is available
   */
  public hasProvider(provider: string): boolean {
    return this.discoveredModels.some((m) => m.provider === provider);
  }
}
