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
  OpenAIClient,
} from "@runtimed/ai-core";
import type { AiModel } from "@runtimed/agent-core";
import { Scope, type ApiKey } from "../hooks/useApiKeys.js";

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
   * Create or get an API key for AI usage from the backend
   */
  private async getApiKeyForAI(): Promise<string | null> {
    try {
      // First, check if there are existing API keys with execution scope
      const listResponse = await fetch("/api/api-keys", {
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!listResponse.ok) {
        if (this.config.enableLogging) {
          console.warn("Failed to fetch API keys for AI usage");
        }
        return null;
      }

      const apiKeys: ApiKey[] = await listResponse.json();

      // Check if we have an existing valid key for AI execution
      const existingKey = apiKeys.find(
        (key) =>
          !key.revoked &&
          key.scopes.includes(Scope.RuntExecute) &&
          key.name?.includes("AI Runtime")
      );

      if (existingKey && this.config.enableLogging) {
        console.log("Using existing API key for AI:", existingKey.id);
      }

      // For now, use the access token directly as we can't get the key value
      // This is a limitation - we may need backend changes to support this properly
      return this.authToken;
    } catch (error) {
      if (this.config.enableLogging) {
        console.error("Error getting API key for AI:", error);
      }
      return null;
    }
  }

  /**
   * Setup Anaconda AI client with user's authentication if using Anaconda provider
   *
   * This method:
   * 1. Checks if VITE_AUTH_URI starts with https://auth.anaconda.com/
   * 2. Uses the user's access token for AI API authentication
   * 3. Registers the Anaconda AI client with the authentication
   * 4. Refreshes available models to include Anaconda-hosted models
   *
   * Falls back gracefully to Ollama-only if authentication fails.
   */
  private async setupAnacondaAI(): Promise<void> {
    if (!this.isUsingAnacondaProvider()) {
      return;
    }

    try {
      if (this.config.enableLogging) {
        console.log(
          "🔑 Setting up Anaconda AI client for authenticated user..."
        );
      }

      const apiKey = await this.getApiKeyForAI();

      if (apiKey) {
        this.registerAIClient("anaconda", { apiKey });

        if (this.config.enableLogging) {
          console.log(
            "✅ Anaconda AI client registered - refreshing available models..."
          );
        }

        // Refresh models after registering the authenticated client
        await this.refreshModels();
      } else {
        if (this.config.enableLogging) {
          console.warn(
            "⚠️  Authentication failed for Anaconda AI - only Ollama models will be available"
          );
        }
      }
    } catch (error) {
      if (this.config.enableLogging) {
        console.error("❌ Failed to setup Anaconda AI client:", error);
        console.warn("Continuing with Ollama-only AI support...");
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
   * Setup all AI clients (Anaconda + any others)
   *
   * This is the main entry point that should be called during runtime startup.
   */
  public async setupAiClients(): Promise<void> {
    // Setup Anaconda AI client with user's authentication if needed
    await this.setupAnacondaAI();

    // If Anaconda setup didn't refresh models, do initial discovery
    if (
      this.config.discoverModelsOnSetup &&
      this.discoveredModels.length === 0
    ) {
      await this.performInitialModelDiscovery();
    }
  }

  /**
   * Register an AI client with the global registry
   *
   * @param provider - AI provider name ("anaconda", "openai", etc.)
   * @param config - Configuration object with apiKey and other settings
   */
  public registerAIClient(
    provider: "anaconda" | "openai",
    config: { apiKey: string; [key: string]: any }
  ): void {
    switch (provider) {
      case "anaconda":
        aiRegistry.register(provider, () => new AnacondaAIClient(config));
        break;
      case "openai":
        aiRegistry.register(provider, () => new OpenAIClient(config));
        break;
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }

    if (this.config.enableLogging) {
      console.log(`🔗 Registered ${provider} AI client`);
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
