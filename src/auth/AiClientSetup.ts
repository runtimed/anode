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
  /** User access token for authentication */
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
 * Get API key for AI usage (currently returns access token)
 */
async function getApiKeyForAI(accessToken: string): Promise<string | null> {
  try {
    // Validate the access token format
    if (!accessToken || accessToken.trim() === "") {
      throw new Error("Access token is empty or invalid");
    }

    // Basic JWT format validation for access tokens
    if (accessToken.includes(".") && accessToken.split(".").length === 3) {
      // Looks like a JWT token
      return accessToken;
    }

    // For now, we use the access token directly even if not JWT format
    // In the future, this could fetch a dedicated AI API key
    return accessToken;
  } catch (error) {
    console.error("Error validating API key for AI:", error);
    return null;
  }
}

/**
 * Setup Anaconda AI client if using Anaconda provider
 */
async function setupAnacondaAI(
  accessToken: string,
  enableLogging: boolean = true
): Promise<void> {
  if (!isUsingAnacondaProvider()) {
    return;
  }

  try {
    if (enableLogging) {
      console.log("🔑 Setting up Anaconda AI client during auth...");
    }

    const apiKey = await getApiKeyForAI(accessToken);

    if (!apiKey) {
      throw new Error("Failed to validate access token for AI usage");
    }

    // Validate configuration before registering
    const testConfig = {
      apiKey,
      baseURL: "https://anaconda.com/api/assistant/v3/groq",
      defaultHeaders: {
        "X-Client-Version": "0.2.0",
        "X-Client-Source": "anaconda-runt-dev",
      },
    };

    // Register with error handling wrapper
    aiRegistry.register("anaconda", () => {
      try {
        return new AnacondaAIClient(testConfig);
      } catch (clientError) {
        console.error("Failed to create Anaconda AI client:", clientError);
        throw clientError;
      }
    });

    if (enableLogging) {
      console.log("✅ Anaconda AI client registered during auth");
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
 * This should be called from the AuthProvider when authentication succeeds.
 * It registers AI clients immediately so they're available for all runtimes.
 */
export async function setupEarlyAiClients(
  config: EarlyAiSetupConfig
): Promise<void> {
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
    await setupAnacondaAI(accessToken, enableLogging);

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
