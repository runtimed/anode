import { LocalPermissionsProvider } from "./local-permissions.ts";
// import { AnacondaPermissionsProvider } from "./anaconda-permissions.ts"; // TODO: Implement
import type { PermissionsProvider } from "./types.ts";
import { RuntError, ErrorType, type Env } from "../types.ts";

// Re-export providers and types for convenience
export { LocalPermissionsProvider } from "./local-permissions.ts";
// export { AnacondaPermissionsProvider } from "./anaconda-permissions.ts"; // TODO: Implement
export type { PermissionsProvider } from "./types.ts";

/**
 * Factory function to create the appropriate permissions provider based on environment
 */
export function createPermissionsProvider(env: Env): PermissionsProvider {
  const serviceProvider = env.SERVICE_PROVIDER?.toLowerCase();

  switch (serviceProvider) {
    case "anaconda":
      // TODO: Implement AnacondaPermissionsProvider
      throw new RuntError(ErrorType.ServerMisconfigured, {
        message:
          "Anaconda permissions provider not yet implemented - use SpiceDB endpoints",
      });
    // try {
    //   return new AnacondaPermissionsProvider(env);
    // } catch (error) {
    //   throw new RuntError(ErrorType.ServerMisconfigured, {
    //     message: "Failed to initialize Anaconda permissions provider",
    //     cause: error as Error,
    //   });
    // }

    case "local":
    case undefined:
    case "":
      // Default to local for development
      try {
        return new LocalPermissionsProvider(env.DB);
      } catch (error) {
        throw new RuntError(ErrorType.ServerMisconfigured, {
          message: "Failed to initialize local permissions provider",
          cause: error as Error,
        });
      }

    default:
      console.warn(
        `Unknown SERVICE_PROVIDER: ${serviceProvider}, falling back to local`
      );
      try {
        return new LocalPermissionsProvider(env.DB);
      } catch (error) {
        throw new RuntError(ErrorType.ServerMisconfigured, {
          message: "Failed to initialize fallback local permissions provider",
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
export function validatePermissionsProviderConfig(env: Env): {
  valid: boolean;
  provider: string;
  errors: string[];
} {
  const provider = getProviderName(env);
  const errors: string[] = [];

  if (provider === "anaconda") {
    // TODO: Add anaconda-specific validation when implemented
    errors.push("Anaconda permissions provider not yet implemented");
  } else {
    // Local provider validation
    if (!env.DB) {
      errors.push("DB binding is required for local permissions provider");
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
export async function initializePermissionsProvider(
  env: Env
): Promise<PermissionsProvider> {
  const provider = createPermissionsProvider(env);

  // Perform any async initialization if needed
  // LocalPermissionsProvider doesn't need async init currently

  return provider;
}
