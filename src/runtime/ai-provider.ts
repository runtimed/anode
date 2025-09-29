/**
 * AI Provider Registry for Browser Agents
 *
 * This module sets up AI providers that can be shared across all browser runtime agents.
 * It creates an AI client on page load based on environment variables and makes it
 * available globally for browser agents to reuse.
 *
 * Usage in Chrome DevTools:
 *   window.__RUNT_AI__.getProvider()
 *   window.__RUNT_AI__.getStatus()
 *   window.__RUNT_AI__.discoverModels()
 *   window.__RUNT_AI__.testConnection()
 *
 * Environment Variables:
 *   VITE_AI_PROVIDER - Which provider to use (anaconda, openai, groq, ollama)
 *   VITE_ANACONDA_API_KEY - API key for Anaconda AI
 *   VITE_OPENAI_API_KEY - API key for OpenAI
 *   VITE_GROQ_API_KEY - API key for Groq
 */

import {
  aiRegistry,
  AnacondaAIClient,
  OpenAIClient,
  GroqClient,
  RuntOllamaClient,
  type AiClient,
} from "@runtimed/ai-core";

import type { AiModel } from "@runtimed/agent-core";

// Global interface for console access
declare global {
  interface Window {
    __RUNT_AI__?: {
      getProvider: () => AiClient | null;
      getStatus: () => AIProviderStatus;
      discoverModels: () => Promise<AiModel[]>;
      testConnection: () => Promise<boolean>;
      configure: (provider: string, config: AIProviderConfig) => void;
      getAvailableProviders: () => string[];
      updateAuthToken: (token: string) => void;
      setAuthContext: (context: any) => void;
    };
  }
}

interface AIProviderStatus {
  provider: string | null;
  configured: boolean;
  ready: boolean;
  error: string | null;
  apiKeyConfigured: boolean;
  baseUrl: string | null;
  modelsDiscovered: number;
  lastModelDiscovery: string | null;
}

interface AIProviderConfig {
  apiKey?: string;
  baseURL?: string;
  organization?: string;
  defaultHeaders?: Record<string, string>;
}

class AIProviderRegistry {
  private currentClient: AiClient | null = null;
  private currentProvider: string | null = null;
  private lastError: string | null = null;
  private discoveredModels: AiModel[] = [];
  private lastModelDiscovery: Date | null = null;
  private currentAuthToken: string | null = null;

  constructor() {
    console.log("🤖 AI Provider Registry initialized");
    this.initializeFromEnvironment();
  }

  private initializeFromEnvironment(): void {
    const provider = import.meta.env.VITE_AI_PROVIDER || "anaconda";

    console.log(`🔧 Initializing AI provider: ${provider}`);

    try {
      switch (provider.toLowerCase()) {
        case "anaconda":
          this.initializeAnaconda();
          break;
        case "openai":
          this.initializeOpenAI();
          break;
        case "groq":
          this.initializeGroq();
          break;
        case "ollama":
          this.initializeOllama();
          break;
        default:
          console.warn(
            `⚠️ Unknown AI provider: ${provider}, falling back to Anaconda`
          );
          this.initializeAnaconda();
          break;
      }
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to initialize AI provider ${provider}:`, error);
    }
  }

  private initializeAnaconda(): void {
    // Prefer auth token over environment variables
    const apiKey =
      this.currentAuthToken ||
      import.meta.env.VITE_ANACONDA_API_KEY ||
      import.meta.env.VITE_RUNT_API_KEY;

    if (!apiKey) {
      console.log(
        "💡 Anaconda AI not configured - need auth token or set VITE_ANACONDA_API_KEY for local development"
      );
      return;
    }

    try {
      // Register Anaconda client with the ai-core registry
      aiRegistry.register(
        "anaconda",
        () =>
          new AnacondaAIClient({
            apiKey,
            baseURL: "https://anaconda.com/api/assistant/v3/groq",
            defaultHeaders: {
              "X-Client-Version": "0.2.0",
              "X-Client-Source": "anaconda-runt-dev",
            },
          })
      );

      this.currentClient = aiRegistry.createClient("anaconda");
      this.currentProvider = "anaconda";

      console.log("✅ Anaconda AI client configured successfully");
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      console.error("❌ Failed to configure Anaconda AI client:", error);
    }
  }

  private initializeOpenAI(): void {
    // Prefer auth token over environment variables for OpenAI too
    const apiKey = this.currentAuthToken || import.meta.env.VITE_OPENAI_API_KEY;

    if (!apiKey) {
      console.log(
        "💡 OpenAI not configured - need auth token or set VITE_OPENAI_API_KEY for local development"
      );
      return;
    }

    try {
      // Register OpenAI client with the ai-core registry
      aiRegistry.register("openai", () => new OpenAIClient({ apiKey }));

      this.currentClient = aiRegistry.createClient("openai");
      this.currentProvider = "openai";

      console.log("✅ OpenAI client configured successfully");
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      console.error("❌ Failed to configure OpenAI client:", error);
    }
  }

  private initializeGroq(): void {
    // Prefer auth token over environment variables for Groq too
    const apiKey = this.currentAuthToken || import.meta.env.VITE_GROQ_API_KEY;

    if (!apiKey) {
      console.log(
        "💡 Groq not configured - need auth token or set VITE_GROQ_API_KEY for local development"
      );
      return;
    }

    try {
      // Register Groq client with the ai-core registry
      aiRegistry.register("groq", () => new GroqClient({ apiKey }));

      this.currentClient = aiRegistry.createClient("groq");
      this.currentProvider = "groq";

      console.log("✅ Groq client configured successfully");
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      console.error("❌ Failed to configure Groq client:", error);
    }
  }

  private initializeOllama(): void {
    try {
      // Ollama doesn't need an API key for local usage
      this.currentClient = aiRegistry.createClient("ollama");
      this.currentProvider = "ollama";

      console.log("✅ Ollama client configured successfully");
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      console.error("❌ Failed to configure Ollama client:", error);
    }
  }

  getProvider(): AiClient | null {
    return this.currentClient;
  }

  getStatus(): AIProviderStatus {
    const hasApiKey = this.currentProvider
      ? this.getApiKeyStatus(this.currentProvider)
      : false;

    return {
      provider: this.currentProvider,
      configured: !!this.currentClient,
      ready: !!this.currentClient,
      error: this.lastError,
      apiKeyConfigured: hasApiKey,
      baseUrl: this.getBaseUrl(),
      modelsDiscovered: this.discoveredModels.length,
      lastModelDiscovery: this.lastModelDiscovery?.toISOString() || null,
    };
  }

  private getApiKeyStatus(provider: string): boolean {
    switch (provider.toLowerCase()) {
      case "anaconda":
        return !!(
          import.meta.env.VITE_ANACONDA_API_KEY ||
          import.meta.env.VITE_RUNT_API_KEY
        );
      case "openai":
        return !!import.meta.env.VITE_OPENAI_API_KEY;
      case "groq":
        return !!import.meta.env.VITE_GROQ_API_KEY;
      case "ollama":
        return true; // Ollama doesn't need API keys for local usage
      default:
        return false;
    }
  }

  private getBaseUrl(): string | null {
    if (!this.currentClient) return null;

    // Try to extract baseURL from the client if it has one
    if ("defaultConfig" in this.currentClient) {
      const config = (this.currentClient as any).defaultConfig;
      return config?.baseURL || null;
    }

    return null;
  }

  async discoverModels(): Promise<AiModel[]> {
    if (!this.currentClient) {
      console.warn("⚠️ No AI client configured");
      return [];
    }

    try {
      console.log(`🔍 Discovering models for ${this.currentProvider}...`);
      this.discoveredModels = await this.currentClient.discoverAiModels();
      this.lastModelDiscovery = new Date();

      console.log(
        `✅ Discovered ${this.discoveredModels.length} models:`,
        this.discoveredModels.map((m) => m.name)
      );

      return this.discoveredModels;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      console.error("❌ Failed to discover models:", error);
      return [];
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.currentClient) {
      console.warn("⚠️ No AI client configured");
      return false;
    }

    try {
      console.log(`🧪 Testing connection to ${this.currentProvider}...`);

      const isReady = await this.currentClient.isReady();

      if (isReady) {
        console.log(`✅ Connection to ${this.currentProvider} successful`);
        // Also try to discover models to fully test the connection
        await this.discoverModels();
      } else {
        console.log(`❌ Connection to ${this.currentProvider} failed`);
        console.log("💡 Configuration help:");
        console.log(this.currentClient.getConfigMessage());
      }

      return isReady;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      console.error(
        `❌ Connection test failed for ${this.currentProvider}:`,
        error
      );
      return false;
    }
  }

  configure(provider: string, config: AIProviderConfig): void {
    try {
      console.log(`🔧 Manually configuring ${provider} provider...`);

      switch (provider.toLowerCase()) {
        case "anaconda":
          if (!config.apiKey) {
            throw new Error("API key required for Anaconda AI");
          }
          aiRegistry.register(
            "anaconda",
            () =>
              new AnacondaAIClient({
                apiKey: config.apiKey!,
                ...config,
              })
          );
          break;

        case "openai":
          if (!config.apiKey) {
            throw new Error("API key required for OpenAI");
          }
          aiRegistry.register(
            "openai",
            () =>
              new OpenAIClient({
                apiKey: config.apiKey!,
                ...config,
              })
          );
          break;

        case "groq":
          if (!config.apiKey) {
            throw new Error("API key required for Groq");
          }
          aiRegistry.register(
            "groq",
            () =>
              new GroqClient({
                apiKey: config.apiKey!,
                ...config,
              })
          );
          break;

        case "ollama":
          aiRegistry.register(
            "ollama",
            () => new RuntOllamaClient(config as any)
          );
          break;

        default:
          throw new Error(`Unknown provider: ${provider}`);
      }

      this.currentClient = aiRegistry.createClient(provider);
      this.currentProvider = provider;
      this.lastError = null;

      console.log(`✅ ${provider} provider configured successfully`);
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to configure ${provider} provider:`, error);
      throw error;
    }
  }

  getAvailableProviders(): string[] {
    return aiRegistry.getProviders();
  }

  setAuthContext(context: any): void {
    // Extract access token if auth is valid
    if (context?.authState?.valid) {
      this.updateAuthToken(context.authState.token);
    }
  }

  updateAuthToken(token: string): void {
    if (this.currentAuthToken !== token) {
      console.log("🔄 Updating AI provider with refreshed auth token");
      this.currentAuthToken = token;

      // Re-initialize the current provider with the new token
      if (this.currentProvider) {
        this.initializeFromEnvironment();
      }
    }
  }
}

// Create singleton instance and expose on window
const aiProvider = new AIProviderRegistry();

if (typeof window !== "undefined") {
  window.__RUNT_AI__ = {
    getProvider: () => aiProvider.getProvider(),
    getStatus: () => aiProvider.getStatus(),
    discoverModels: () => aiProvider.discoverModels(),
    testConnection: () => aiProvider.testConnection(),
    configure: (provider: string, config: AIProviderConfig) =>
      aiProvider.configure(provider, config),
    getAvailableProviders: () => aiProvider.getAvailableProviders(),
    updateAuthToken: (token: string) => aiProvider.updateAuthToken(token),
    setAuthContext: (context: any) => aiProvider.setAuthContext(context),
  };

  // Show usage help after a short delay to let other console messages settle
  setTimeout(() => {
    if (aiProvider.getProvider()) {
      console.log("🤖 AI Provider loaded successfully!");
      console.log("🧪 Try: await window.__RUNT_AI__.testConnection()");
    } else {
      console.log("🤖 AI Provider initialized (no provider configured)");
      console.log(
        "💡 Will use auth token when available, or set VITE_ANACONDA_API_KEY for local development"
      );
      console.log(
        "🔧 Example: window.__RUNT_AI__.configure('anaconda', { apiKey: 'your-key' })"
      );
    }
  }, 1000);

  // Set up auth token monitoring if we're in a React context
  if (typeof document !== "undefined") {
    // We'll set up the auth integration from a React component
    (globalThis as any).__AI_PROVIDER_INSTANCE__ = aiProvider;
  }
}

export { aiProvider };
export type { AIProviderStatus, AIProviderConfig };
