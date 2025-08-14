import { LocalApiKeyProvider } from "./local-api-key.ts";
import { AnacondaApiKeyProvider } from "./anaconda-api-key.ts";
import type { ApiKeyProvider } from "../api-key-provider.ts";
import { ApiKeyCapabilities } from "../api-key-provider.ts";
import { RuntError, ErrorType, type Env } from "../types.ts";

// Re-export providers and types for convenience
export { LocalApiKeyProvider } from "./local-api-key.ts";
export { AnacondaApiKeyProvider } from "./anaconda-api-key.ts";
export type { ApiKeyProvider } from "../api-key-provider.ts";

/**
 * Factory function to create the appropriate API key provider based on environment
 */
export function createApiKeyProvider(env: Env): ApiKeyProvider {
  const serviceProvider = env.SERVICE_PROVIDER?.toLowerCase();

  switch (serviceProvider) {
    case "anaconda":
      try {
        return new AnacondaApiKeyProvider(env);
      } catch (error) {
        throw new RuntError(ErrorType.ServerMisconfigured, {
          message: "Failed to initialize Anaconda API key provider",
          cause: error as Error,
        });
      }

    case "local":
    case undefined:
    case "":
      // Default to local for development
      try {
        return new LocalApiKeyProvider(env);
      } catch (error) {
        throw new RuntError(ErrorType.ServerMisconfigured, {
          message: "Failed to initialize local API key provider",
          cause: error as Error,
        });
      }

    default:
      console.warn(
        `Unknown SERVICE_PROVIDER: ${serviceProvider}, falling back to local`
      );
      try {
        return new LocalApiKeyProvider(env);
      } catch (error) {
        throw new RuntError(ErrorType.ServerMisconfigured, {
          message: "Failed to initialize fallback local API key provider",
          cause: error as Error,
        });
      }
  }
}

/**
 * Utility to check if we're using the Anaconda provider
 */
export function isUsingAnacondaProvider(env: Env): boolean {
  return env.SERVICE_PROVIDER?.toLowerCase() === "anaconda";
}

/**
 * Utility to check if we're using the local provider
 */
export function isUsingLocalProvider(env: Env): boolean {
  return !isUsingAnacondaProvider(env);
}

/**
 * Get provider name for logging/debugging
 */
export function getProviderName(env: Env): string {
  return isUsingAnacondaProvider(env) ? "anaconda" : "local";
}

/**
 * Validate provider configuration without creating provider instance
 */
export function validateProviderConfig(env: Env): {
  valid: boolean;
  provider: string;
  errors: string[];
} {
  const provider = getProviderName(env);
  const errors: string[] = [];

  if (provider === "anaconda") {
    if (!env.EXTENSION_CONFIG) {
      errors.push("EXTENSION_CONFIG is required for Anaconda provider");
    } else {
      try {
        const config = JSON.parse(env.EXTENSION_CONFIG);
        if (!config.apiKeyUrl) {
          errors.push("EXTENSION_CONFIG missing apiKeyUrl");
        }
        if (!config.userinfoUrl) {
          errors.push("EXTENSION_CONFIG missing userinfoUrl");
        }
      } catch {
        errors.push("EXTENSION_CONFIG is not valid JSON");
      }
    }
  } else {
    // Local provider validation
    if (!env.DB) {
      errors.push("DB binding is required for local provider");
    }
  }

  return {
    valid: errors.length === 0,
    provider,
    errors,
  };
}

/**
 * Initialize provider and handle any async setup
 */
export async function initializeApiKeyProvider(
  env: Env
): Promise<ApiKeyProvider> {
  const provider = createApiKeyProvider(env);

  // Perform any async initialization
  if (provider instanceof LocalApiKeyProvider) {
    await provider.ensureInitialized();
  }

  return provider;
}

/**
 * Get provider capabilities as a summary
 */
export function getProviderCapabilities(env: Env): {
  provider: string;
  capabilities: string[];
  hasRevoke: boolean;
  hasDelete: boolean;
  hasCreateWithResources: boolean;
  hasListPaginated: boolean;
} {
  const provider = createApiKeyProvider(env);
  const capabilities = Array.from(provider.capabilities);

  return {
    provider: getProviderName(env),
    capabilities,
    hasRevoke: capabilities.includes(ApiKeyCapabilities.Revoke),
    hasDelete: capabilities.includes(ApiKeyCapabilities.Delete),
    hasCreateWithResources: capabilities.includes(
      ApiKeyCapabilities.CreateWithResources
    ),
    hasListPaginated: capabilities.includes(
      ApiKeyCapabilities.ListKeysPaginated
    ),
  };
}
