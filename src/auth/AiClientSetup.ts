/**
 * Early AI Client Setup
 *
 * Registers AI clients as soon as authentication is available, rather than
 * waiting for runtime startup. This reduces runtime startup delays and
 * ensures AI capabilities are ready immediately.
 */

import { aiRegistry, AnacondaAIClient } from "@runtimed/ai-core";

/**
 * Configuration for early AI client setup
 */
export interface EarlyAiSetupConfig {
  /** Access token for authentication (or RUNT_API_KEY if set) */
  accessToken: string;
  /** Whether to enable console logging (default: true) */
  enableLogging?: boolean;
}

/**
 * Status of AI client setup
 */
export interface AiSetupStatus {
  /** Whether AI clients have been set up */
  isSetup: boolean;
  /** Whether Anaconda provider was detected */
  hasAnaconda: boolean;
  /** Any error that occurred during setup */
  error: string | null;
  /** Timestamp of last setup attempt */
  lastSetupAttempt: number | null;
}

// Global state to track setup status
let aiSetupStatus: AiSetupStatus = {
  isSetup: false,
  hasAnaconda: false,
  error: null,
  lastSetupAttempt: null,
};

/**
 * Check if we're using the Anaconda provider
 */
function isUsingAnacondaProvider(): boolean {
  const authUri = import.meta.env.VITE_AUTH_URI;
  return authUri?.startsWith("https://auth.anaconda.com/") ?? false;
}

/**
 * Get the API key to use (RUNT_API_KEY env var or access token)
 */
function getApiKey(accessToken: string): string {
  // In browser environment, we can't access process.env.RUNT_API_KEY
  // Users should set this in their runtime environment for local development
  return accessToken;
}

/**
 * Setup Anaconda AI client if using Anaconda provider
 *
 * Uses access token for authentication. For local development,
 * users can set RUNT_API_KEY environment variable in their runtime.
 */
function setupAnacondaAI(
  accessToken: string,
  enableLogging: boolean = true
): void {
  if (!isUsingAnacondaProvider()) {
    return;
  }

  try {
    if (enableLogging) {
      console.log("🔑 Setting up Anaconda AI client...");
      console.log(
        "💡 Tip: Set RUNT_API_KEY environment variable for local development"
      );
    }

    const apiKey = getApiKey(accessToken);
    if (!apiKey?.trim()) {
      throw new Error("Invalid access token provided");
    }

    if (enableLogging) {
      console.log(
        "🔍 Debug: API key for Anaconda client:",
        apiKey ? `${apiKey.substring(0, 20)}...` : "null/undefined"
      );
    }

    // Register Anaconda AI client
    aiRegistry.register("anaconda", () => {
      if (enableLogging) {
        console.log(
          "🔍 Debug: Creating Anaconda client with API key:",
          apiKey ? `${apiKey.substring(0, 20)}...` : "null/undefined"
        );
      }
      return new AnacondaAIClient({
        apiKey,
        baseURL: "https://anaconda.com/api/assistant/v3/groq",
        defaultHeaders: {
          "X-Client-Version": "0.2.0",
          "X-Client-Source": "anaconda-runt-dev",
        },
      });
    });

    if (enableLogging) {
      console.log("✅ Anaconda AI client registered");
    }

    aiSetupStatus.hasAnaconda = true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (enableLogging) {
      console.error("❌ Failed to setup Anaconda AI client:", errorMsg);
    }
    aiSetupStatus.error = errorMsg;
    aiSetupStatus.hasAnaconda = false;
  }
}

/**
 * Setup AI clients early in the auth flow
 *
 * This should be called when authentication is available.
 * It registers AI clients immediately so they're available for all runtimes.
 *
 * For local development, users can set RUNT_API_KEY environment variable
 * in their runtime environment (not browser).
 */
export function setupEarlyAiClients(config: EarlyAiSetupConfig): void {
  const { accessToken, enableLogging = true } = config;

  // Reset status
  aiSetupStatus = {
    isSetup: false,
    hasAnaconda: false,
    error: null,
    lastSetupAttempt: Date.now(),
  };

  try {
    if (enableLogging) {
      console.log("🚀 Setting up AI clients during authentication...");
    }

    // Setup Anaconda AI if needed
    setupAnacondaAI(accessToken, enableLogging);

    aiSetupStatus.isSetup = true;

    if (enableLogging) {
      const providers = [];
      if (aiSetupStatus.hasAnaconda) providers.push("anaconda");
      providers.push("ollama"); // Always available

      console.log(
        `✅ AI clients ready: ${providers.join(", ")} (${providers.length} provider${providers.length === 1 ? "" : "s"})`
      );
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    aiSetupStatus.error = errorMsg;

    if (enableLogging) {
      console.error("❌ Failed to setup AI clients during auth:", error);
    }
  }
}

/**
 * Get the current AI setup status
 */
export function getAiSetupStatus(): AiSetupStatus {
  return { ...aiSetupStatus };
}

/**
 * Check if AI clients are already set up
 *
 * Runtime agents can use this to skip their own AI setup if it's already done.
 */
export function areAiClientsReady(): boolean {
  return aiSetupStatus.isSetup;
}

/**
 * Reset AI setup status (for testing or re-auth)
 */
export function resetAiSetup(): void {
  aiSetupStatus = {
    isSetup: false,
    hasAnaconda: false,
    error: null,
    lastSetupAttempt: null,
  };
}
