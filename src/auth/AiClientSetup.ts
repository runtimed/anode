/**
 * Early AI Client Setup
 *
 * Registers AI clients as soon as authentication is available, rather than
 * waiting for runtime startup. This reduces runtime startup delays and
 * ensures AI capabilities are ready immediately.
 */

// AI client imports removed - environment detection only

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

/**
 * Registry of AI clients created during auth setup
 */
const registeredClients: Record<string, any> = {};

// Client caching removed - runtime agents handle client registration

// Global state to track setup status
let aiSetupStatus: AiSetupStatus = {
  isSetup: false,
  hasAnaconda: false,
  error: null,
  lastSetupAttempt: null,
};

/**
 * Check if we're using the Anaconda provider by checking hostname
 */
function isUsingAnacondaProvider(): boolean {
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";
  const authUri = import.meta.env.VITE_AUTH_URI;

  // Check if we're on a *.runt.run domain
  const isRuntDomain = hostname.endsWith(".runt.run");

  // Fallback to auth URI check for backwards compatibility
  const isAnacondaAuth =
    authUri?.startsWith("https://auth.anaconda.com/") ?? false;

  const result = isRuntDomain || isAnacondaAuth;

  console.log("🔍 Environment detection:", {
    hostname,
    authUri,
    isRuntDomain,
    isAnacondaAuth,
    result: result ? "Anaconda" : "Development",
  });

  return result;
}

/**
 * Setup environment flags for AI client detection
 */
function setupEnvironmentFlags(enableLogging: boolean = true): void {
  try {
    const isAnaconda = isUsingAnacondaProvider();

    if (isAnaconda) {
      aiSetupStatus.hasAnaconda = true;
      if (enableLogging) {
        console.log(
          "🏢 Detected Anaconda environment - will register Anaconda AI client"
        );
      }
    } else {
      aiSetupStatus.hasAnaconda = false;
      if (enableLogging) {
        console.log(
          "🔧 Detected development environment - will register Ollama client"
        );
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (enableLogging) {
      console.error("❌ Failed to detect environment:", errorMsg);
    }
    aiSetupStatus.error = errorMsg;
    aiSetupStatus.hasAnaconda = false;
  }
}

/**
 * Setup environment detection for AI clients
 *
 * This detects the deployment environment and sets up flags.
 * Actual AI client registration happens in the runtime agents.
 */
export function setupEarlyAiClients(config: EarlyAiSetupConfig): void {
  const { enableLogging = true } = config;

  // Guard: Skip if already set up (prevent excessive calls)
  if (aiSetupStatus.isSetup) {
    if (enableLogging) {
      console.log("🔗 Environment already detected, skipping...");
    }
    return;
  }

  // Reset status
  aiSetupStatus = {
    isSetup: false,
    hasAnaconda: false,
    error: null,
    lastSetupAttempt: Date.now(),
  };

  try {
    if (enableLogging) {
      console.log("🚀 Setting up AI environment detection...");
    }

    // Set up environment flags
    setupEnvironmentFlags(enableLogging);

    aiSetupStatus.isSetup = true;

    if (enableLogging) {
      const environment = aiSetupStatus.hasAnaconda
        ? "Anaconda"
        : "Development";
      console.log(`✅ Environment detected: ${environment}`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    aiSetupStatus.error = errorMsg;

    if (enableLogging) {
      console.error("❌ Failed to setup AI environment detection:", error);
    }
  }
}

/**
 * Get current AI setup status
 */
export function getAiSetupStatus(): AiSetupStatus {
  return { ...aiSetupStatus };
}

/**
 * Get registered AI clients
 */
export function getRegisteredClients() {
  return { ...registeredClients };
}

// getAnacondaClient removed - clients are managed by runtime agents

/**
 * Check if environment detection is complete
 *
 * This only checks if we've detected the environment, not if clients are registered.
 * Runtime agents handle actual client registration based on environment.
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

  // Clear client registries
  Object.keys(registeredClients).forEach(
    (key) => delete registeredClients[key]
  );

  // Note: aiRegistry doesn't have a clearClients method
  // Individual clients are cleared when registeredClients is cleared
}
