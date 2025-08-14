import { LocalApiKeyProvider } from "./local.ts";
import { AnacondaApiKeyProvider } from "./anaconda.ts";
import { type Env } from "../types.ts";

// Common API key validation result type
export type ApiKeyValidationResult =
  | {
      valid: true;
      userId: string;
      scopes: string[];
      keyId: string;
      email?: string;
      givenName?: string;
      familyName?: string;
    }
  | {
      valid: false;
      error: string;
    };

export type ApiKeyProvider = LocalApiKeyProvider | AnacondaApiKeyProvider;

/**
 * Factory function to create the appropriate API key provider based on environment
 */
export function createApiKeyProvider(env: Env): ApiKeyProvider {
  const serviceProvider = env.SERVICE_PROVIDER?.toLowerCase();

  switch (serviceProvider) {
    case "anaconda":
      return new AnacondaApiKeyProvider(env);

    case "local":
    case undefined:
    case "":
      // Default to local for development
      return new LocalApiKeyProvider();

    default:
      console.warn(
        `Unknown SERVICE_PROVIDER: ${serviceProvider}, falling back to local`
      );
      return new LocalApiKeyProvider();
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
