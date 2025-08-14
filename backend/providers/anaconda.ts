import * as jose from "jose";
import { type Env } from "../types.ts";
import type {
  ApiKeyProvider,
  ApiKeyValidationResult,
  UserInfo,
} from "./types.ts";

type AnacondaWhoamiResponse = {
  passport: {
    user_id: string;
    profile: {
      email: string;
      first_name: string;
      last_name: string;
      is_confirmed: boolean;
    };
    scopes: string[];
    source: string;
  };
};

type ExtensionConfig = {
  apiKeyUrl: string;
  userinfoUrl: string;
};

/**
 * Anaconda API key provider for production/preview environments
 */
export class AnacondaApiKeyProvider implements ApiKeyProvider {
  private config: ExtensionConfig;

  constructor(env: Env) {
    if (!env.EXTENSION_CONFIG) {
      throw new Error(
        "EXTENSION_CONFIG environment variable is required for Anaconda provider"
      );
    }

    try {
      this.config = JSON.parse(env.EXTENSION_CONFIG) as ExtensionConfig;
    } catch {
      throw new Error("Invalid EXTENSION_CONFIG JSON");
    }

    if (!this.config.apiKeyUrl || !this.config.userinfoUrl) {
      throw new Error(
        "EXTENSION_CONFIG missing required fields: apiKeyUrl, userinfoUrl"
      );
    }
  }

  /**
   * Check if a token appears to be an API key (vs OIDC token)
   */
  isApiKey(token: string): boolean {
    try {
      const unverified = jose.decodeJwt(token);
      return unverified.ver === "api:1";
    } catch {
      return false;
    }
  }

  /**
   * Validate an API key and return user information
   */
  async validateApiKey(token: string): Promise<ApiKeyValidationResult> {
    try {
      const response = await fetch(this.config.userinfoUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { valid: false, error: "Invalid or expired API key" };
        }
        if (response.status === 403) {
          return { valid: false, error: "Access denied" };
        }
        return { valid: false, error: "API key validation failed" };
      }

      const whoami: AnacondaWhoamiResponse = await response.json();

      if (whoami.passport.source !== "api_key") {
        return { valid: false, error: "Non-API key token used" };
      }

      // Convert Anaconda scopes to our format
      const scopes = this.convertAnacondaScopes(whoami.passport.scopes);

      // Extract key ID from JWT
      const unverified = jose.decodeJwt(token);
      const keyId = unverified.jti || unverified.sub || "unknown";

      return {
        valid: true,
        userId: whoami.passport.user_id,
        scopes,
        keyId: keyId as string,
        email: whoami.passport.profile.email,
        givenName: whoami.passport.profile.first_name,
        familyName: whoami.passport.profile.last_name,
      };
    } catch (err) {
      console.error("Anaconda API key validation error:", err);
      return { valid: false, error: "Failed to validate API key" };
    }
  }

  /**
   * Get user information for debug purposes
   */
  async getUserInfo(
    result: ApiKeyValidationResult & { valid: true }
  ): Promise<UserInfo> {
    return {
      id: result.userId,
      email: result.email || "unknown@anaconda.com",
      givenName: result.givenName || "Unknown",
      familyName: result.familyName || "User",
      scopes: result.scopes,
    };
  }

  /**
   * Convert Anaconda scopes to our internal scope format
   */
  private convertAnacondaScopes(scopes: string[]): string[] {
    const result: string[] = [];
    for (const scope of scopes) {
      if (scope === "cloud:read") {
        result.push("runtime:read");
      }
      if (scope === "cloud:write") {
        result.push("runtime:execute");
      }
    }
    return result;
  }
}
